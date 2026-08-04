"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import {
  BoldIcon,
  ItalicIcon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * §29-§34: long-form, narrative "resumo da temporada" with inline images —
 * deliberately minimal (bold/italic/headings/lists/images, §33's own "não
 * precisa implementar recursos desnecessários"). Content is stored as HTML
 * in the same CareerStint.summary column the plain textarea used to write
 * to — no schema change, just a richer format for the same field. Images
 * upload through the existing /api/upload (Vercel Blob, etapa 6) and get
 * inserted as normal <img> nodes in that HTML, so nothing new to store or
 * clean up separately from the summary itself.
 */
export function RichTextEditor({
  content,
  onChange,
  onBlur,
  placeholder = "Escreva a história desta temporada...",
  className,
}: {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-64 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
  });

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/upload", { method: "POST", body: formData })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => editor.chain().focus().setImage({ src: data.url }).run())
      .catch(() => toast.error("Não foi possível enviar a imagem."));
  }

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Negrito"
        >
          <BoldIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Itálico"
        >
          <ItalicIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Título"
        >
          <Heading2Icon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Subtítulo"
        >
          <Heading3Icon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Lista"
        >
          <ListIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Lista numerada"
        >
          <ListOrderedIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageButtonClick} aria-label="Inserir imagem">
          <ImageIcon className="size-3.5" />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </div>

      <div
        className="rounded-lg border px-3 py-2 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "hover:bg-accent hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditorSkeleton() {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-lg border">
      <Loader2 className="text-muted-foreground size-5 animate-spin" />
    </div>
  );
}
