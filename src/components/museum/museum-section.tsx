import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

/** Etapa 10.6 — wrapper de seção reaproveitado por toda página do Museu (título + ícone + "ver tudo" opcional + conteúdo), evita repetir o mesmo cabeçalho em cada página. */
export function MuseumSection({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        {href && (
          <Link href={href} className="text-primary flex items-center gap-1 text-sm hover:underline">
            Ver tudo
            <ChevronRightIcon className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
