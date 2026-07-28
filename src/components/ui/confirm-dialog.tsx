"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * In-app replacement for window.confirm(): same call-and-await shape, but
 * renders as a themed Dialog instead of the browser's native confirm box
 * (which shows its own chrome/branding around the page's origin, clashing
 * with the app's own look).
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "Cancelar"}
          </Button>
          <Button variant={options?.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
            {options?.confirmLabel ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
