"use client";

import { useMemo, useState } from "react";

import { AreaChart, BarChart, CustomLegend } from "@/components/shared/charts";
import AdvancedDatePicker from "@/components/shared/advanced_date_picker";
import SavingsTiles from "@/components/shared/SavingsTiles";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatRangeLabel,
  localIsoDay,
  MAX_POINTS_WITH_DOTS,
  SAVINGS_COLORS,
  SAVINGS_SERIES,
  SavingsAccumulation,
  SavingsPoint,
  savingsSeriesOf,
  shortDate,
  toCumulative,
  usd,
  withStartAnchor,
} from "@/app/(dashboard)/cost-optimization/_components/costOptimizationUtils";
import {
  useScopedDailyActivityRange,
  type ActivityDateRange,
  type ScopedActivityInput,
} from "@/app/(dashboard)/cost-optimization/_components/useDailyActivityRange";

interface ScopedSavingsTabProps {
  accessToken: string | null;
  scope: ScopedActivityInput;
  activity: ActivityDateRange;
  entityType: "key" | "user";
  scopeNote?: string;
}

const ScopedSavingsTab = ({ accessToken, scope, activity, entityType, scopeNote }: ScopedSavingsTabProps) => {
  const { dateValue, onDateChange, results, loading, failed } = useScopedDailyActivityRange(
    accessToken,
    scope,
    activity,
  );
  const startTime = dateValue.from;
  const endTime = dateValue.to;

  const [accumulation, setAccumulation] = useState<SavingsAccumulation>("cumulative");

  const perInterval = useMemo<SavingsPoint[]>(() => savingsSeriesOf(results), [results]);

  const overTime = useMemo(() => {
    if (accumulation !== "cumulative") return perInterval;
    const startLabel = startTime ? shortDate(localIsoDay(startTime)) : "";
    return withStartAnchor(toCumulative(perInterval), startLabel);
  }, [accumulation, perInterval, startTime]);

  const intervalLabel = "每日";
  const rangeLabel = formatRangeLabel(startTime, endTime);
  const savingsSubtitle = [
    accumulation === "cumulative" ? "累计节省总额" : `Saved ${intervalLabel.toLowerCase()}`,
    rangeLabel && `${rangeLabel} (UTC)`,
  ]
    .filter(Boolean)
    .join(" · ");

  const isLoading = loading;
  const unavailable = failed;
  const showResults = !isLoading && !unavailable;
  const hasRows = results.length > 0;
  const showEmpty = !unavailable && (isLoading || !hasRows);
  const showChart = showResults && hasRows;
  const chartProps = {
    data: overTime,
    index: "date",
    categories: SAVINGS_SERIES,
    colors: SAVINGS_COLORS,
    valueFormatter: usd,
    showLegend: false,
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">Spend 按 UTC 日期分桶</span>
        <AdvancedDatePicker value={dateValue} onValueChange={onDateChange} />
      </div>

      {scopeNote && (
        <p className="text-sm text-muted-foreground" data-testid={`${entityType}-savings-scope-note`}>
          {scopeNote}
        </p>
      )}

      {unavailable && (
        <p role="alert" className="text-sm text-muted-foreground">
          此时间范围内无法获取节省数据。请尝试其他日期范围或重新打开此标签页。
        </p>
      )}
      {showResults && <SavingsTiles results={results} isLoading={false} />}

      <Card>
        <CardHeader>
          <CardTitle>节省</CardTitle>
          <CardDescription>{savingsSubtitle}</CardDescription>
          <CardAction className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <CustomLegend categories={SAVINGS_SERIES} colors={SAVINGS_COLORS} />
            <Tabs value={accumulation} onValueChange={(value) => setAccumulation(value as SavingsAccumulation)}>
              <TabsList>
                <TabsTrigger value="cumulative">累计</TabsTrigger>
                <TabsTrigger value="per-interval">{intervalLabel}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          {showEmpty && (
            <p className="py-12 text-center text-sm text-muted-foreground" data-testid={`${entityType}-savings-empty`}>
              {isLoading ? "加载节省数据中…" : `No usage recorded for this ${entityType} in this range.`}
            </p>
          )}
          {showChart &&
            (accumulation === "cumulative" ? (
              <AreaChart {...chartProps} showDots={overTime.length <= MAX_POINTS_WITH_DOTS} />
            ) : (
              <BarChart {...chartProps} />
            ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScopedSavingsTab;
