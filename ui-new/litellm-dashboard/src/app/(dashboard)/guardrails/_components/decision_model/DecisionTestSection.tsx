"use client";

import React, { useRef, useState } from "react";
import { StatusBadge } from "@/components/shared/table_cells";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { decisionsTestCall } from "@/components/networking";
import type { DecisionModelCheckDraft } from "./buildDecisionModelParams";
import {
  buildDecisionTestBody,
  DECISION_TEST_CHIP_TONE,
  decisionTestChip,
  decisionTest总览,
  parseDecisionTestResponse,
  prependTestRun,
  runnableDecisionQuestions,
  runTestShortcutLabel,
  visibleTestResults,
  type DecisionTestRun,
} from "./decisionModelQuestion";

export interface DecisionTestSectionProps {
  accessToken: string | null;
  model: string;
  checks: DecisionModelCheckDraft[];
}

const DecisionTestSection: React.FC<DecisionTestSectionProps> = ({ accessToken, model, checks }) => {
  const [input, setInput] = useState("");
  const [runs, setRuns] = useState<DecisionTestRun[]>([]);
  const [running, setRunning] = useState(false);
  const nextRunId = useRef(1);
  const controllerRef = useRef<AbortController | null>(null);

  const runnableQuestions = runnableDecisionQuestions(checks);
  let disabledReason: string | null = null;
  if (!model) disabledReason = "选择决策模型以运行测试";
  else if (!input.trim()) disabledReason = "输入内容以运行测试";
  else if (runnableQuestions.length === 0) disabledReason = "添加问题以运行测试";
  const canRun = !disabledReason && !running;

  const runTest = async () => {
    if (!canRun) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const asked = Object.fromEntries(runnableQuestions.map((check) => [check.name, check.instructions]));
    const id = nextRunId.current++;
    setRunning(true);
    try {
      const data = await decisionsTestCall(
        accessToken ?? "",
        buildDecisionTestBody(model, input, checks),
        controller.signal,
      );
      const run: DecisionTestRun = {
        id,
        input,
        model,
        asked,
        results: parseDecisionTestResponse(data, Object.keys(asked)),
      };
      setRuns((prev) => prependTestRun(prev, run));
    } catch (error) {
      if (controller.signal.aborted) return;
      setRuns((prev) =>
        prependTestRun(prev, {
          id,
          input,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      if (controllerRef.current === controller) setRunning(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-1">
        <FieldLabel>测试</FieldLabel>
        <p className="m-0 text-xs text-muted-foreground">
          保存前用样例输入试跑问题，使用上方阈值。每次运行都会调用真实决策模型，会产生计费并出现在日志中。
        </p>
      </div>
      <Textarea
        aria-label="测试输入"
        rows={3}
        placeholder="粘贴样例输入以针对您的问题评分"
        className="w-full resize-none"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            runTest();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button type="button" onClick={runTest} disabled={!canRun}>
          {running ? "运行中…" : "运行测试"}
        </Button>
        {!running && disabledReason && <p className="m-0 text-xs text-muted-foreground">{disabledReason}</p>}
        {!running && !disabledReason && <p className="m-0 text-xs text-muted-foreground">{runTestShortcutLabel()}</p>}
      </div>
      {runs.length > 0 && (
        <>
          <p className="m-0 text-xs text-muted-foreground">最新结果在前，每条记录保留输入以便对比。</p>
          <div className="space-y-2" data-slot="decision-test-history">
            {runs.map((run) => {
              const visible = "error" in run ? [] : visibleTestResults(run, checks, model);
              return (
                <div key={run.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 min-w-0 truncate text-xs font-medium text-foreground" title={run.input}>
                      {run.input}
                    </p>
                    {visible.length > 0 && (
                      <StatusBadge
                        tone={DECISION_TEST_CHIP_TONE[decisionTest总览(visible)]}
                        label={decisionTest总览(visible) === "block" ? "阻止" : "通过"}
                      />
                    )}
                  </div>
                  {"error" in run && <p className="m-0 mt-1.5 text-xs text-destructive">{run.error}</p>}
                  {!("error" in run) && visible.length === 0 && (
                    <p className="m-0 mt-1.5 text-xs text-muted-foreground">
                      自此次运行后模型或问题已变更，请重新运行以重新评分。
                    </p>
                  )}
                  {visible.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {visible.map(({ check, result }) => {
                        const chip = decisionTestChip(result, check);
                        const score = result.kind === "probability" ? result.probability.toFixed(2) : "无回答";
                        let label = "";
                        if (chip === "block") label = "阻止";
                        else if (chip === "logged") label = "通过 · 已记录";
                        else if (chip === "pass") label = "通过";
                        return (
                          <StatusBadge
                            key={check.name}
                            tone={DECISION_TEST_CHIP_TONE[chip]}
                            label={label ? `${check.name} ${score} ${label}` : `${check.name} ${score}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default DecisionTestSection;
