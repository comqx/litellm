import React from "react";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  classificationFrequency,
  withClassificationFrequency,
  effectiveClassifierType,
  usesLlmClassifier,
  DEFAULT_CLASSIFIER_TIMEOUT_MS,
  type ComplexityRouterConfigValue,
  type ClassificationFrequency,
} from "./ComplexityRouterConfig";
import { restrictedBy } from "./TierRestrictions";

export default function ClassifierPrimarySettings({
  value,
  onChange,
  modelOptions,
  showValidationErrors = false,
  section = "all",
}: {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
  showValidationErrors?: boolean;
  section?: "all" | "judge" | "frequency";
}) {
  const id = React.useId();
  const restriction = restrictedBy(value, "sessionAffinity");
  const frequency = classificationFrequency(value);
  const frequencyDescription = {
    every_request: "为每个请求重新选择 Model",
    user_turn: "当用户发送新消息时重新分类",
    session: "整个会话保持同一层级。需要客户端会话 ID",
  }[frequency];
  const usesJudge = usesLlmClassifier(effectiveClassifierType(value));
  const missingJudge = showValidationErrors && usesJudge && !value.classifier_llm_config?.model;
  return (
    <div
      className={
        {
          all: "mb-6 grid gap-4 sm:grid-cols-2",
          frequency: "mb-6 grid gap-4",
          judge: "grid gap-4",
        }[section]
      }
    >
      {section !== "judge" && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-frequency`}>分类频率</Label>
          <Select
            items={[
              { value: "every_request", label: "每个请求" },
              { value: "user_turn", label: "每条新用户消息" },
              { value: "session", label: "每个会话一次" },
            ]}
            value={frequency}
            onValueChange={(frequency) => {
              if (frequency) onChange(withClassificationFrequency(value, frequency as ClassificationFrequency));
            }}
          >
            <SelectTrigger id={`${id}-frequency`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="every_request">每个请求</SelectItem>
              <SelectItem value="user_turn">每条新用户消息</SelectItem>
              <SelectItem value="session" disabled={Boolean(restriction)}>
                Once per session
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{restriction?.reason ?? frequencyDescription}</p>
        </div>
      )}
      {section !== "frequency" && usesJudge && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-judge`}>评判模型</Label>
          <SearchSelect
            inputId={`${id}-judge`}
            aria-label="评判模型"
            options={modelOptions}
            value={value.classifier_llm_config?.model ?? ""}
            placeholder="选择评判模型"
            allowClear={false}
            className={missingJudge ? "border-destructive" : undefined}
            onValueChange={(model) => {
              if (!model || model === value.classifier_llm_config?.model) return;
              onChange({
                ...value,
                classifier_llm_config: {
                  ...value.classifier_llm_config,
                  model,
                  timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
                  reasoning_effort: undefined,
                },
              });
            }}
          />
          {missingJudge && (
            <p role="alert" className="text-xs text-destructive">
              必须选择评判模型
            </p>
          )}
        </div>
      )}
    </div>
  );
}
