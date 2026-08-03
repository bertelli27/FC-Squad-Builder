# FC Squad Builder — Especificação Técnica

Projeto pessoal para montar elencos personalizados de futebol (clubes, seleções, "times dos sonhos") usando dados reais de EA Sports FC como base de ratings, complementados por uma API de futebol para clubes, seleções e fotos.

## 1. Objetivo

Permitir criar quantos elencos quiser (ex: "Coritiba", "Liverpool", "Brasil", "Barcelona 2011", "Time dos Sonhos"), carregando o elenco base automaticamente a partir de um clube/seleção real, e depois customizar livremente: jogadores, formação, numeração, capitão, titulares/reservas — sem nunca alterar os dados originais das APIs.

## 2. Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL (rodando local via Docker)
- dnd-kit (drag-and-drop para montagem tática do elenco)

## 3. Fontes de dados

### 3.1 Fonte principal — Dataset estático Kaggle (ratings de EA Sports FC)

**SoFIFA foi descartado como fonte.** O `robots.txt` do site bloqueia explicitamente bots de IA (inclusive `ClaudeBot`), e o `robots.txt` do site oficial `ea.com` vai além, proibindo por escrito qualquer scraping/uso programático de conteúdo para fins de IA. Ambos tornam inviável construir um provider que faça scraping ao vivo dessas fontes.

Decisão: usar um **dataset estático baixado do Kaggle** ("EA Sports FC 26 Player Ratings", `justdhia/ea-sports-fc-26-player-ratings`) como fonte de ratings/atributos. O CSV (`data/ea_fc26_players.csv`, ~16.200 jogadores) é baixado manualmente pelo usuário (requer conta Kaggle) e nunca commitado no repositório (`/data` está no `.gitignore`) — uso estritamente pessoal, sem redistribuição.

Diferente de um provider "live", essa fonte é importada em lote para o cache via script (`npm run import:ratings` → `scripts/import-ratings.ts`), que lê o CSV e faz upsert em `CachedPlayer` com `source = "kaggle-fc26"`. Atualizar os ratings (nova versão do jogo, nova temporada) significa baixar um CSV novo e rodar o script de novo — não há chamada de rede em tempo de request para essa fonte.

Limitação conhecida: o dataset não inclui `potential` (rating de potencial, conceito de career mode) nem foto do jogador — esses campos ficam `undefined` nessa fonte e dependem do fallback de outras fontes (seção 3.4).

Mitigações mantidas do desenho original:
- Isolar 100% do parsing dentro de `kaggle-ratings.normalizer.ts` / `kaggle-ratings.provider.ts` — nenhuma outra parte do código conhece o formato do CSV.
- Tratar falhas de parsing de forma graciosa (nunca quebrar a aplicação).
- Uso estritamente pessoal, sem redistribuição dos dados.

### 3.2 Fonte secundária — API-Football (API-Sports)

Cobertura ampla (1.236+ ligas, seleções, clubes, fotos de jogador, escudos). Free tier: **100 requests/dia**. Suficiente para uso pessoal dado o cache agressivo. Usada para: dados de clube, seleção, e para completar/substituir foto e metadados quando o dataset Kaggle não tiver.

### 3.3 Fonte terciária (fallback) — TheSportsDB

Free tier generoso, base crowd-sourced, forte em logos/badges/fotos de jogador e bandeiras de seleção. Usada como **último fallback** quando API-Football não tem o dado (principalmente fotos e escudos).

### 3.4 Ordem de resolução por tipo de dado

| Dado | 1ª fonte | 2ª fonte | 3ª fonte |
|---|---|---|---|
| Ratings/atributos (overall, skills) | Dataset Kaggle | — | — |
| Potential | — (não disponível em nenhuma fonte atual) | — | — |
| Nome, posição, idade, nacionalidade | Dataset Kaggle | API-Football | TheSportsDB |
| Foto do jogador | API-Football | TheSportsDB | — |
| Dados de clube (nome, liga, país) | API-Football | Dataset Kaggle | TheSportsDB |
| Escudo do clube | API-Football | TheSportsDB | — |
| Dados de seleção | API-Football | TheSportsDB | — |
| Bandeira da seleção | API-Football | TheSportsDB | — |

