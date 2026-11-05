"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { apiClient } from "@/components/networking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOG_ID_QUERY_PARAM } from "@/components/logs/request/logDetailRouting";
import type { paths } from "@/lib/http/schema";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import { uiHref } from "@/utils/uiHref";
import { usd } from "./costOptimizationUtils";
import { benchmarksWindow as activityWindow } from "./useAutoRouterBenchmarks";
import type { DateRange } from "./useDailyActivityRange";

const REQUESTS_PATH = "/cost_optimization/prompt_caching/requests";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
type RequestsEndpoint = paths[typeof REQUESTS_PATH]["get"];
type RequestsResponse = RequestsEndpoint["responses"][200]["content"]["application/json"];
type RequestsQuery = NonNullable<RequestsEndpoint["parameters"]["query"]>;
type RequestFilter = NonNullable<RequestsQuery["filter"]>;
type RequestCursor = RequestsResponse["next_cursor"];

interface PromptCachingRequestsTableProps {
  accessToken: string;
  dateValue: DateRange;
}

export default function PromptCachingRequestsTable({ accessToken, dateValue }: PromptCachingRequestsTableProps) {
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [pageSize, setPageSize] = useState(10);
  const window = activityWindow(dateValue, new Date());
  const startDate = window.start_date ? `${window.start_date}T00:00:00.000Z` : "";
  const endDate = window.end_date ? `${window.end_date}T23:59:59.999Z` : "";
  const scope = JSON.stringify([accessToken, startDate, endDate, filter, pageSize]);
  const [pagination, setPagination] = useState<{ scope: string; cursors: readonly RequestCursor[] }>({
    scope,
    cursors: [null],
  });
  const cursors = pagination.scope === scope ? pagination.cursors : [null];
  const cursor = cursors.at(-1);
  const page = cursors.length;

  if (pagination.scope !== scope) {
    setPagination({ scope, cursors: [null] });
  }

  const enabled = Boolean(accessToken && startDate && endDate);
  const query: RequestsQuery = {
    start_date: startDate,
    end_date: endDate,
    filter,
    page_size: pageSize,
    cursor_start_time: cursor?.start_time,
    cursor_request_id: cursor?.request_id,
  };
  const queryOptions: UseQueryOptions<RequestsResponse> = {
    queryKey: [REQUESTS_PATH, accessToken, query],
    queryFn: ({ signal }) => apiClient.get<RequestsResponse>(REQUESTS_PATH, { accessToken, query, signal }),
    enabled,
    retry: false,
  };
  const requests = useQuery(queryOptions);
  const nextCursor = requests.data?.next_cursor;

  const changeFilter = (value: unknown) => {
    if (value === "all" || value === "injected" || value === "hits") {
      setFilter(value);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>提示词 Cache 请求</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests with recorded LiteLLM injection or provider cache reads or writes. A cache hit alone does not
            establish LiteLLM injection; older logs may not record it.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Net savings are estimated from logged usage and current configured pricing, after cache-write premiums.
            Negative values mean caching cost more; unavailable means the request could not be priced.
          </p>
        </div>
        <Tabs value={filter} onValueChange={changeFilter}>
          <TabsList aria-label="提示词 Cache 请求筛选">
            <TabsTrigger value="all">全部 Cache</TabsTrigger>
            <TabsTrigger value="injected">LiteLLM 注入</TabsTrigger>
            <TabsTrigger value="hits">Cache 命中</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {!enabled && <p className="py-8 text-center text-muted-foreground">选择日期范围以查看请求</p>}
        {enabled && requests.isPending && (
          <p role="status" className="py-8 text-center text-muted-foreground">
            正在加载请求…
          </p>
        )}
        {enabled && requests.isError && (
          <div role="alert" className="flex items-center justify-center gap-3 py-8">
            <p>无法加载提示词 Cache 请求</p>
            <Button variant="outline" onClick={() => void requests.refetch()} disabled={requests.isFetching}>
              重试
            </Button>
          </div>
        )}
        {enabled && requests.isSuccess && (
          <>
            {requests.data.requests.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                该时间范围内没有匹配的提示词 Cache 请求
              </p>
            ) : (
              <Table aria-label="提示词 Cache 请求">
                <TableHeader>
                  <TableRow>
                    <TableHead>请求</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>LiteLLM 注入</TableHead>
                    <TableHead className="text-right">Cache 读取</TableHead>
                    <TableHead className="text-right">Cache 写入</TableHead>
                    <TableHead className="text-right">实际成本</TableHead>
                    <TableHead className="text-right">净节省</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.data.requests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell>
                        <Link
                          href={uiHref(`logs?${new URLSearchParams({ [LOG_ID_QUERY_PARAM]: request.request_id })}`)}
                          className="block max-w-40 truncate text-primary underline underline-offset-2"
                          title={request.request_id}
                        >
                          {request.request_id}
                        </Link>
                        <time dateTime={request.start_time} className="mt-1 block text-xs text-muted-foreground">
                          {new Date(request.start_time).toLocaleString()}
                        </time>
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-36 truncate" title={request.model}>
                          {request.model}
                        </span>
                      </TableCell>
                      <TableCell>{request.gateway_injected ? "已记录" : "未记录"}</TableCell>
                      <TableCell className="text-right">{formatNumberWithCommas(request.cache_read_tokens)}</TableCell>
                      <TableCell className="text-right">
                        {formatNumberWithCommas(request.cache_creation_tokens)}
                      </TableCell>
                      <TableCell className="text-right">{usd(request.spend)}</TableCell>
                      <TableCell className="text-right">
                        {request.net_savings === null ? "不可用" : usd(request.net_savings)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页行数</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      setPageSize(Number(value));
                    }
                  }}
                >
                  <SelectTrigger size="sm" aria-label="每页行数" className="w-[4.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground tabular-nums">Page {page}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="上一页"
                    disabled={page === 1}
                    onClick={() => setPagination({ scope, cursors: cursors.slice(0, -1) })}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="下一页"
                    disabled={!requests.data.has_more || !nextCursor}
                    onClick={() => nextCursor && setPagination({ scope, cursors: [...cursors, nextCursor] })}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
