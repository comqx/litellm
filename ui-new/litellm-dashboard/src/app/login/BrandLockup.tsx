"use client";

import { ProductBrandMark } from "@/components/brand/ProductBrandMark";
import { PRODUCT_NAME } from "@/lib/productBranding";

export function BrandLockup() {
  return (
    <div className="login-lockup">
      <ProductBrandMark className="login-lockup-mark" />
      <span className="login-lockup-wordmark">{PRODUCT_NAME}</span>
    </div>
  );
}
