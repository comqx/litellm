"use client";

import { ProductBrandMark } from "@/components/brand/ProductBrandMark";
import { cn } from "@/lib/cva.config";
import { PRODUCT_NAME } from "@/lib/productBranding";

type ProductBrandLogoProps = {
  showLabel?: boolean;
  className?: string;
  markClassName?: string;
  labelClassName?: string;
  tone?: "onDark" | "onLight";
};

export function ProductBrandLogo({
  showLabel = true,
  className,
  markClassName,
  labelClassName,
  tone = "onDark",
}: ProductBrandLogoProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <ProductBrandMark tone={tone} className={cn("h-8 w-8", markClassName)} />
      {showLabel && (
        <span className={cn("truncate text-sm font-bold tracking-tight", labelClassName)}>{PRODUCT_NAME}</span>
      )}
    </span>
  );
}
