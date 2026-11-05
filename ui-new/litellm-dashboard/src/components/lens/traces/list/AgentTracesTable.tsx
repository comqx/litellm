"use client";

import { getCoreRowModel, useReactTable, type ColumnDef, type TableOptions } from "@tanstack/react-table";
import { ArrowDown, ChevronRight, Plus, Star } from "lucide-react";
import { createContext, useContext, useEffect } from "react";
import { useInView } from "react-intersection-observer";

import { DataTableViewOptions } from "@/components/shared/DataTable/DataTableViewOptions";
import { usePersistedColumnVisibility } from "@/components/shared/DataTable/usePersistedColumnVisibility";
import { InspectorTable, useInspectorTable } from "@/components/shared/InspectorTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cva.config";
import { formatActivityTimestamp, formatRunTimestamp, localTimeZoneAbbreviation } from "@/utils/activityTimestamp";

import { SpanIcon } from "../ui/SpanIcon";
import type { TraceFindingState } from "./useTraceFindings";
import { flaggedSignals, isFlagged, type TraceSignalState } from "./useTraceSignals";
import { LOW_SCORE, isLowFeedback, type TraceFeedbackState } from "./useTraceFeedback";
import { SignalPills } from "../ui/SignalPills";
import { FrameworkLogo, traceFramework } from "../ui/TraceFramework";
import type { TraceSummary } from "../types";
import { traceRefOf } from "../routing";
import { fmtMs, previewText, traceAgentNames } from "../utils";

interface AgentTracesTableProps {
  traces: TraceSummary[];
  findings: ReadonlyMap<string, TraceFindingState>;
  feedback?: ReadonlyMap<string, TraceFeedbackState>;
  canViewFindings?: boolean;
  signals?: ReadonlyMap<string, TraceSignalState>;
  showSignals?: boolean;
  signalsColumn?: boolean;
  onSetUpSignals?: () => void;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  isFetching?: boolean;
  /** Rows from the previous range shown while the new one loads: blurred, and never paged further. */
  isPlaceholder?: boolean;
  onRetry?: () => void;
  onLoadMore: () => void;
  rangeEmpty?: boolean;
  onSetUpTracing: () => void;
}

export const formatCost = (cost: number): string => {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
};

type RunCost = { label: string; partial: { short: string; long: string } | null };

export const runCost = ({
  spend,
  priced_calls,
  llm_calls,
}: Pick<TraceSummary, "spend" | "priced_calls" | "llm_calls">): RunCost | null => {
  if (spend == null || priced_calls === 0) return null;
  if (priced_calls >= llm_calls) return { label: formatCost(spend), partial: null };
  return {
    label: `≥ ${formatCost(spend)}`,
    partial: {
      short: `${priced_calls}/${llm_calls} 已计价`,
      long: `${llm_calls} 次调用中有 ${priced_calls} 次已计价`,
    },
  };
};

function CostCell({ run }: { run: TraceSummary }) {
  const cost = runCost(run);
  if (!cost) return "—";
  if (!cost.partial) return cost.label;
  return (
    <span className="inline-flex items-baseline gap-1.5" title={cost.partial.long}>
      {cost.label}
      <span className="text-xs text-muted-foreground">{cost.partial.short}</span>
    </span>
  );
}

const singleLine = (text: string): string => text.replace(/\s+/g, " ").trim();
const runKey = (run: TraceSummary): string => run.trace_ref || run.trace_id;

const PREFETCH_MARGIN = "0px 0px 480px 0px";
const PLACEHOLDER_ROWS = [0, 1, 2];
const SKELETON_ROWS = Array.from({ length: 12 }, (_, i) => i);
const ROW_HEIGHT = 36;
const MUTED_NUM = "font-mono text-muted-foreground";
const NUM = "font-mono text-foreground";
const FindingsContext = createContext<ReadonlyMap<string, TraceFindingState>>(new Map());
const SignalsContext = createContext<ReadonlyMap<string, TraceSignalState>>(new Map());
const NO_SIGNALS: ReadonlyMap<string, TraceSignalState> = new Map();
const SignalSetupContext = createContext<{ configured: boolean; onSetUp?: () => void }>({ configured: false });
const FLAGGED_ROW = "bg-destructive/[0.04] shadow-[inset_2px_0_0_var(--color-destructive)] hover:bg-destructive/[0.07]";
const FeedbackContext = createContext<ReadonlyMap<string, TraceFeedbackState>>(new Map());
const NO_FEEDBACK: ReadonlyMap<string, TraceFeedbackState> = new Map();
const feedbackOrEmpty = (feedback?: ReadonlyMap<string, TraceFeedbackState>) => feedback ?? NO_FEEDBACK;

