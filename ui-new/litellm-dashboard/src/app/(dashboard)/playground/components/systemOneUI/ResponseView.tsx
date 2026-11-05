import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { SystemOneAnswer, SystemOneResponse } from "./lib/schemas";
import type { OpenAIDecisionsResponse } from "./lib/openAIDecisions";

const SCORE_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

interface ResponseViewProps {
  response?: SystemOneResponse | OpenAIDecisionsResponse;
  view?: "form" | "curl";
  fallbackModel?: string;
  latencyMs?: number;
  error?: string;
  isLoading: boolean;
}

function ProbabilityMeter({
  label,
  probability,
  selected = false,
}: {
  label: string;
  probability: number;
  selected?: boolean;
}) {
  const percentage = Math.round(probability * 100);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={selected ? "font-semibold" : "text-muted-foreground"}>{label}</span>
        <span className={selected ? "font-semibold tabular-nums" : "tabular-nums"}>{percentage}%</span>
      </div>
      <div
        role="meter"
        aria-label={`${label} 概率`}
        aria-valuenow={percentage}
        aria-valuetext={selected ? `${percentage}%，已选中` : `${percentage}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${selected ? "bg-primary" : "bg-primary/40"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AnswerDetails({ answer }: { answer: SystemOneAnswer }) {
  if (answer.type === "noul") {
    const percentage = Math.round(answer.noul * 100);
    return (
      <div className="grid gap-3">
        <p className="text-sm font-medium">{percentage}% 是</p>
        <ProbabilityMeter label="是" probability={answer.noul} />
      </div>
    );
  }

  if (answer.type === "choice") {
    const options = Object.entries(answer.probabilities).sort(([, first], [, second]) => second - first);
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">所选选项</span>
          <Badge>{answer.choice}</Badge>
          {answer.confidence !== undefined && (
            <Badge variant="outline">{Math.round(answer.confidence * 100)}% 置信度</Badge>
          )}
        </div>
        <div className="grid gap-3">
          {options.map(([label, probability]) => (
            <ProbabilityMeter key={label} label={label} probability={probability} selected={label === answer.choice} />
          ))}
        </div>
      </div>
    );
  }

  const levels = Object.entries(answer.probabilities).sort(([first], [second]) => Number(first) - Number(second));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">分数</span>
        <Badge>{SCORE_FORMAT.format(answer.score)}</Badge>
        {answer.confidence !== undefined && (
          <Badge variant="outline">{Math.round(answer.confidence * 100)}% 置信度</Badge>
        )}
      </div>
      <div className="grid gap-3">
        {levels.map(([level, probability]) => {
          const description = answer.legend?.[level];
          const label =
            description === undefined
              ? level
              : `${level}: ${typeof description === "string" ? description : JSON.stringify(description)}`;
          return (
            <ProbabilityMeter
              key={level}
              label={label}
              probability={probability}
              selected={Number(level) === Math.round(answer.score)}
            />
          );
        })}
      </div>
    </div>
  );
}

function OpenAIAnswerDetails({ answer }: { answer: OpenAIDecisionsResponse["answers"][number] }) {
  switch (answer.type) {
    case "refusal":
      return <p className="text-sm text-muted-foreground">模型拒绝回答</p>;
    case "predicate":
      return <AnswerDetails answer={{ type: "noul", noul: answer.probability }} />;
    case "choice":
      return (
        <AnswerDetails
          answer={{
            type: "choice",
            choice: String(answer.choice),
            confidence: answer.confidence,
            probabilities: Object.fromEntries(
              answer.probabilities.map(({ value, probability }) => [String(value), probability]),
            ),
          }}
        />
      );
    case "score":
      return (
        <AnswerDetails
          answer={{
            type: "score",
            score: answer.score,
            confidence: answer.confidence,
            probabilities: Object.fromEntries(
              answer.probabilities.map(({ value, probability }) => [String(value), probability]),
            ),
            legend: Object.fromEntries(answer.probabilities.map(({ value, label }) => [String(value), label])),
          }}
        />
      );
  }
}

function RawResponse({ response }: { response: NonNullable<ResponseViewProps["response"]> }) {
  return (
    <section aria-label="决策模型响应 JSON">
      <pre className="whitespace-pre-wrap wrap-anywhere rounded-md bg-muted p-3 font-mono text-xs">
        {JSON.stringify(response, null, 2)}
      </pre>
    </section>
  );
}

function AnswerCards({ answers }: { answers: SystemOneResponse["answers"] | OpenAIDecisionsResponse["answers"] }) {
  const cards = Array.isArray(answers)
    ? answers.map((answer, index) => ({
        id: index,
        name: answer.name ?? `问题 ${index + 1}`,
        type: answer.type,
        details: <OpenAIAnswerDetails answer={answer} />,
      }))
    : Object.entries(answers).map(([id, answer]) => ({
        id,
        name: id,
        type: answer.type,
        details: <AnswerDetails answer={answer} />,
      }));
  return cards.map(({ id, name, type, details }) => (
    <Card key={id} size="sm">
      <CardHeader>
        <CardTitle className="font-mono">{name}</CardTitle>
        <CardAction>
          <Badge variant="secondary">{type}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>{details}</CardContent>
    </Card>
  ));
}

export default function ResponseView({
  response,
  view = "form",
  fallbackModel,
  latencyMs,
  error,
  isLoading,
}: ResponseViewProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          正在计算校准概率…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>决策模型请求失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!response) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>校准概率</CardTitle>
          <CardDescription>发送请求后可查看决策答案与概率。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const model = response.model ?? fallbackModel;

  return (
    <Card className="wrap-anywhere">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>{view === "curl" ? "响应 JSON" : "校准概率"}</CardTitle>
            {model && <CardDescription>{model}</CardDescription>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {latencyMs !== undefined && <Badge variant="outline">{Math.round(latencyMs)} ms</Badge>}
            {response.usage && (
              <Badge variant="outline">
                {response.usage.input_tokens} 输入 / {response.usage.output_tokens} 输出 tokens
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {view === "curl" ? <RawResponse response={response} /> : <AnswerCards answers={response.answers} />}
        {view === "form" && (
          <Collapsible open={showRaw} onOpenChange={setShowRaw}>
            <CollapsibleTrigger
              render={
                <Button variant="ghost" size="sm">
                  <ChevronDown className="size-4" />
                  原始响应
                </Button>
              }
            />
            <CollapsibleContent>
              <RawResponse response={response} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