## 4. Arquitetura

Padrão **Provider Pattern** com fachada de serviço e cache-first (read-through):

```
UI (App Router) 
   │
   ▼
SquadService (regras de negócio: capitão, numeração, formação)
   │
   ▼
PlayerDataService / ClubDataService (fachada)
   │
   ▼
CacheRepository (Prisma) ──► PostgreSQL
   │  (cache miss ou expirado)
   ▼
ProviderRegistry
   │
   ├─► KaggleRatingsProvider   (implementa PlayerProvider; lê dataset estático, sem rede)
   ├─► ApiFootballProvider     (implementa PlayerProvider / ClubProvider / NationalTeamProvider)
   └─► TheSportsDbProvider     (implementa PlayerProvider / ClubProvider / NationalTeamProvider, fallback)
```

Cada Provider implementa uma interface comum e devolve um **DTO normalizado interno** (`Player`, `Club`, `NationalTeam`) via um normalizer próprio. O resto da aplicação nunca sabe de qual API o dado veio. Adicionar uma nova fonte no futuro = nova classe implementando a interface + registro no `ProviderRegistry`, sem tocar em mais nada.

### Contrato das interfaces (referência para implementação)

```typescript
// types/domain.ts
export interface Player {
  id: string;            // id interno (do cache)
  source: string;
  externalId: string;
  name: string;
  photoUrl?: string;
  nationality?: string;
  position?: string;
  club?: string;
  league?: string;
  overall?: number;
  potential?: number;
  age?: number;
  attributes?: Record<string, number>; // crossing, dribbling, etc.
}

export interface Club {
  id: string;
  source: string;
  externalId: string;
  name: string;
  league?: string;
  country?: string;
  logoUrl?: string;
}

export interface NationalTeam {
  id: string;
  source: string;
  externalId: string;
  name: string;
  flagUrl?: string;
}

// services/providers/provider.interface.ts
export interface PlayerProvider {
  searchPlayers(query: PlayerSearchFilters): Promise<Player[]>;
  fetchPlayer(externalId: string): Promise<Player | null>;
}

export interface ClubProvider {
  searchClubs(query: string): Promise<Club[]>;
  fetchClub(externalId: string): Promise<Club | null>;
  fetchClubSquad(externalId: string): Promise<Player[]>;
}

export interface NationalTeamProvider {
  searchNationalTeams(query: string): Promise<NationalTeam[]>;
  fetchNationalTeamSquad(externalId: string): Promise<Player[]>;
}

export interface PlayerSearchFilters {
  name?: string;
  position?: string;
  nationality?: string;
  club?: string;
  league?: string;
  minOverall?: number;
  maxOverall?: number;
  minPotential?: number;
  maxPotential?: number;
  minAge?: number;
  maxAge?: number;
}
```

## 5. Banco de dados (Prisma / PostgreSQL local via Docker)

Separação estrita entre **cache das APIs** (nunca alterado pelo usuário) e **customizações do usuário**.

