"use client";

import { ArrowUpRight, SearchX, TriangleAlert } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { StateMessage } from "@/components/shared/StateMessage";
import { Button, buttonVariants } from "@/components/ui/button";

import { ApiError } from "@/lib/http/client";

const DOCS_URL = "https://docs.litellm.ai/docs/proxy/lens";

function DocsLink() {
  return (
    <a
      href={DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      Lens 文档
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </a>
  );
}

function loadFailureMessage(queryError: unknown, unavailable: boolean): string {
  if (unavailable)
    return "此控制台可能比代理更新。请刷新页面，若仍失败请检查代理部署。";
  if (queryError instanceof Error) return queryError.message;
  return "联系代理时出错。";
}

export function InvestigationsLoadFailed({ queryError, refresh }: { queryError: unknown; refresh: () => void }) {
  const unavailable = queryError instanceof ApiError && queryError.status === 404;
  return (
    <StateMessage
      role="alert"
      tone="destructive"
      icon={<TriangleAlert className="size-5" />}
      title={unavailable ? "Lens API 不可用" : "无法加载调查"}
      description={loadFailureMessage(queryError, unavailable)}
    >
      <Button size="sm" onClick={() => (unavailable ? window.location.reload() : refresh())}>
        {unavailable ? "刷新页面" : "重试"}
      </Button>
      <DocsLink />
    </StateMessage>
  );
}

export function InvestigationError({ message, refresh }: { message: string; refresh: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <span className="min-w-0">{message}</span>
      <Button variant="ghost" size="sm" onClick={refresh}>
        重试
      </Button>
    </div>
  );
}

export function InvestigationsLoading() {
  return (
    <LoadingState
      title="正在加载调查…"
      description="正在获取调查及最新发现。"
    />
  );
}

export function InvestigationMissing({ selectLens }: { selectLens: (id: string | null) => void }) {
  return (
    <StateMessage
      role="alert"
      icon={<SearchX className="size-5" />}
      title="未找到调查"
      description="可能已删除，或链接指向其他代理。"
    >
      <Button size="sm" onClick={() => selectLens(null)}>
        查看全部调查
      </Button>
    </StateMessage>
  );
}
