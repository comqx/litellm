import type { DateRangePickerValue } from "@/components/shared/date_picker_types";
import React, { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import AdvancedDatePicker from "@/components/shared/advanced_date_picker";
import { BarChart } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RefreshCw } from "lucide-react";
import { cachingHealthCheckCall } from "@/components/networking";
import { useCacheActivity, type CacheActivityGroup } from "@/app/(dashboard)/hooks/caching/useCacheActivity";

// Import the new component
import { CacheHealthTab } from "./cache_health";
import CacheSettings from "./cache_settings";
import CoordinationRedisSettings from "./coordination_redis_settings";
import { formatCacheCallTypeLabel } from "./cacheCallTypeLabels";
import { ErrorDrilldownCard } from "./ErrorDrilldown";

const REQUEST_SERIES = {
  apiRequests: "LLM API 请求",
  cacheHits: "缓存命中",
  failed: "失败请求",
} as const;

const UNKNOWN_CALL_TYPE = "Unknown";

const UNKNOWN_CALL_TYPE_NOTE =
  "Unknown 分组汇总了未记录 Endpoint 的花费日志。旧版本代理会为路由前被拒绝的请求写入这些日志，因此它们不一定是 LLM API 请求。";

const toChartDatum = (group: CacheActivityGroup) => ({
  name: formatCacheCallTypeLabel(group.call_type),
  [REQUEST_SERIES.apiRequests]: group.api_requests,
  [REQUEST_SERIES.cacheHits]: group.cache_hits,
  [REQUEST_SERIES.failed]: group.failed_requests,
  "缓存的 Completion Token": group.cached_completion_tokens,
  "生成的 Completion Token": group.generated_completion_tokens,
});

const formatDateWithoutTZ = (date: Date | undefined) => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
};

const resolveDrilldownCallType = (selected: string | null, groups: readonly CacheActivityGroup[]): string | null =>
  selected !== null && groups.some((group) => group.call_type === selected && group.failed_requests > 0)
    ? selected
    : null;

function valueFormatterNumbers(number: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    notation: "compact",
    compactDisplay: "short",
  });

  return formatter.format(number);
}

interface CachePageProps {
  accessToken: string | null;
  token: string | null;
  userRole: string | null;
  userID: string | null;
  premiumUser: boolean;
}

// Helper function to deep-parse a JSON string if possible