```prisma
// ── CACHE (somente leitura, espelha as APIs) ──────────────

model CachedPlayer {
  id          String   @id @default(cuid())
  source      String   // "sofifa" | "api-football" | "thesportsdb"
  externalId  String
  name        String
  photoUrl    String?
  nationality String?
  position    String?
  club        String?
  league      String?
  overall     Int?
  potential   Int?
  age         Int?
  rawData     Json     // payload bruto, para reprocessar sem rechamar a API
  fetchedAt   DateTime @default(now())
  expiresAt   DateTime

  squadPlayers SquadPlayer[]

  @@unique([source, externalId])
  @@index([name])
  @@index([club])
  @@index([league])
}

model CachedClub {
  id         String   @id @default(cuid())
  source     String
  externalId String
  name       String
  league     String?
  country    String?
  logoUrl    String?
  rawData    Json
  fetchedAt  DateTime @default(now())
  expiresAt  DateTime

  @@unique([source, externalId])
}

model CachedNationalTeam {
  id         String   @id @default(cuid())
  source     String
  externalId String
  name       String
  flagUrl    String?
  rawData    Json
  fetchedAt  DateTime @default(now())
  expiresAt  DateTime

  @@unique([source, externalId])
}

// ── DADOS DO USUÁRIO (customizações) ──────────────────────

model Squad {
  id          String        @id @default(cuid())
  name        String        // "Coritiba", "Barcelona 2011", "Time dos Sonhos"
  baseClubRef String?       // externalId do CachedClub/CachedNationalTeam de origem
  formation   String        @default("4-3-3")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  players     SquadPlayer[]
}

model SquadPlayer {
  id             String       @id @default(cuid())
  squadId        String
  squad          Squad        @relation(fields: [squadId], references: [id], onDelete: Cascade)
  cachedPlayerId String
  cachedPlayer   CachedPlayer @relation(fields: [cachedPlayerId], references: [id])
  shirtNumber    Int?
  isCaptain      Boolean      @default(false)
  isStarter      Boolean      @default(true)  // false = banco de reservas
  positionSlot   String?      // posição na formação, ex: "LW", "CB1"
  order          Int          @default(0)

  @@unique([squadId, cachedPlayerId])
}
```

A tela inicial lista apenas registros de `Squad` — nunca o cache bruto — atendendo ao requisito de "ver só os elencos que eu criei ou modifiquei".

### `docker-compose.yml` (Postgres local)

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: fcsquad
      POSTGRES_PASSWORD: fcsquad
      POSTGRES_DB: fc_squad_builder
    ports:
      - "5432:5432"
    volumes:
      - fc_squad_pgdata:/var/lib/postgresql/data

volumes:
  fc_squad_pgdata:
