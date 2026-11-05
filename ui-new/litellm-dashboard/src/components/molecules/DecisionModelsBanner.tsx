import React, { useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

import { DECISIONS_DOCS_URL, DECISIONS_PROVIDERS_DOCS_URL, SYSTEM_ONE_PLAYGROUND_ROUTE } from "@/lib/decisionModels";
import { uiHref } from "@/utils/uiHref";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hideDecisionModelsBanner";

const DecisionModelsBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  if (dismissed) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-4 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background">
        <Sparkles className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="m-0 text-sm font-semibold text-foreground">现已支持决策模型</h4>
        <p className="m-0 mt-0.5 text-xs text-muted-foreground">
          通过 <code>/v1/decisions</code> 或 <code>/v1/systemone</code> 调用，或在决策模型调试台中试用。{" "}
          <a href={DECISIONS_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
            如何调用
          </a>
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0"
        nativeButton={false}
        role="link"
        render={<a href={DECISIONS_PROVIDERS_DOCS_URL} target="_blank" rel="noopener noreferrer" />}
      >
        支持的供应商
      </Button>
      <Button
        className="shrink-0"
        nativeButton={false}
        role="link"
        render={<a href={uiHref(SYSTEM_ONE_PLAYGROUND_ROUTE)} />}
      >
        试用决策模型
        <ArrowRight />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(STORAGE_KEY, "true");
        }}
        className="shrink-0"
        aria-label="关闭横幅"
      >
        <X />
      </Button>
    </div>
  );
};

export default DecisionModelsBanner;
