"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * A URL text input plus an "upload from computer" button — picking a file
 * POSTs it to /api/upload (Vercel Blob) and fills the URL field with the
 * result. The field still just stores/displays a URL either way, so every
 * downstream consumer (ClubBadge, PlayerAvatar, CachedPlayer.photoUrl,
 * Squad.logoUrl, ...) needed zero changes — a user can keep pasting a URL
 * directly if they'd rather.
 */
export function ImageUrlInput({
  id,
  value,
  onChange,
  placeholder = "https://...",
}: {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again later
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/upload", { method: "POST", body: formData })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => onChange(data.url))
      .catch(() => toast.error("Não foi possível enviar a imagem."))
      .finally(() => setUploading(false));
  }

  return (
    <div className="flex gap-1.5">
      <Input
        id={id}
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Enviar imagem do computador"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
      </Button>
    </div>
  );
}
