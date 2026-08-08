import Link from "next/link";
import { ShieldHalfIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MainNav } from "@/components/main-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="text-primary flex items-center gap-2">
            <ShieldHalfIcon className="size-6" strokeWidth={2.25} />
            <span className="font-heading text-lg font-semibold tracking-tight">
              FC Squad Builder
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <MainNav />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}
