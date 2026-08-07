import Image from "next/image";
import { findCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Bandeira de verdade (imagem), não emoji — regional-indicator flag emoji
 * (🇧🇷 etc.) não renderiza como bandeira colorida no Windows sem a fonte
 * certa; sem ela, o Chrome mostra só as duas letras do código do país
 * (ex: "BR") como texto puro, sem nenhum estilo — foi exatamente esse
 * sintoma que motivou a troca. flagcdn.com serve o SVG a partir do próprio
 * iso2 que já temos em lib/countries.ts, sem precisar converter pra
 * codepoint de emoji nem manter nenhum asset local. `unoptimized` porque é
 * uma URL externa (mesma convenção já usada pra escudo/logo em todo o
 * projeto — não precisa mexer em next.config.ts pra liberar o host).
 */
export function CountryFlag({
  nationality,
  className,
}: {
  nationality?: string | null;
  className?: string;
}) {
  const country = findCountry(nationality);
  if (!country) return null;

  return (
    <Image
      src={`https://flagcdn.com/${country.iso2.toLowerCase()}.svg`}
      alt={country.label}
      width={16}
      height={12}
      unoptimized
      className={cn("inline-block h-3 w-4 shrink-0 rounded-[2px] object-cover", className)}
    />
  );
}
