import React from "react";
import { pricingIssueUrl, totalUnits, type UsageUnits } from "./usageUnits";

export function UnpricedNote({ unpriced, provider }: { unpriced: UsageUnits; provider?: string }) {
  const total = totalUnits(unpriced);
  if (total === 0) return null;
  return (
    <p className="text-xs text-warning">
      {`${total.toLocaleString()} 个用量单位无已知价格，未计入成本。 `}
      <a
        href={pricingIssueUrl(unpriced, provider)}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        在 GitHub 上请求定价
      </a>
    </p>
  );
}