```

`.env`:
```
DATABASE_URL="postgresql://fcsquad:fcsquad@localhost:5432/fc_squad_builder"
API_FOOTBALL_KEY=""
THESPORTSDB_KEY=""
```

## 6. Estrutura de pastas

```
fc-squad-builder/
├── docker-compose.yml
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                 # lista dos meus elencos
│   │   │   └── squads/
│   │   │       ├── new/page.tsx         # criar elenco (escolher clube/seleção)
│   │   │       └── [id]/page.tsx        # editor de elenco (drag-and-drop, formação)
│   │   ├── api/
│   │   │   ├── players/search/route.ts
│   │   │   ├── clubs/search/route.ts
│   │   │   ├── national-teams/search/route.ts
│   │   │   └── squads/[id]/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                          # shadcn/ui
│   │   ├── squad-builder/               # campo tático, formação, dnd-kit
│   │   ├── player-card/                 # estilo cartão EA FC
│   │   └── filters/                     # filtros de busca de jogadores
│   ├── services/
│   │   ├── providers/
│   │   │   ├── provider.interface.ts
│   │   │   ├── kaggle-ratings.provider.ts   # lê data/*.csv, sem rede
│   │   │   ├── api-football.provider.ts
│   │   │   └── thesportsdb.provider.ts
│   │   ├── provider-registry.ts         # ordem de resolução/fallback (ver seção 3.4)
│   │   ├── player-data.service.ts       # fachada cache-first
│   │   ├── club-data.service.ts
│   │   ├── national-team-data.service.ts
│   │   └── squad.service.ts             # regras de negócio (capitão, numeração, titulares)
│   ├── repositories/
│   │   └── cache.repository.ts          # leitura/escrita no Prisma, checagem de expiresAt
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── normalizers/
│   │       ├── kaggle-ratings.normalizer.ts
│   │       ├── api-football.normalizer.ts
│   │       └── thesportsdb.normalizer.ts
│   └── types/
│       └── domain.ts
├── scripts/
│   └── import-ratings.ts                # `npm run import:ratings` — importa data/*.csv pro CachedPlayer
├── data/                                 # CSV baixado do Kaggle (gitignored, nunca commitado)
└── .env
```

## 7. Fluxo de cache (read-through)

1. Requisição chega no serviço de fachada (ex: `ClubDataService.fetchClubSquad(clubId)`).
2. Consulta `CacheRepository`: existe registro com `expiresAt > now()`? Se sim, retorna direto do Postgres.
3. Se não (miss ou expirado), o `ProviderRegistry` consulta as fontes na ordem definida na seção 3.4, mesclando os campos que faltarem.
4. Cada resposta é normalizada para o DTO interno via `normalizers/`.
5. Resultado mesclado é persistido em `CachedPlayer`/`CachedClub`/`CachedNationalTeam` com `rawData` (payload bruto de cada fonte, para reprocessar sem nova chamada) e um `expiresAt` (sugestão: 30 dias — ratings de FC mudam pouco).
6. Retorna o DTO normalizado ao chamador.

Garantia central do projeto: **o cache de clube/seleção é só um espelho local, nunca é editado pelo usuário.** Toda customização de escalação (numeração, capitão, banco, formação, escolha de jogadores) vive exclusivamente em `Squad`/`SquadPlayer`, que referenciam o cache por `cachedPlayerId` sem alterá-lo.

**Exceção deliberada (etapa 6): o cadastro do jogador em si (`CachedPlayer`) é editável**, independentemente da origem (kaggle/api-football/thesportsdb/custom) — nome, foto, data de nascimento, nacionalidade, posição principal/secundárias, overall, potencial. A edição é feita via `PATCH /api/players/[id]` (`playerDataService.updatePlayer`), que marca a linha com `manuallyEdited: true`. Como um `CachedPlayer` é compartilhado por toda referência ao mesmo jogador (squads, carreira), editar reflete em todo lugar — essa é a ideia: é a mesma pessoa (ver seção "Regra fundamental" do jogador como entidade central). `manuallyEdited` existe para proteger essas edições de serem sobrescritas silenciosamente por um refresh futuro do cache (re-fetch de provider, ou `npm run import:ratings` reimportando uma nova versão do CSV do Kaggle) — tanto `cachePlayer()` (player-data.service.ts) quanto `scripts/import-ratings.ts` pulam os campos cadastrais de uma linha já marcada como editada manualmente.

## 8. Funcionalidades — checklist

- [ ] Buscar jogadores com filtros: nome, posição, nacionalidade, clube, liga, overall, potencial, idade
- [ ] Buscar clubes
- [ ] Buscar seleções
- [ ] Exibir fotos de jogadores (com fallback entre fontes)
- [ ] Perfil completo do jogador (atributos detalhados)
- [ ] Criar elenco a partir de um clube ou seleção (carga automática)
- [ ] Editor de elenco: adicionar/remover jogadores, trocar formação, numeração, definir capitão, banco de reservas
- [ ] Drag-and-drop no campo tático (dnd-kit)
- [ ] Salvar elenco
- [ ] Tela inicial listando apenas elencos criados/modificados pelo usuário
- [ ] Visual inspirado em EA Sports FC / SoFIFA / Football Manager

## 9. Roadmap sugerido de implementação

1. Setup do projeto (Next.js + TS + Tailwind + shadcn/ui) e Postgres
2. `schema.prisma` + migração inicial
3. Camada de tipos (`types/domain.ts`) e interfaces de provider
4. `KaggleRatingsProvider` isolado + normalizer + `scripts/import-ratings.ts` (concluído — ver seção 3.1)
5. `ApiFootballProvider` + `TheSportsDbProvider` + normalizers
6. `ProviderRegistry` com a lógica de fallback da seção 3.4
7. `CacheRepository` + lógica de expiração
8. Fachadas (`PlayerDataService`, `ClubDataService`, `NationalTeamDataService`)
9. Rotas de API (`/api/players/search`, `/api/clubs/search`, etc.)
10. Tela inicial (lista de elencos) + criação de elenco (seleção de clube/seleção)
11. Editor de elenco: campo tático com dnd-kit, numeração, capitão, banco
12. Perfil completo do jogador (modal/página)
13. Polimento visual (estilo EA FC / SoFIFA / Football Manager)
