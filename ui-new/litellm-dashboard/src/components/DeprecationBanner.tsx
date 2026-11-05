"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";

const DEPRECATION_DISCUSSION_URL = "https://github.com/BerriAI/litellm/discussions/32090";
const DEPRECATION_TARGET_DATE = "2026 年 9 月 1 日";

interface DeprecationBannerProps {
  featureName: string;
}

export const DeprecationBanner: React.FC<DeprecationBannerProps> = ({ featureName }) => {
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{`${featureName}已列入拟弃用清单`}</p>
        <p className="mt-1 break-words text-muted-foreground">
          {`${featureName}是我们考虑移除的实验性功能之一，最早可能于 ${DEPRECATION_TARGET_DATE} 移除。此清单为草案，尚未最终确定。如果你正在使用此功能，请在 `}
          <Link
            href={DEPRECATION_DISCUSSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            弃用讨论
          </Link>
          {" 中反馈意见。"}
        </p>
      </div>
      <button
        type="button"
        aria-label="关闭"
        onClick={() => setIsClosed(true)}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};
