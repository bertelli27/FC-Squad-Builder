"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Etapa 9 (§33/35) — organizador internacional (FIFA/UEFA/CONMEBOL...):
 * texto livre com sugestões dos valores já cadastrados, via <datalist> nativo
 * (sem precisar de um componente de combobox novo pra isso). Não é uma
 * entidade própria — ver comentário no schema sobre Competition.organizer.
 */
export function OrganizerInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/competitions/organizers")
      .then((res) => (res.ok ? res.json() : { organizers: [] }))
      .then((data) => setSuggestions(data.organizers ?? []))
      .catch(() => {});
  }, []);

  return (
    <>
      <Input
        id={id}
        list={`${id}-suggestions`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: FIFA, UEFA, CONMEBOL..."
        autoComplete="off"
      />
      <datalist id={`${id}-suggestions`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
