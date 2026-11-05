"use client";

import { analysisElapsed } from "../../model/progress";
import type { Job } from "../../model/types";

export function ScanDuration({ job }: { job: Job }) {
  if (!job.finished_at) return null;
  return (
    <span title="总耗时，含等待分析器的时间">
      {" · Took "}
      {analysisElapsed(job.created_at, Date.parse(job.finished_at))}
    </span>
  );
}
