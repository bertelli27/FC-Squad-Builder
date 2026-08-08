import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Etapa 10.5 — extraído de management/page.tsx (onde era privado,
 * "ManagementCard") pra ser reaproveitado também pelo Centro de
 * Estatísticas — mesmo card, mesmo contrato visual, sem duplicar.
 */
export function DashboardCard({
  href,
  icon,
  title,
  description,
  count,
  actionLabel,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: string;
  actionLabel: string;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <span className="text-muted-foreground text-sm">{count}</span>
      </CardContent>
      <CardFooter className="border-t py-3 [.border-t]:pt-3">
        <Button
          render={
            <Link href={href}>
              {actionLabel}
              <ChevronRightIcon className="size-4" />
            </Link>
          }
          nativeButton={false}
          variant="outline"
          className="w-full justify-between"
        />
      </CardFooter>
    </Card>
  );
}
