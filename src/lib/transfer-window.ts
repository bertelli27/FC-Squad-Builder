export type TransferWindow = "start" | "mid";

/** Compartilhado entre o form de contratar, o de transferir e o de editar transferência. */
export const TRANSFER_WINDOWS: { value: TransferWindow; label: string }[] = [
  { value: "start", label: "Início da temporada" },
  { value: "mid", label: "Meio da temporada" },
];

export const TRANSFER_WINDOW_LABEL: Record<string, string> = {
  start: "Início da temporada",
  mid: "Meio da temporada",
};
