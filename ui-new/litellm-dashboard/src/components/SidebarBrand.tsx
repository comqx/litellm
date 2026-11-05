"use client";

import { useState } from "react";
import Link from "next/link";

import { ProductBrandLogo } from "@/components/brand/ProductBrandLogo";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cva.config";
import { PRODUCT_NAME } from "@/lib/productBranding";
import { uiHref } from "@/utils/uiHref";

interface SidebarBrandProps {
  collapsed: boolean;
}

export function SidebarBrand({ collapsed }: SidebarBrandProps) {
  const { logoUrl, logoUrlDark } = useTheme();
  const [erroredDarkLogo, setErroredDarkLogo] = useState<string | null>(null);
  const hasCustomLogo = Boolean(logoUrl || logoUrlDark);
  const reachableDarkLogo = logoUrlDark === erroredDarkLogo ? null : logoUrlDark;
  const darkLogoSrc = reachableDarkLogo || logoUrl;

  return (
    <div
      data-testid="sidebar-brand"
      className={cn("flex items-center gap-2", collapsed ? "flex-col px-0 py-1" : "min-w-0 px-1 py-0.5")}
    >
      <Link
        href={uiHref("")}
        className={cn(
          "flex min-w-0 items-center gap-2.5 text-sidebar-foreground no-underline",
          collapsed && "justify-center",
        )}
        aria-label={PRODUCT_NAME}
      >
        {hasCustomLogo && darkLogoSrc ? (
          <img
            src={darkLogoSrc}
            alt={PRODUCT_NAME}
            onError={() => setErroredDarkLogo(logoUrlDark)}
            className="h-8 w-auto shrink-0 object-contain"
          />
        ) : (
          <ProductBrandLogo
            showLabel={!collapsed}
            labelClassName="text-sidebar-foreground"
            markClassName={collapsed ? "h-8 w-8" : "h-8 w-8"}
          />
        )}
      </Link>
    </div>
  );
}

export default SidebarBrand;