function AgentCell({ run }: { run: TraceSummary }) {
  const framework = traceFramework(run);
  const agents = traceAgentNames(run).join(", ");
  const title = [agents, framework?.label].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={title}>
      {framework ? <FrameworkLogo framework={framework} /> : <SpanIcon type="agent" size="sm" />}
      <span className="truncate">{agents || framework?.label || "—"}</span>
    </div>
  );
}

function InputCell({ run }: { run: TraceSummary }) {
  const input = singleLine(previewText(run.input_preview));
  return (
    <div className="flex min-w-0 items-center gap-2">
      {input ? (
        <span className="truncate text-foreground">{input}</span>
      ) : (
        <span className="truncate text-muted-foreground">未记录输入</span>
      )}
      {run.resolution_limited && (
        <span
          className="shrink-0 text-xs text-muted-foreground"
          title="此次运行过大，无法在此视图计算全部合计"
        >
          部分合计
        </span>
      )}
      <span className="hidden max-w-32 min-w-0 shrink-[100] truncate font-mono text-xs text-muted-foreground 2xl:inline">
        {run.trace_id}
      </span>
    </div>
  );
}

function FindingCount({ run }: { run: TraceSummary }) {
  const state = useContext(FindingsContext).get(runKey(run));
  if (!state || state.status === "pending")
    return <Skeleton aria-label="正在加载发现" className="ml-auto h-3 w-5" />;
  if (state.status === "error") return <span title="无法加载发现">不可用</span>;
  if (state.count === null) return <span title="此追踪无结论性调查">-</span>;
  return (
    <span title={`已完成调查产生 ${state.count} 条发现`}>{state.count.toLocaleString()}</span>
  );
}

function SignalsHeader() {
  const { configured, onSetUp } = useContext(SignalSetupContext);
  if (configured || !onSetUp) return <>信号</>;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      信号
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-label="设置信号"
        onClick={(event) => {
          event.stopPropagation();
          onSetUp();
        }}
        className="h-5 rounded-full px-2 font-medium tracking-normal normal-case"
      >
        <Plus />
        设置
      </Button>
    </span>
  );
}

const mutedCell = (label: string, title: string) => (
  <span className="text-muted-foreground" title={title}>
    {label}
  </span>
);

function SignalsCell({ run }: { run: TraceSummary }) {
  const { configured } = useContext(SignalSetupContext);
  const state = useContext(SignalsContext).get(runKey(run));
  const muted = mutedCell;
  if (!configured) return muted("-", "尚未配置信号");
  if (!state || state.status === "pending") return <Skeleton aria-label="正在加载信号" className="h-3 w-16" />;
  if (state.status === "error") return muted("不可用", "无法加载信号");
  const { status } = state.signals;
  if (status === "unclassified" || status === "pending")
    return muted("检查中", "System 1 模型正在检查此次运行");
  if (status === "failed") return muted("未检查", "System 1 模型未能检查此次运行");
  const flags = flaggedSignals(state.signals);
  if (!flags.length) return <span title="未检测到信号" />;
  return <SignalPills flags={flags} className="overflow-hidden" />;
}

export const formatScore = (score: number): string => (Number.isInteger(score) ? String(score) : score.toFixed(1));

export function FeedbackScore({ run }: { run: TraceSummary }) {
  const state = useContext(FeedbackContext).get(runKey(run));
  if (!state || state.status === "pending")
    return <Skeleton aria-label="正在加载反馈" className="ml-auto h-3 w-8" />;
  if (state.status === "error") return <span title="无法加载反馈">不可用</span>;
  const { count, average, lowest } = state.summary;
  if (count === 0 || average == null) return <span title="尚无反馈">—</span>;
  const low = lowest != null && lowest <= LOW_SCORE;
  return (
    <span
      data-testid="feedback-score"
      data-low={low || undefined}
      title={`用户反馈：${count} 条评分，最低 ${lowest}/10`}
      className={cn(
        "inline-flex w-16 items-center justify-between rounded px-1.5 py-0.5 tabular-nums",
        low ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
      )}
    >
      <Star className={cn("size-3 shrink-0", low ? "fill-destructive" : "fill-amber-400 text-amber-400")} />
      {formatScore(average)}/10
    </span>
  );
}

