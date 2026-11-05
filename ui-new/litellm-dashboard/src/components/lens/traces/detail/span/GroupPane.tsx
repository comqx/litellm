"use client";

import CopyButton from "@/components/shared/CopyButton";

import { useTraceApi } from "../../api";
import type { GroupRowData } from "../../tree";
import type { Trace } from "../../types";
import { fmtMs, fmtTok } from "../../utils";
import { errorHeadline } from "../content/SpanError";
import { PaneHeader } from "./PaneHeader";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/** ×N group: rollup of every invocation plus the first failure's message. */
export function GroupPane({
  trace,
  row,
  accessToken,
  onClose,
}: {
  trace: Trace;
  row: GroupRowData;
  accessToken: string;
  onClose: () => void;
}) {
  const tokens = row.members.reduce((sum, m) => sum + m.input_tokens + m.output_tokens, 0);
  const firstFailure = row.members.find((m) => m.status === "error" && m.error);
  const sample = (firstFailure ?? row.members[0]).span_id;
  const handoff = useTraceApi(accessToken).handoff(trace.summary.trace_id, sample, trace.summary.trace_ref);
  return (
    <aside className="flex h-full min-w-0 flex-col bg-background text-sm text-foreground" aria-label="分组详情">
      <PaneHeader
        type={row.type}
        model={row.members[0]?.model ?? null}
        failed={row.failedCount > 0}
        title={
          <>
            {row.name} <span className="font-normal text-muted-foreground">×{row.members.length}</span>
          </>
        }
        facts={[]}
        actions={
          <CopyButton variant="action" value={handoff.text} label="复制分组样本" copiedLabel={handoff.copied} />
        }
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-auto border-t px-4 py-4">
        <div className="grid grid-cols-2 gap-2 @[520px]/trace:grid-cols-3">
          <Metric label="调用次数" value={row.members.length.toLocaleString()} />
          <Metric label="失败" value={row.failedCount.toLocaleString()} />
          <Metric label="p50 延迟" value={fmtMs(row.p50Duration)} />
          <Metric label="Token" value={fmtTok(tokens)} />
          <Metric label="智能体" value={row.agent || "—"} />
          <Metric label="类型" value={row.type} />
        </div>
        {firstFailure?.error && (
          <section className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-3">
            <div className="text-sm font-semibold text-destructive">失败模式</div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-foreground">
              {errorHeadline(firstFailure.error)}
            </p>
          </section>
        )}
      </div>
    </aside>
  );
}
