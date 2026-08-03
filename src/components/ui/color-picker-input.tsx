"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isValidHexColor } from "@/lib/club-color";
import { cn } from "@/lib/utils";

const FALLBACK_SWATCH = "#16a34a";

/**
 * Native `<input type="color">` swatch + a free-typed hex field kept in
 * sync — the swatch alone can't represent "no color set" (§12: null means
 * "use the app's default theme"), so the text field is the actual source
 * of truth and the swatch just mirrors it when it happens to be valid.
 */
export function ColorPickerInput({
  id,
  value,
  onChange,
  placeholder = "#006B3F",
}: {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  placeholder?: string;
}) {
  const isValid = value.trim() === "" || isValidHexColor(value);

  return (
    <div className="flex gap-1.5">
      <input
        type="color"
        aria-label="Escolher cor"
        value={isValidHexColor(value) ? value : FALLBACK_SWATCH}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border p-1"
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={7}
        autoComplete="off"
        className={cn("flex-1 font-mono uppercase", !isValid && "border-destructive")}
      />
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>
          Padrão
        </Button>
      )}
    </div>
  );
}
