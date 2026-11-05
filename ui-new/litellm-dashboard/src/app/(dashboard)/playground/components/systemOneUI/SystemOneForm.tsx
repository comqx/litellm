"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useId, useMemo, useState } from "react";
import { AddButton, FormFrame, RemoveButton } from "./DecisionFormControls";
import {
  blankQuestion,
  freeName,
  readForm,
  removeAt,
  renameKey,
  replaceAt,
  retype,
  withNoulCriterion,
  withoutKey,
  type ChoiceQuestion,
  type FormPayload,
  type FormQuestion,
  type NoulQuestion,
  type QuestionType,
  type ScoreQuestion,
} from "./lib/formPayload";
import type { SystemOnePayloadValidation } from "./lib/validatePayload";

const QUESTION_TYPES: readonly QuestionType[] = ["choice", "noul", "score"];
const TYPE_LABELS: Record<QuestionType, string> = { choice: "选择题", noul: "是 / 否", score: "评分" };
const TYPE_HELP: Record<QuestionType, string | undefined> = {
  choice: undefined,
  noul: "模型返回答案为「是」的概率",
  score: undefined,
};

const isQuestionType = (value: unknown): value is QuestionType => QUESTION_TYPES.some((type) => type === value);

interface SystemOneFormProps {
  value: string;
  onChange: (value: string) => void;
  validation: SystemOnePayloadValidation;
  onReset: () => void;
}

interface QuestionEditorProps<Q extends FormQuestion> {
  question: Q;
  onChange: (question: FormQuestion) => void;
}

interface KeyInputProps {
  value: string;
  taken: readonly string[];
  onCommit: (value: string) => void;
  label: string;
  placeholder?: string;
}

function keyError(next: string, current: string, taken: readonly string[]): string | undefined {
  if (next === "") {
    return "请输入名称";
  }
  if (next !== current && taken.includes(next)) {
    return `「${next}」已被使用`;
  }
  return undefined;
}

function KeyInput({ value, taken, onCommit, label, placeholder }: KeyInputProps) {
  const errorId = useId();
  const [draft, setDraft] = useState(value);
  const next = draft.trim();
  const error = keyError(next, value, taken);

  function commit() {
    if (error === undefined && next !== value) {
      onCommit(next);
      return;
    }
    setDraft(value);
  }

  return (
    <div className="grid min-w-0 flex-1 gap-1">
      <Input
        aria-label={label}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
      {error !== undefined && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ChoiceOptions({ question, onChange }: QuestionEditorProps<ChoiceQuestion>) {
  const labels = Object.keys(question.criteria);
  const writeCriteria = (criteria: Record<string, string>) => onChange({ ...question, criteria });

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">选项</span>
      {Object.entries(question.criteria).map(([label, description], index) => (
        <div key={index} className="flex items-start gap-2">
          <KeyInput
            key={label}
            label="选项标签"
            value={label}
            taken={labels}
            onCommit={(next) => writeCriteria(renameKey(question.criteria, label, next))}
          />
          <Input
            aria-label={`${label} 的描述`}
            className="flex-2"
            value={description}
            placeholder="可选描述"
            onChange={(event) => writeCriteria({ ...question.criteria, [label]: event.target.value })}
          />
          <RemoveButton
            label={`移除选项 ${label}`}
            onClick={() => writeCriteria(withoutKey(question.criteria, label))}
          />
        </div>
      ))}
      <AddButton onClick={() => writeCriteria({ ...question.criteria, [freeName(labels, "option")]: "" })}>
        添加选项
      </AddButton>
    </div>
  );
}

function NoulCriteria({ question, onChange }: QuestionEditorProps<NoulQuestion>) {
  const yesId = useId();
  const noId = useId();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor={yesId}>「是」表示</Label>
        <Input
          id={yesId}
          value={question.criteria?.true ?? ""}
          placeholder="可选"
          onChange={(event) => onChange(withNoulCriterion(question, "true", event.target.value))}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={noId}>「否」表示</Label>
        <Input
          id={noId}
          value={question.criteria?.false ?? ""}
          placeholder="可选"
          onChange={(event) => onChange(withNoulCriterion(question, "false", event.target.value))}
        />
      </div>
    </div>
  );
}

function ScoreLevels({ question, onChange }: QuestionEditorProps<ScoreQuestion>) {
  const writeCriteria = (criteria: string[]) => onChange({ ...question, criteria });

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">层级（从低到高）</span>
      {question.criteria.map((level, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{index}</span>
          <Input
            aria-label={`层级 ${index}`}
            value={level}
            placeholder="该分数的含义"
            onChange={(event) => writeCriteria(replaceAt(question.criteria, index, event.target.value))}
          />
          <RemoveButton
            label={`移除层级 ${index}`}
            onClick={() => writeCriteria(removeAt(question.criteria, index))}
          />
        </div>
      ))}
      <AddButton onClick={() => writeCriteria([...question.criteria, ""])}>添加层级</AddButton>
    </div>
  );
}