const RUN_COLUMNS: ColumnDef<TraceSummary>[] = [
  {
    id: "time",
    size: 170,
    enableHiding: false,
    header: () => (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        时间 <ArrowDown className="size-2.5" />
        <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
          {localTimeZoneAbbreviation()}
        </span>
      </span>
    ),
    cell: ({ row }) => (
      <span title={formatActivityTimestamp(row.original.start_time)}>
        {formatRunTimestamp(row.original.start_time)}
      </span>
    ),
    meta: {
      title: "时间",
      className: "font-mono tabular-nums text-muted-foreground",
      renderSkeleton: () => <Skeleton className="h-3 w-24" />,
    },
  },
  {
    id: "agent",
    size: 160,
    enableHiding: false,
    header: "智能体",
    cell: ({ row }) => <AgentCell run={row.original} />,
    meta: {
      renderSkeleton: () => (
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ),
    },
  },
  { id: "input", header: "输入", cell: ({ row }) => <InputCell run={row.original} /> },
  {
    id: "signals",
    size: 300,
    header: () => <SignalsHeader />,
    cell: ({ row }) => <SignalsCell run={row.original} />,
    meta: { title: "信号", renderSkeleton: () => <Skeleton className="h-3 w-16" /> },
  },
  {
    id: "agents",
    size: 72,
    header: "智能体数",
    cell: ({ row }) => row.original.agent_count.toLocaleString(),
    meta: { numeric: true, className: MUTED_NUM },
  },
  {
    id: "steps",
    size: 74,
    header: "步骤",
    cell: ({ row }) => row.original.span_count.toLocaleString(),
    meta: { numeric: true, className: MUTED_NUM },
  },
  {
    id: "duration",
    size: 86,
    header: "时长",
    cell: ({ row }) => fmtMs(row.original.duration_ms),
    meta: { numeric: true, className: NUM },
  },
  {
    id: "cost",
    size: 80,
    header: "成本",
    cell: ({ row }) => <CostCell run={row.original} />,
    meta: { numeric: true, className: NUM },
  },
  {
    id: "findings",
    size: 96,
    header: "发现",
    cell: ({ row }) => <FindingCount run={row.original} />,
    meta: { numeric: true, className: NUM },
  },
  {
    id: "feedback",
    size: 96,
    header: "反馈",
    cell: ({ row }) => <FeedbackScore run={row.original} />,
    meta: { numeric: true, className: NUM },
  },
  {
    id: "open",
    size: 32,
    enableHiding: false,
    header: ({ table }) => <DataTableViewOptions table={table} label="列" iconOnly />,
    cell: () => <ChevronRight className="size-3 text-muted-foreground/60" />,
    meta: { className: "px-0", headerClassName: "px-1", renderSkeleton: () => null },
  },
];

function PlaceholderRow({ index, rowRef }: { index: number; rowRef?: (node: Element | null) => void }) {
  return <InspectorTable.SkeletonRow ref={rowRef} index={index} data-testid="runs-placeholder" className="h-9" />;
}

function LoadMoreRows({ isFetching, onLoadMore }: { isFetching: boolean; onLoadMore: () => void }) {
  const { scroller } = useInspectorTable();
  const { ref: tailRef, inView: nearTail } = useInView({ root: scroller, rootMargin: PREFETCH_MARGIN });
  useEffect(() => {
    if (nearTail && !isFetching) onLoadMore();
  }, [nearTail, isFetching, onLoadMore]);
  return PLACEHOLDER_ROWS.map((row) => (
    <PlaceholderRow key={row} index={row} rowRef={row === 0 ? tailRef : undefined} />
  ));
}

function EmptyRuns({ rangeEmpty, onSetUpTracing }: { rangeEmpty: boolean; onSetUpTracing: () => void }) {
  if (!rangeEmpty)
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-xs text-muted-foreground">
        <span>没有符合筛选条件的运行。</span>
        <Button size="xs" variant="outline" onClick={onSetUpTracing}>
          配置追踪
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center">
      <p className="text-sm font-medium">此时间范围内无运行</p>
      <p className="text-xs text-muted-foreground">连接智能体以开始发送追踪。</p>
      <Button size="sm" className="mt-3" onClick={onSetUpTracing}>
        配置追踪
      </Button>
    </div>
  );
}

