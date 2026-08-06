"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/**
 * Etapa 9 parte 4 (§2/§3) — substitui `<input type="number">` nos campos
 * "estatística" do app (jogos/gols/assistências, vitórias/empates/
 * derrotas, número da camisa): começa vazio quando `value` é `null` (nunca
 * um "0" que faz "10" virar "100" ao digitar por cima), sem as setinhas
 * nativas de incremento/decremento, e com ↑/↓ do teclado incrementando/
 * decrementando em 1 (a partir de vazio, ↑ começa em 1 — nunca negativo).
 * Sempre um número inteiro — nenhum dos campos que usam isto (jogos, gols,
 * assistências, V/E/D, camisa) tem sentido fracionário.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max,
  className,
  ...props
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
} & Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange" | "min" | "max">) {
  function commit(next: number | null) {
    if (next !== null) {
      next = Math.trunc(next);
      if (next < min) next = min;
      if (max !== undefined && next > max) next = max;
    }
    onChange(next);
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/[^\d-]/g, "");
    if (digits === "" || digits === "-") {
      onChange(null);
      return;
    }
    const parsed = Number(digits);
    if (Number.isNaN(parsed)) return;
    commit(parsed);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commit(value === null ? 1 : value + 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      commit(value === null ? min : value - 1);
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={(e) => e.currentTarget.select()}
      className={cn(
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
}
