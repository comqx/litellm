import { formatNumberWithCommas } from "@/utils/dataUtils";

export interface SummaryTile {
  title: string;
  value: string;
  className?: string;
  tooltip?: string;
  expandable?: boolean;
}

interface SpendSummaryMetadata {
  total_spend: number;
  total_flat_cost?: number;
  total_api_requests: number;
  total_successful_requests: number;
  total_failed_requests: number;
  total_tokens: number;
}

export const TOTAL_COST_TOOLTIP =
  "预留的预置吞吐量，无论是否发送请求都按小时计费。此处仅作展示，不计入 Team、Key、用户或组织的 Budget。";

export const REQUEST_COST_TOOLTIP =
  "Usage-based cost of the requests this entity sent during the selected period, priced per token.";

export const FLAT_COST_TOOLTIP =
  "预留的预置吞吐量，无论是否发送请求都按小时计费。此处仅作展示，不计入 Team、Key、用户或组织的 Budget。";

export const hasFlatCost = (metadata: SpendSummaryMetadata): boolean => (metadata.total_flat_cost ?? 0) > 0;

export const buildSummaryTiles = (metadata: SpendSummaryMetadata, showFlatCost: boolean): SummaryTile[] => {
  const flatCost = metadata.total_flat_cost ?? 0;
  return [
    showFlatCost
      ? {
          title: "总成本",
          value: `$${formatNumberWithCommas(metadata.total_spend + flatCost, 2)}`,
          tooltip: TOTAL_COST_TOOLTIP,
          expandable: true,
        }
      : { title: "总 Spend", value: `$${formatNumberWithCommas(metadata.total_spend, 2)}` },
    { title: "总请求数", value: metadata.total_api_requests.toLocaleString() },
    {
      title: "成功请求数",
      value: metadata.total_successful_requests.toLocaleString(),
      className: "text-success",
    },
    { title: "失败请求数", value: metadata.total_failed_requests.toLocaleString(), className: "text-destructive" },
    { title: "总 Tokens", value: metadata.total_tokens.toLocaleString() },
  ];
};

export const buildCostBreakdownTiles = (metadata: SpendSummaryMetadata): SummaryTile[] => [
  {
    title: "请求成本",
    value: `$${formatNumberWithCommas(metadata.total_spend, 2)}`,
    className: "text-info",
    tooltip: REQUEST_COST_TOOLTIP,
  },
  {
    title: "固定成本",
    value: `$${formatNumberWithCommas(metadata.total_flat_cost ?? 0, 2)}`,
    className: "text-violet-600",
    tooltip: FLAT_COST_TOOLTIP,
  },
];
