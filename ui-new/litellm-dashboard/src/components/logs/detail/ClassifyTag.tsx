"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cva.config";

export const AUTOROUTER_CLASSIFIER_ORIGIN = "autorouter_classifier";

export function ClassifyTag({ origin, className }: { origin?: string | null; className?: string }) {
  if (origin !== AUTOROUTER_CLASSIFIER_ORIGIN) return null;
  return (
    <Badge
      variant="secondary"
      title="自动路由发起的层级分类调用，并非调用方发送的请求"
      className={cn("px-2 py-0 text-[10px] font-normal", className)}
    >
      Classify
    </Badge>
  );
}
