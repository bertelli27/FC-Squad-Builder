"use client";

import * as React from "react";
import { useState } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Etapa 9 parte 4 (§6) — campo de valor monetário (transferências): exibe
 * "R$ 10.000.000,00" (padrão brasileiro) quando não está em foco, e o
 * número puro editável ("10000000") enquanto o usuário digita — evita
 * qualquer problema de posição de cursor/máscara-de-centavos ao formatar
 * em tempo real. `value`/`onChange` continuam um `number | null` puro (a
 * mesma unidade já salva no banco via Transfer.value/CareerTransfer.value)
 * — a formatação é só a camada de apresentação/entrada, nunca o dado
 * armazenado.
 */
export function CurrencyInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: number | null;
  onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange">) {
  const [focused, setFocused] = useState(false);

  const displayValue = focused ? (value ?? "") : value != null ? formatBRL(value) : "";

  function handleChange(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    onChange(digits === "" ? null : Number(digits));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={props.placeholder ?? "R$ 0,00"}
      className={cn(className)}
      {...props}
    />
  );
}
