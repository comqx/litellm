"use client";

import React, { useMemo } from "react";

import SummaryCard from "@/components/shared/SummaryCard";
import {
  autorouterOf,
  cachingOf,
  compressionOf,
  gatewayAttributedCachingOf,
  SAVINGS_DRIVERS,
  savedTokensOf,
  sumOverDays,
  usd,
} from "@/app/(dashboard)/cost-optimization/_components/costOptimizationUtils";
import { DailyData } from "@/components/UsagePage/types";
import { formatNumberWithCommas } from "@/utils/dataUtils";

// The total sums SAVINGS_DRIVERS, so it is by construction the sum of what the
// charts plot; the donut and timelines derive from the same list in costOptimizationUtils.
const useSavingsTotals = (results: DailyData[]) =>
  useMemo(
    () => ({
      compression: sumOverDays(results, compressionOf),
      caching: sumOverDays(results, cachingOf),
      autorouter: sumOverDays(results, autorouterOf),
      gatewayAttributedCaching: sumOverDays(results, gatewayAttributedCachingOf),
      savedTokens: sumOverDays(results, savedTokensOf),
      total: SAVINGS_DRIVERS.reduce((sum, { of }) => sum + sumOverDays(results, of), 0),
    }),
    [results],
  );

const SavingsTiles = ({ results, isLoading }: { results: DailyData[]; isLoading: boolean }) => {
  const totals = useSavingsTotals(results);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="已记录节省总额"
        value={usd(totals.total)}
        hint={isLoading ? "Loading..." : "压缩 + 提示词缓存 + 自动路由器"}
        info="旁边三张卡片中已记录节省的总和。不含估算值的 Auto Router 请求不计入。其中缓存项为 LiteLLM 注入的份额；由客户端或 Provider 提供的缓存仅计入缓存卡片的总计数值。"
      />
      <SummaryCard
        label="压缩节省"
        value={usd(totals.compression)}
        hint={`已压缩 ${formatNumberWithCommas(totals.savedTokens)} 个 Token`}
        info="Headroom 在调用前移除的 Token，按 Model 的输入费率计价。"
      />
      <SummaryCard
        label="提示词缓存节省"
        value={usd(totals.gatewayAttributedCaching)}
        hint="LiteLLM 注入"
        secondary={{ label: "总计", value: usd(totals.caching) }}
        info="What caching saved against paying the input rate for every token: the discount on tokens served from cache, less the premium providers charge to write a cache entry. The headline figure is the share LiteLLM earned by inserting the breakpoints itself, 至 configured injection points or auto prompt caching. The total beside it also counts requests that arrived with their own cache_control and providers that cache implicitly. Either can be negative on traffic that writes more cache than it reuses, which is why the headline is not always the smaller of the two."
      />
      <SummaryCard
        label="自动路由节省"
        value={usd(totals.autorouter)}
        hint="已记录估算小计"
        info="相对于每个路由器的最高档基线，所有可用单请求节省估算的总和，已扣除分类器成本。没有估算值的请求对此小计没有贡献，但这并不意味着它们节省为零。历史记录保留写入时使用的估算器。Auto Router 用量标签页显示当前估算的覆盖情况。"
      />
    </div>
  );
};

export default SavingsTiles;
