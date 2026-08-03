import { buildClubThemeCss } from "@/lib/club-color";
import { cn } from "@/lib/utils";

/**
 * Wraps every club-scoped page (visão geral, temporada, editor de elenco)
 * so that club's primaryColor (§12) retargets the theme's primary/ring
 * tokens for everything inside — see lib/club-color.ts for why overriding
 * `--primary` on this wrapper is enough to affect every `text-primary`/
 * `bg-primary`/etc. utility used by descendants. A club without a color
 * renders as a plain wrapper — no override, no `<style>` tag, falls back
 * to the app's default green theme untouched (§12.8).
 */
export function ClubThemeScope({
  clubId,
  primaryColor,
  className,
  children,
}: {
  clubId: string;
  primaryColor?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!primaryColor) return <div className={className}>{children}</div>;

  const scopeClass = `club-theme-${clubId}`;
  return (
    <div className={cn(scopeClass, className)}>
      <style>{buildClubThemeCss(scopeClass, primaryColor)}</style>
      {children}
    </div>
  );
}
