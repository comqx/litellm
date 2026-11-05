"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useId, useMemo } from "react";
import { AddButton, FormFrame, RemoveButton } from "./DecisionFormControls";
import { freeName, removeAt, replaceAt } from "./lib/formPayload";
import {
  readDecisionsForm,
  retypeDecisionQuestion,
  type DecisionsFormPayload,
  type DecisionsFormQuestion,
  type DecisionsQuestionType,
} from "./lib/openAIDecisionsForm";
import type { OpenAIDecisionsRequest } from "./lib/openAIDecisions";
import type { PayloadValidation } from "./lib/validatePayload";

const QUESTION_TYPES: readonly DecisionsQuestionType[] = ["predicate", "choice", "score"];
const TYPE_LABELS = { predicate: "谓词", choice: "选择题", score: "评分" };

interface QuestionEditorProps<Q extends DecisionsFormQuestion = DecisionsFormQuestion> {
  question: Q;
  onChange: (question: DecisionsFormQuestion) => void;
}

function Choices({ question, onChange }: QuestionEditorProps<Extract<DecisionsFormQuestion, { type: "choice" }>>) {
  const choices = question.choices ?? [];
  const write = (next: typeof choices) => onChange({ ...question, choices: next });

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">选项</span>
      {choices.map((choice, index) => (
        <div key={index} className="grid gap-2 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <Select
              value={typeof choice.value === "string" ? "text" : String(choice.value)}
              onValueChange={(type) => {
                if (type === "text" || type === "true" || type === "false") {
                  const value = type === "text" ? String(choice.value) : type === "true";
                  write(replaceAt(choices, index, { ...choice, value }));
                }
              }}
            >
              <SelectTrigger className="w-40" aria-label={`选项 ${index + 1} 值类型`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">文本</SelectItem>
                <SelectItem value="true">true（布尔）</SelectItem>
                <SelectItem value="false">false（布尔）</SelectItem>
              </SelectContent>
            </Select>
            {typeof choice.value === "string" && (
              <Input
                aria-label={`选项 ${index + 1} 值`}
                value={choice.value}
                onChange={(event) => write(replaceAt(choices, index, { ...choice, value: event.target.value }))}
              />
            )}
            <RemoveButton label={`移除选项 ${index + 1}`} onClick={() => write(removeAt(choices, index))} />
          </div>
          <Input
            aria-label={`选项 ${index + 1} 描述`}
            value={choice.description ?? ""}
            placeholder="可选描述"
            onChange={(event) => write(replaceAt(choices, index, { ...choice, description: event.target.value }))}
          />
        </div>
      ))}
      <AddButton
        onClick={() =>
          write([
            ...choices,
            {
              value: freeName(
                choices.map((c) => String(c.value)),
                "option",
              ),
            },
          ])
        }
      >
        添加选项
      </AddButton>
    </div>
  );
}

function Levels({ question, onChange }: QuestionEditorProps<Extract<DecisionsFormQuestion, { type: "score" }>>) {
  const levels = question.levels ?? [];
  const write = (next: typeof levels) => onChange({ ...question, levels: next });

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">层级（从低到高）</span>
      {levels.map((level, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`层级 ${index + 1} 标签`}
            value={level.label}
            placeholder="标签"
            onChange={(event) => write(replaceAt(levels, index, { ...level, label: event.target.value }))}
          />
          <Input
            aria-label={`层级 ${index + 1} 描述`}
            value={level.description ?? ""}
            placeholder="可选描述"
            onChange={(event) => write(replaceAt(levels, index, { ...level, description: event.target.value }))}
          />
          <RemoveButton label={`移除层级 ${index + 1}`} onClick={() => write(removeAt(levels, index))} />
        </div>
      ))}
      <AddButton onClick={() => write([...levels, { label: String(levels.length) }])}>添加层级</AddButton>
    </div>
  );
}

interface QuestionCardProps extends QuestionEditorProps {
  index: number;
  onRemove: () => void;
}

function QuestionCard({ question, index, onChange, onRemove }: QuestionCardProps) {
  const instructionsId = useId();

  return (
    <fieldset aria-label={`问题 ${index + 1}`} className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="问题名称"
          className="min-w-0 flex-1"
          value={question.name ?? ""}
          placeholder="可选问题名称"
          onChange={(event) => onChange({ ...question, name: event.target.value })}
        />
        <Select
          value={question.type}
          onValueChange={(type) => {
            const next = QUESTION_TYPES.find((value) => value === type);
            if (next) onChange(retypeDecisionQuestion(question, next));
          }}
        >
          <SelectTrigger className="w-36" aria-label="答案类型">
            <SelectValue>{TYPE_LABELS[question.type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RemoveButton label={`移除问题 ${index + 1}`} onClick={onRemove} />
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
      {question.type === "choice" && <Choices question={question} onChange={onChange} />}
      {question.type === "score" && <Levels question={question} onChange={onChange} />}
    </fieldset>
  );
}

interface OpenAIDecisionsFormProps {
  value: string;
  onChange: (value: string) => void;
  validation: PayloadValidation<OpenAIDecisionsRequest>;
  onReset: () => void;
}

export default function OpenAIDecisionsForm({ value, onChange, validation, onReset }: OpenAIDecisionsFormProps) {
  const inputId = useId();
  const safetyId = useId();
  const form = useMemo(() => readDecisionsForm(value), [value]);

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

  const questions = form.questions ?? [];
  const write = (next: DecisionsFormPayload) => onChange(JSON.stringify(next, null, 2));
  const writeQuestions = (next: DecisionsFormQuestion[]) => write({ ...form, questions: next });

  return (
    <FormFrame validation={validation}>
      <div className="grid gap-1.5">
        {Array.isArray(form.input) ? (
          <>
            <p className="text-sm text-muted-foreground">输入包含 messages。表单编辑不会改动它们。</p>
          </>
        ) : (
          <>
            <Label htmlFor={inputId}>输入</Label>
            <Textarea
              id={inputId}
              rows={4}
              value={form.input ?? ""}
              placeholder="粘贴模型需要决策的文本"
              onChange={(event) => write({ ...form, input: event.target.value })}
            />
          </>
        )}
      </div>
      {questions.map((question, index) => (
        <QuestionCard
          key={index}
          index={index}
          question={question}
          onChange={(next) => writeQuestions(replaceAt(questions, index, next))}
          onRemove={() => writeQuestions(removeAt(questions, index))}
        />
      ))}
      <AddButton
        onClick={() =>
          writeQuestions([
            ...questions,
            {
              type: "predicate",
              name: freeName(
                questions.map((q) => q.name ?? ""),
                "question",
              ),
              instructions: "",
            },
          ])
        }
      >
        添加问题
      </AddButton>
      <div className="grid gap-1.5">
        <Label htmlFor={safetyId}>安全标识符</Label>
        <Input
          id={safetyId}
          value={form.safety_identifier ?? ""}
          placeholder="可选"
          onChange={(event) => write({ ...form, safety_identifier: event.target.value || undefined })}
        />
      </div>
    </FormFrame>
  );
}
