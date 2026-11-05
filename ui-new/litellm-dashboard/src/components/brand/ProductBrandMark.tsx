"use client";

import { useId } from "react";

import { cn } from "@/lib/cva.config";

type ProductBrandMarkProps = {
  className?: string;
  tone?: "onDark" | "onLight";
};

export function ProductBrandMark({ className, tone = "onDark" }: ProductBrandMarkProps) {
  const frameStroke = tone === "onLight" ? "rgb(15 23 42 / 0.28)" : "rgb(255 255 255 / 0.38)";
  const rawId = useId();
  const gid = rawId.replaceAll(":", "");

  return (
    <svg className={cn("shrink-0", className)} viewBox="0 0 36 36" aria-hidden>
      <defs>
        <linearGradient id={`${gid}-g`} x1="8" y1="6" x2="28" y2="30">
          <stop stopColor="#2EE0F0" />
          <stop offset="1" stopColor="#14C48A" />
        </linearGradient>
      </defs>
      <polygon
        points="18,2.4 31.6,10.2 31.6,25.8 18,33.6 4.4,25.8 4.4,10.2"
        fill="none"
        stroke={frameStroke}
        strokeWidth="1.2"
      />
      <path
        d="M11.2 16.2 A 6.8 6.8 0 0 1 24.8 16.2"
        fill="none"
        stroke={`url(#${gid}-g)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect
        x="12.2"
        y="16.8"
        width="11.6"
        height="11.6"
        rx="2.6"
        fill="none"
        stroke={`url(#${gid}-g)`}
        strokeWidth="2.2"
      />
      <path
        d="M14.8 20.2h6.4M14.8 24.8h6.4"
        fill="none"
        stroke={`url(#${gid}-g)`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="13.8" r="1.35" fill={`url(#${gid}-g)`} />
    </svg>
  );
}