function rowFlags(
  run: TraceSummary,
  feedback: ReadonlyMap<string, TraceFeedbackState> | undefined,
  signals: ReadonlyMap<string, TraceSignalState>,
  showSignals: boolean,
) {
  const lowFeedback = isLowFeedback(feedback?.get(runKey(run)));
  const signalled = showSignals && isFlagged(signals.get(runKey(run)));
  return { lowFeedback, flagged: lowFeedback || signalled };
}

const bodyClassName = (blurred?: boolean) => cn("transition-[filter]", blurred && "blur-[1.5px]");

/** Devtool-dense runs list: one row per agent run, newest first. */
export function AgentTracesTable({
  traces,
  findings,
  feedback,
  canViewFindings = true,
  signals = NO_SIGNALS,
  showSignals = false,
  signalsColumn = showSignals,
  onSetUpSignals,
  isLoading,
  error,
  hasMore,
  isFetching = false,
  isPlaceholder,
  onRetry,
  onLoadMore,
  rangeEmpty = false,
  onSetUpTracing,
}: AgentTracesTableProps) {
  const settled = !isLoading && !error;
  const isEmpty = settled && !hasMore && traces.length === 0;
  const canContinue = settled && hasMore && !isPlaceholder;
  const autoContinue = canContinue && traces.length > 0;
  const { columnVisibility, onColumnVisibilityChange } = usePersistedColumnVisibility("lens-traces");
  const tableOptions: TableOptions<TraceSummary> = {
    data: traces,
    columns: RUN_COLUMNS.filter(
      (column) => (canViewFindings || column.id !== "findings") && (signalsColumn || column.id !== "signals"),
    ),
    defaultColumn: { size: undefined },
    getRowId: runKey,
    autoResetAll: false,
    state: { columnVisibility },
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
  };
  const table = useReactTable(tableOptions);
  return (
    <FindingsContext.Provider value={findings}>
      <FeedbackContext.Provider value={feedbackOrEmpty(feedback)}>
        <SignalsContext.Provider value={signals}>
          <SignalSetupContext.Provider value={{ configured: showSignals, onSetUp: onSetUpSignals }}>
            <InspectorTable.Root table={table} data-testid="runs-table">
              <InspectorTable.Grid aria-label="智能体运行" aria-busy={isFetching} className="min-w-[900px] text-xs">
                <InspectorTable.Header />
                <InspectorTable.Body<TraceSummary>
                  className={bodyClassName(isPlaceholder)}
                  rowHeight={() => ROW_HEIGHT}
                  after={
                    <>
                      {isLoading && SKELETON_ROWS.map((row) => <PlaceholderRow key={row} index={row} />)}
                      {autoContinue && <LoadMoreRows isFetching={isFetching} onLoadMore={onLoadMore} />}
                    </>
                  }
                >
                  {(row) => {
                    const { lowFeedback, flagged } = rowFlags(row.original, feedback, signals, showSignals);
                    return (
                      <InspectorTable.Row
                        row={row}
                        item={traceRefOf(row.original)}
                        data-testid="agent-trace-row"
                        data-flagged={flagged || undefined}
                        data-low-feedback={lowFeedback || undefined}
                        className={cn("h-9", flagged && FLAGGED_ROW)}
                      />
                    );
                  }}
                </InspectorTable.Body>
              </InspectorTable.Grid>
              {isLoading && (
                <p role="status" className="sr-only">
                  正在加载运行…
                </p>
              )}
              {error && (
                <div role="alert" className="flex items-center justify-center gap-3 py-6 text-xs text-muted-foreground">
                  <span>
                    {traces.length ? "无法加载更多运行" : "无法加载运行"}：{error.message}
                  </span>
                  {onRetry && (
                    <Button size="xs" variant="outline" disabled={isFetching} onClick={onRetry}>
                      重试
                    </Button>
                  )}
                </div>
              )}
              {canContinue && traces.length === 0 && (
                <div className="flex items-center justify-center gap-3 py-16 text-xs text-muted-foreground">
                  <span>已加载运行中无符合筛选条件的项。</span>
                  <Button size="xs" variant="outline" disabled={isFetching} onClick={onLoadMore}>
                    加载更早的运行
                  </Button>
                </div>
              )}
              {isEmpty && <EmptyRuns rangeEmpty={rangeEmpty} onSetUpTracing={onSetUpTracing} />}
            </InspectorTable.Root>
          </SignalSetupContext.Provider>
        </SignalsContext.Provider>
      </FeedbackContext.Provider>
    </FindingsContext.Provider>
  );
}
