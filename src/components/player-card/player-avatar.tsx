"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const SIZE_CLASSES = {
  sm: "size-6 text-[10px]",
  default: "size-8 text-xs",
  lg: "size-16 text-base",
};

// Loads player photos through Next's image optimizer (a server-side fetch)
// instead of a plain <img src>: several source CDNs (notably
// media.api-sports.io) block hotlinked <img> requests initiated straight
// from the browser, which silently fails and falls back to initials even
// though the URL is valid.
export function PlayerAvatar({
  src,
  name,
  size = "default",
  className,
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={cn(
        "ring-border bg-muted relative shrink-0 overflow-hidden rounded-full ring-1",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Initials render underneath unconditionally, not just as an
          on-error fallback: a slow/hanging image load (e.g. a source CDN
          that's unreachable rather than promptly 404ing) would otherwise
          leave a blank circle for however long that takes to resolve. */}
      <div className="text-muted-foreground flex size-full items-center justify-center font-medium">
        {initials(name)}
      </div>
      {src && !errored && (
        <Image
          src={src}
          alt={name}
          fill
          sizes="64px"
          className="absolute inset-0 object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
