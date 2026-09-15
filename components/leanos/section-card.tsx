import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCard({ title, description, action, children, className = "" }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden border-[#dce7e4] bg-white shadow-[0_1px_2px_rgba(8,47,45,.04)] ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#e7eeec] px-5 py-4">
        <div>
          <CardTitle className="text-base font-semibold tracking-[-0.01em]">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
