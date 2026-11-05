import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/components/networking";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { components } from "@/lib/http/schema";

type Availability = components["schemas"]["AutoRouterAvailabilityResponse"];
type Request = components["schemas"]["AutoRouterAvailabilityRequest"];
export type Allowance = components["schemas"]["AutoRouterAllowance"];

type AvailabilityState = {
  data?: Availability;
  isPending: boolean;
  isError: boolean;
  isChecking?: boolean;
  refetch?: () => unknown;
};

export const AutoRouterAvailabilityContext = createContext<AvailabilityState>({ isPending: true, isError: false });

export const useAutoRouterAvailability = (accessToken: string, body: Request, enabled = true) => {
  const serialized = JSON.stringify(body.complexity_router_config ?? null);
  const [debounced, setDebounced] = useState(serialized);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(serialized), 300);
    return () => clearTimeout(timeout);
  }, [serialized]);
  const options: UseQueryOptions<Availability> = {
    queryKey: ["autoRouterAvailability", accessToken, body.team_id, body.saved_model_id, debounced],
    queryFn: ({ signal }) =>
      apiClient.post<Availability>("/auto_router/availability", {
        accessToken,
        body: { ...body, complexity_router_config: JSON.parse(debounced) },
        signal,
      }),
    enabled: enabled && Boolean(accessToken),
    placeholderData: (previous, previousQuery) => {
      const key = previousQuery?.queryKey;
      return key?.[1] === accessToken && key[2] === body.team_id && key[3] === body.saved_model_id
        ? previous
        : undefined;
    },
    refetchOnMount: "always",
    staleTime: 0,
    retry: false,
  };
  const query = useQuery(options);
  const isChecking = query.isFetching || query.isPlaceholderData || serialized !== debounced;
  const saveBlockedReason = () => {
    if (!enabled) return null;
    if (query.isPending || isChecking) return "正在检查可用性";
    if (query.isError || !query.data) return "无法检查可用性。请重试后再保存。";
    return query.data.error ?? null;
  };
  return {
    ...query,
    isPending: query.isPending || (query.isFetching && !query.isFetchedAfterMount),
    isChecking,
    saveBlockedReason: saveBlockedReason(),
  };
};

export const allowanceLabel = (allowance?: Allowance): string | null => {
  if (!allowance?.available) return "可用性未知";
  if (allowance.limit == null) return null;
  if (allowance.used_by_this_router) return "已被此路由器使用";
  return `可用 ${allowance.remaining} / ${allowance.limit}`;
};

const availabilityLabel = (state: AvailabilityState, key: string) => {
  if (state.isPending || state.isChecking) return "正在检查可用性";
  if (state.isError) return "可用性未知";
  return allowanceLabel(state.data?.allowances.find((entry) => entry.key === key));
};

export const useAllowanceLabel = (key: string) => availabilityLabel(useContext(AutoRouterAvailabilityContext), key);

export const isAllowanceExhausted = (allowance?: Allowance) =>
  Boolean(allowance?.available && allowance.limit != null && allowance.remaining === 0) &&
  !allowance?.used_by_this_router;

export const AUTO_ROUTER_CONTACT_URL = "https://calendly.com/tin-berri/litellm-auto-router-pricing-discussion";

export const AutoRouterContactLink = ({ features, message }: { features?: string[]; message?: string }) => {
  const state = useContext(AutoRouterAvailabilityContext);
  if (state.isPending || state.isError || state.isChecking) return null;
  const exhausted = state.data?.allowances.some(
    (entry) => (!features || features.includes(entry.key)) && isAllowanceExhausted(entry),
  );
  if (!exhausted) return null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-xs leading-5 text-muted-foreground">
      {message}
      <a
        href={AUTO_ROUTER_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        联系我们的团队
      </a>
    </span>
  );
};

export const AutoRouterAllowanceLabel = ({ feature }: { feature: string }) => {
  const label = useAllowanceLabel(feature);
  return label ? (
    <span className="shrink-0 whitespace-nowrap text-xs leading-5 tabular-nums text-muted-foreground">{label}</span>
  ) : null;
};

export const AutoRouterAllowanceNote = ({ feature, label }: { feature: string; label: string }) => {
  const availability = useAllowanceLabel(feature);
  return availability ? (
    <p className="text-xs leading-5 text-muted-foreground">
      {label}: {availability} <AutoRouterContactLink features={[feature]} />
    </p>
  ) : null;
};

export const AutoRouterLimits = () => {
  const state = useContext(AutoRouterAvailabilityContext);
  const limits = [
    ["heuristic_v2", "Heuristic v2 路由器"],
    ["capability", "能力路由器"],
    ["llm_v2", "Fuse v2 路由器"],
    ["tier_or_classifier_prompt", "自定义层级或提示词"],
    ["heuristic_tuning", "基于规则的调优"],
  ];
  return (
    <Popover>
      <PopoverTrigger className="shrink-0 whitespace-nowrap text-xs font-normal text-muted-foreground underline underline-offset-4 hover:text-foreground">
        查看限额
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] gap-3">
        <PopoverTitle>路由与自定义限额</PopoverTitle>
        <p className="text-xs leading-5 text-muted-foreground">
          基于规则、复杂度和 Jev 在内置设置下不限量。可自由选择或更改层级 Models。
          自定义额度在此代理内共享。
        </p>
        <dl className="space-y-2 text-xs">
          {limits.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt>{label}</dt>
              <dd className="shrink-0 tabular-nums text-muted-foreground">
                {availabilityLabel(state, key) ?? "不限量"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">
          Custom tier definitions and written classifier instructions share one allowance. Built-in prompts and
          display-name changes do not use it.
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          更改评分规则（如权重、阈值、关键词或自定义维度）会使用基于规则的调优额度。它也适用于启发式优先和混合模式。
          已有路由器上记录的设置会保留；新路由器从内置规则开始。
          preserved; new routers start from built-in rules.
        </p>
        <AutoRouterContactLink message="需要更高的限额？" />
      </PopoverContent>
    </Popover>
  );
};