function CriteriaEditor({ question, onChange }: QuestionEditorProps<FormQuestion>) {
  switch (question.type) {
    case "choice":
      return <ChoiceOptions question={question} onChange={onChange} />;
    case "noul":
      return <NoulCriteria question={question} onChange={onChange} />;
    case "score":
      return <ScoreLevels question={question} onChange={onChange} />;
  }
}

interface QuestionCardProps extends QuestionEditorProps<FormQuestion> {
  name: string;
  taken: readonly string[];
  onRename: (name: string) => void;
  onRemove: () => void;
}

function QuestionCard({ name, question, taken, onChange, onRename, onRemove }: QuestionCardProps) {
  const instructionsId = useId();

  return (
    <fieldset aria-label={`问题 ${name}`} className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start gap-2">
        <KeyInput key={name} label="问题名称" value={name} taken={taken} onCommit={onRename} />
        <Select
          value={question.type}
          onValueChange={(type) => isQuestionType(type) && onChange(retype(question, type))}
        >
          <SelectTrigger className="w-36" aria-label="答案类型">
            <SelectValue>{TYPE_LABELS[question.type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type} title={TYPE_HELP[type]}>
                {TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RemoveButton label={`移除问题 ${name}`} onClick={onRemove} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={instructionsId}>说明</Label>
        <Textarea
          id={instructionsId}
          rows={2}
          value={question.instructions ?? ""}
          placeholder="模型应如何决策？"
          onChange={(event) => onChange({ ...question, instructions: event.target.value })}
        />
      </div>
      <CriteriaEditor question={question} onChange={onChange} />
    </fieldset>
  );
}

export default function SystemOneForm({ value, onChange, validation, onReset }: SystemOneFormProps) {
  const stateId = useId();
  const form = useMemo(() => readForm(value), [value]);

  if (form === undefined) {
    return (
      <FormFrame validation={validation}>
        <p className="text-sm text-muted-foreground">此请求结构无法用表单展示。</p>
        <Button variant="outline" className="w-fit" onClick={onReset}>
          重置为示例
        </Button>
      </FormFrame>
    );
  }

  const questions = form.questions ?? {};
  const names = Object.keys(questions);
  const write = (next: FormPayload) => onChange(JSON.stringify(next, null, 2));
  const writeQuestions = (next: Record<string, FormQuestion>) => write({ ...form, questions: next });

  return (
    <FormFrame validation={validation}>
      <div className="grid gap-1.5">
        <Label htmlFor={stateId}>输入</Label>
        <p className="text-xs text-muted-foreground">模型在作答前阅读的文本，例如工单或聊天消息。</p>
        <Textarea
          id={stateId}
          rows={4}
          value={form.state ?? ""}
          placeholder="粘贴模型需要决策的文本"
          onChange={(event) => write({ ...form, state: event.target.value })}
        />
      </div>
      {Object.entries(questions).map(([name, question], index) => (
        <QuestionCard
          key={index}
          name={name}
          question={question}
          taken={names}
          onChange={(next) => writeQuestions({ ...questions, [name]: next })}
          onRename={(next) => writeQuestions(renameKey(questions, name, next))}
          onRemove={() => writeQuestions(withoutKey(questions, name))}
        />
      ))}
      <AddButton onClick={() => writeQuestions({ ...questions, [freeName(names, "question")]: blankQuestion() })}>
        添加问题
      </AddButton>
    </FormFrame>
  );
}
