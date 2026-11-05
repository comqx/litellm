"use client";

import { Page } from "@/components/shared/Page";
import React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Minus } from "lucide-react";
import { StackedUsageChart } from "@/components/shared/charts";

import { apiClient } from "@/components/networking";
import { extractErrorMessage } from "@/utils/errorUtils";
import { ProviderLogo } from "@/components/molecules/models/ProviderLogo";
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from "@/components/shared/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildBucketTotals,
  buildSeries,
  formatMetric,
  Granularity,
  Metric,
  ModelInsightsResponse,
  modelOrder,
  rankModels,
  RankedModel,
} from "./modelInsightsData";

const SCALES = ["linear", "log"] as const;
const GRANULARITIES = ["day", "week"] as const;
const GRANULARITY_LABELS: Record<Granularity, string> = { day: "每日", week: "每周" };
const METRIC_LABELS: Record<Metric, string> = { requests: "请求数", spend: "花费", tokens: "Token 数" };
const RANKING_ROWS = 5;

type Scale = (typeof SCALES)[number];
const SCALE_LABELS: Record<Scale, string> = { linear: "线性", log: "对数" };

const formatDelta = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const formatProviderLabel = (provider: string) => (provider.trim().toLowerCase() === "unknown" ? "未知" : provider);

const DeltaBadge = ({ value }: { value: number }) => {
  if (Math.abs(value) < 0.05) {
    return (
      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0.0
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center justify-end gap-1 text-xs ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="size-3" /> {formatDelta(value)}
    </span>
  );
};

const RankingRow = ({ model, rank }: { model: RankedModel; rank: number }) => (
  <li className="grid grid-cols-[1.5rem_2.5rem_1fr_auto] items-center gap-3 py-2">
    <span className="text-sm tabular-nums text-muted-foreground">{rank}</span>
    <ProviderLogo provider={model.provider} className="size-9 rounded-md border p-1" />
    <div className="min-w-0">
      <p className="truncate font-medium">{model.model_group}</p>
      <p className="truncate text-sm text-muted-foreground">由 {formatProviderLabel(model.provider)}</p>
    </div>
    <div className="text-right">
      <p className="font-medium tabular-nums">{model.share.toFixed(1)}%</p>
      <DeltaBadge value={model.delta} />
    </div>
  </li>
);

export default function ModelInsightsView({ accessToken }: { accessToken: string | null }) {
  const [loaded, setLoaded] = React.useState<{ metric: Metric; response: ModelInsightsResponse } | null>(null);
  const [metric, setMetric] = React.useState<Metric>("tokens");
  const [scale, setScale] = React.useState<Scale>("linear");
  const [granularity, setGranularity] = React.useState<Granularity>("day");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    apiClient
      .get<ModelInsightsResponse>("/model-insights", { accessToken, query: { metric } })
      .then((response) => {
        if (cancelled) return;
        setError(null);
        setLoaded({ metric, response });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, metric]);

  const data = loaded?.response ?? null;
  const shown = loaded?.metric ?? metric;
  const isStale = loaded !== null && loaded.metric !== metric;
  const range = React.useMemo(() => ({ start: data?.start_date ?? "", end: data?.end_date ?? "" }), [data]);
  const models = React.useMemo(() => (data ? modelOrder(data.daily, shown) : []), [data, shown]);
  const series = React.useMemo(
    () => (data ? buildSeries(data.daily, models, shown, { ...range, granularity }) : []),
    [data, models, shown, range, granularity],
  );
  const bucketTotals = React.useMemo(
    () => (data ? buildBucketTotals(data.daily_totals, shown, { ...range, granularity }) : new Map<string, number>()),
    [data, shown, range, granularity],
  );
  const ranking = React.useMemo(
    () => (data ? rankModels(data.top_models, data.daily, shown, range) : []),
    [data, shown, range],
  );

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>无法加载模型排行榜</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-16 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader>
        <PageHeaderTitle>
          <BarChart3 />
          模型排行榜
        </PageHeaderTitle>
        <PageHeaderDescription>
          查看网关在 {data.start_date} 至 {data.end_date} 期间使用的模型
        </PageHeaderDescription>
      </PageHeader>

      <Card aria-busy={isStale} className={isStale ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>热门模型</CardTitle>
            <CardDescription>
              网关{GRANULARITY_LABELS[granularity]} {METRIC_LABELS[shown]}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={metric} onValueChange={(value) => setMetric(value as Metric)}>
              <TabsList>
                {(["requests", "spend", "tokens"] as const).map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {METRIC_LABELS[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={granularity} onValueChange={(value) => setGranularity(value as Granularity)}>
              <TabsList aria-label="时间粒度">
                {GRANULARITIES.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {GRANULARITY_LABELS[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={scale} onValueChange={(value) => setScale(value as Scale)}>
              <TabsList>
                {SCALES.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {SCALE_LABELS[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <StackedUsageChart
            data={series}
            series={models}
            xKey="date"
            scale={scale}
            format={(value) => formatMetric(value, shown)}
            totalLabel="网关合计"
            totalFor={(label) => bucketTotals.get(label) ?? 0}
          />
        </CardContent>
      </Card>

      <Card aria-busy={isStale} className={isStale ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <CardHeader>
          <CardTitle>排行榜</CardTitle>
          <CardDescription>
            {METRIC_LABELS[shown]}占比，及前后半周期变化
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-12 md:grid-cols-2">
          <ol className="divide-y">
            {ranking.slice(0, RANKING_ROWS).map((model, index) => (
              <RankingRow key={model.model_group} model={model} rank={index + 1} />
            ))}
          </ol>
          <ol className="divide-y">
            {ranking.slice(RANKING_ROWS).map((model, index) => (
              <RankingRow key={model.model_group} model={model} rank={RANKING_ROWS + index + 1} />
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>单次会话成本</CardTitle>
          <CardDescription>会话成本未从请求数估算</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            在请求中添加稳定的 session_id，以在未来的会话汇总中解锁精确的会话级模型对比。
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}
