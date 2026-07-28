"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = { sm: "size-5", default: "size-8", lg: "size-12" };
const ICON_SIZE_CLASSES = { sm: "size-3", default: "size-4", lg: "size-6" };

// Same rationale as PlayerAvatar: routes club/national-team crests through
// Next's image optimizer instead of a plain <img>, since some source CDNs
// block hotlinked browser-side requests.
export function ClubBadge({
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
        "text-muted-foreground relative flex shrink-0 items-center justify-center",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Same rationale as PlayerAvatar: icon renders unconditionally
          underneath so a slow/hanging load never leaves an empty gap. */}
      <ShieldIcon className={ICON_SIZE_CLASSES[size]} />
      {src && !errored && (
        <Image
          src={src}
          alt={name}
          fill
          sizes="48px"
          className="absolute inset-0 object-contain"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
