"use client";

import { type ReactNode } from "react";
import { Activity, Aperture, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/shared/StatusDot";
import { WorkerSettings } from "./worker/WorkerSettings";
import { SignalSettings } from "./signals/SignalSettings";
import { SettingsCard, SettingsSection } from "./SettingsSection";
import type { LensList } from "../model/types";

const TRACING_DOCS = "https://docs.litellm.ai/docs/proxy/lens";

function TracingSection({ enabled, onOpenTraces }: { enabled: boolean; onOpenTraces: () => void }) {
  return (
    <SettingsSection heading="追踪" description="智能体将运行发送到此地址，供 Lens 读取。">
      <SettingsCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <Aperture aria-hidden="true" className="size-4 text-muted-foreground" />
          <span role="status" className="inline-flex items-center gap-2">
            <StatusDot state={enabled ? "ok" : "off"} />
            {enabled ? "已启用追踪" : "未启用追踪"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={TRACING_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Docs
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
          <Button variant="outline" size="sm" onClick={onOpenTraces}>
            {enabled ? "连接智能体" : "启用追踪"}
          </Button>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

export function LensSettings({
  list,
  workerReadyAction,
  onOpenTraces,
}: {
  list: LensList;
  /** Replaces the worker install card's Done button once the new worker connects. */
  workerReadyAction?: ReactNode;
  onOpenTraces: () => void;
}) {
  return (
    <div aria-label="设置" role="region" className="flex w-full flex-col divide-y divide-border">
      <TracingSection enabled={list.tracing_enabled} onOpenTraces={onOpenTraces} />
      <SignalSettings />
      <SettingsSection
        heading="分析工作节点"
        description="在你的服务器上运行调查，并将模型用量计入分析密钥。"
      >
        <WorkerSettings workers={list.workers} readyAction={workerReadyAction} />
      </SettingsSection>
    </div>
  );
}
