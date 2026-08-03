const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX_RE.exec(hex.trim());
  const int = parseInt(match![1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255];
}

/**
 * Clamps lightness (and floors saturation) so a club's chosen color stays
 * legible as a UI accent — buttons, rings, active-tab underlines — in the
 * given theme mode, without changing its hue identity (§12.7: "o sistema
 * deve adaptar essa cor para manter contraste e acessibilidade"). Dark mode
 * gets a brighter floor since it needs to stand out against a near-black
 * background instead of white.
 */
export function adaptClubColor(hex: string, mode: "light" | "dark"): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [min, max] = mode === "dark" ? [0.55, 0.78] : [0.3, 0.55];
  const clampedL = Math.min(max, Math.max(min, l));
  const clampedS = Math.max(s, 0.35);
  const [nr, ng, nb] = hslToRgb(h, clampedS, clampedL);
  return rgbToHex(nr, ng, nb);
}

/** Black or near-white text, whichever contrasts better against `hex` (WCAG relative luminance). */
export function foregroundFor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? "#0a0a0a" : "#fafafa";
}

/**
 * CSS for a <style> tag that overrides the theme's primary/ring tokens for
 * one scoped className, in both light and dark mode — how every
 * club-scoped page (visão geral, temporada, editor de elenco) applies that
 * club's identity color without touching the app's global theme (§12.8).
 * Works because globals.css declares `--color-primary: var(--primary)`
 * (Tailwind's `@theme inline`) — that indirection is what lets overriding
 * `--primary` on a wrapper div retarget every `text-primary`/`bg-primary`/
 * `ring-primary`/etc. utility used by its descendants, without redeclaring
 * `--color-primary` itself. Only `--accent`/`--secondary` are left alone,
 * so hover/muted surfaces stay neutral instead of tinting everything.
 */
export function buildClubThemeCss(scopeClass: string, hex: string): string {
  const light = adaptClubColor(hex, "light");
  const dark = adaptClubColor(hex, "dark");
  const lightFg = foregroundFor(light);
  const darkFg = foregroundFor(dark);
  const vars = (color: string, fg: string) => `
    --primary: ${color};
    --primary-foreground: ${fg};
    --ring: ${color};
    --sidebar-primary: ${color};
    --sidebar-primary-foreground: ${fg};
    --sidebar-ring: ${color};
  `;
  return `.${scopeClass} {${vars(light, lightFg)}} .dark .${scopeClass} {${vars(dark, darkFg)}}`;
}