const CacheDashboard: React.FC<CachePageProps> = ({ accessToken, token, userRole, userID, premiumUser }) => {
  const anchor1 = useComboboxAnchor();
  const anchor2 = useComboboxAnchor();
  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [errorDrilldownCallType, setErrorDrilldownCallType] = useState<string | null>(null);

  const [dateValue, setDateValue] = useState<DateRangePickerValue>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const [lastRefreshed, setLastRefreshed] = useState("");
  const [healthCheckResponse, setHealthCheckResponse] = useState<any>("");

  const { data: activity, refetch } = useCacheActivity({
    startDate: formatDateWithoutTZ(dateValue.from),
    endDate: formatDateWithoutTZ(dateValue.to),
    keyAliases: selectedApiKeys,
    models: selectedModels,
  });

  useEffect(() => {
    setLastRefreshed(new Date().toLocaleString());
  }, []);

  const uniqueApiKeys = activity?.filter_options.key_aliases ?? [];
  const uniqueModels = activity?.filter_options.models ?? [];
  const chartData = (activity?.groups ?? []).map(toChartDatum);
  const hasUnknownGroup = (activity?.groups ?? []).some((group) => group.call_type === UNKNOWN_CALL_TYPE);
  const activeDrilldownCallType = resolveDrilldownCallType(errorDrilldownCallType, activity?.groups ?? []);

  const handleRefreshClick = () => {
    refetch();
    setLastRefreshed(new Date().toLocaleString());
  };

  const runCachingHealthCheck = async () => {
    try {
      toast.info("正在运行 Cache 健康检查…");
      setHealthCheckResponse("");
      const response = await cachingHealthCheckCall(accessToken !== null ? accessToken : "");
      setHealthCheckResponse(response);
    } catch (error: any) {
      console.error("Error running health check:", error);
      let errorData;
      if (error && error.message) {
        try {
          // Parse the error message which may contain a nested error layer.
          let parsedData = JSON.parse(error.message);
          // If the parsed object is wrapped (e.g. { error: { ... } }), unwrap it.
          if (parsedData.error) {
            parsedData = parsedData.error;
          }
          errorData = parsedData;
        } catch (e) {
          errorData = { message: error.message };
        }
      } else {
        errorData = { message: "发生未知错误" };
      }
      setHealthCheckResponse({ error: errorData });
    }
  };

  const totals = activity?.totals;
  const hasRequests = totals != null && totals.api_requests + totals.cache_hits + totals.failed_requests > 0;
  const statCards = [
    { label: "缓存命中率", value: `${hasRequests ? totals.cache_hit_ratio.toFixed(2) : "0"}%` },
    { label: "缓存命中次数", value: valueFormatterNumbers(totals?.cache_hits ?? 0) },
    { label: "缓存的 Completion Token", value: valueFormatterNumbers(totals?.cached_completion_tokens ?? 0) },
  ];

  return (
    <Tabs defaultValue="analytics" className="mt-2 mb-8 w-full gap-2 p-8">
      <div className="mt-2 flex w-full items-center justify-between border-b">
        <TabsList variant="line" className="h-auto rounded-none p-0">
          <TabsTrigger value="analytics" className="flex-none rounded-none px-4 py-2">
            缓存分析
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-none rounded-none px-4 py-2">
            缓存健康
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-none rounded-none px-4 py-2">
            缓存设置
          </TabsTrigger>
          <TabsTrigger value="coordination" className="flex-none rounded-none px-4 py-2">
            协调 Redis
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          {lastRefreshed && <p className="text-sm text-muted-foreground">上次刷新： {lastRefreshed}</p>}
          <Button variant="outline" size="icon-sm" onClick={handleRefreshClick} aria-label="刷新">
            <RefreshCw />
          </Button>
        </div>
      </div>

      <TabsContent value="analytics" keepMounted>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              展示 LiteLLM{" "}
              <a
                href="https://docs.litellm.ai/docs/proxy/caching"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                响应缓存
              </a>{" "}
              （例如 Redis / 内存）的分析：缓存命中、无需调用 LLM 供应商的请求。供应商侧{" "}
              <a
                href="https://docs.litellm.ai/docs/completion/prompt_caching"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                提示词缓存
              </a>{" "}
              （Anthropic、OpenAI 等缓存的输入 Token）不在此展示；请参阅用量页的「提示词缓存指标」或日志页中的单条请求。
            </p>

            <div className="mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_1fr_auto]">
              <Combobox
                multiple
                items={uniqueApiKeys}
                value={selectedApiKeys}
                onValueChange={(keys: string[]) => setSelectedApiKeys(keys)}
              >
                <ComboboxChips render={<div ref={anchor1} />}>
                  <ComboboxValue>
                    {(keys: string[]) =>
                      keys.map((key) => (
                        <ComboboxChip key={key} aria-label={key}>
                          {key}
                        </ComboboxChip>
                      ))
                    }
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="选择 Virtual Key" />
                </ComboboxChips>
                <ComboboxContent anchor={anchor1}>
                  <ComboboxEmpty>未找到 Virtual Key</ComboboxEmpty>
                  <ComboboxList>
                    {(key: string) => (
                      <ComboboxItem key={key} value={key}>
                        {key}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <Combobox
                multiple
                items={uniqueModels}
                value={selectedModels}
                onValueChange={(models: string[]) => setSelectedModels(models)}
              >
                <ComboboxChips render={<div ref={anchor2} />}>
                  <ComboboxValue>
                    {(models: string[]) =>
                      models.map((model) => (
                        <ComboboxChip key={model} aria-label={model}>
                          {model}
                        </ComboboxChip>
                      ))
                    }
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="选择 Model" />
                </ComboboxChips>
                <ComboboxContent anchor={anchor2}>
                  <ComboboxEmpty>未找到 Model</ComboboxEmpty>
                  <ComboboxList>
                    {(model: string) => (
                      <ComboboxItem key={model} value={model}>
                        {model}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <AdvancedDatePicker
                value={dateValue}
                onValueChange={(value) => {
                  setDateValue(value);
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardContent>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <div className="mt-2 flex items-baseline space-x-2.5">
                      <p className="text-3xl font-semibold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">缓存命中 vs API 请求</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  点击红色的失败请求分段，查看导致这些失败的错误码。
                </p>
                {hasUnknownGroup && <p className="mt-1 text-sm text-muted-foreground">{UNKNOWN_CALL_TYPE_NOTE}</p>}
                <BarChart
                  data={chartData}
                  stack={true}
                  index="name"
                  valueFormatter={valueFormatterNumbers}
                  categories={[REQUEST_SERIES.apiRequests, REQUEST_SERIES.cacheHits, REQUEST_SERIES.failed]}
                  colors={["sky", "teal", "red"]}
                  yAxisWidth={48}
                  className="mt-2"
                  onValueChange={(item) => {
                    if (item.categoryClicked !== REQUEST_SERIES.failed) return;
                    const groups = activity?.groups ?? [];
                    const matched = groups.find(
                      (group) =>
                        formatCacheCallTypeLabel(group.call_type) === item.name || group.call_type === item.name,
                    );
                    setErrorDrilldownCallType(matched?.call_type ?? item.name);
                  }}
                />
              </CardContent>
            </Card>

            {activeDrilldownCallType !== null && (
              <ErrorDrilldownCard
                callType={activeDrilldownCallType}
                buckets={activity?.error_breakdown ?? []}
                valueFormatter={valueFormatterNumbers}
                onClose={() => setErrorDrilldownCallType(null)}
              />
            )}

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  缓存的 Completion Token vs 生成的 Completion Token
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={chartData}
                  stack={true}
                  index="name"
                  valueFormatter={valueFormatterNumbers}
                  categories={["生成的 Completion Token", "缓存的 Completion Token"]}
                  colors={["sky", "teal"]}
                  yAxisWidth={48}
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="health" keepMounted>
        <CacheHealthTab
          accessToken={accessToken}
          healthCheckResponse={healthCheckResponse}
          runCachingHealthCheck={runCachingHealthCheck}
        />
      </TabsContent>

      <TabsContent value="settings" keepMounted>
        <CacheSettings accessToken={accessToken} userRole={userRole} userID={userID} />
      </TabsContent>

      <TabsContent value="coordination" keepMounted>
        <CoordinationRedisSettings />
      </TabsContent>
    </Tabs>
  );
};

export default CacheDashboard;
