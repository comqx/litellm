"use client";

import { Info, Plus, X } from "lucide-react";
import React from "react";
import { useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/molecules/logo/Logo";
import { getProviderLogoAndName } from "@/components/provider_info_helpers";
import { uiHref } from "@/utils/uiHref";
import { asText, GuardrailField, labelWithHint, requiredRule, type GuardrailFormControl } from "../GuardrailFormField";
import { duplicateDecisionCheckNames, type DecisionModelCheckDraft } from "./buildDecisionModelParams";
import DecisionTestSection from "./DecisionTestSection";
import { newDecisionCheckDraft, type DecisionModelOption } from "./decisionModelQuestion";

export interface DecisionModelFieldsProps {
  accessToken: string | null;
  providerFilter: string | null;
  onModelChange: () => void;
  decisionModels: DecisionModelOption[];
  checks: DecisionModelCheckDraft[];
  onChecksChange: (checks: DecisionModelCheckDraft[]) => void;
  control: GuardrailFormControl;
}

const ACTION_ITEMS = [
  { label: "阻止", value: "block" },
  { label: "仅记录", value: "log" },
];

const ProviderLogo: React.FC<{ provider: string }> = ({ provider }) => (
  <Logo provider={provider} label={getProviderLogoAndName(provider).displayName} className="size-4 shrink-0" />
);

const NoDecisionModels: React.FC<{ providerFilter: string | null }> = ({ providerFilter }) => {
  const source = providerFilter ? `（${getProviderLogoAndName(providerFilter).displayName}）` : "";
  return (
    <Alert variant="info" role="note" aria-label="尚无决策模型">
      <Info />
      <AlertTitle>尚无决策模型</AlertTitle>
      <AlertDescription>
        <p>
          请先添加决策模型{source}才能使用此护栏。模型的 mode 为 evaluation 后会出现在此列表。{" "}
          <a href={uiHref("models-and-endpoints")} target="_blank" rel="noopener noreferrer">
            添加模型
          </a>
        </p>
      </AlertDescription>
    </Alert>
  );
};

const ThresholdSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  "aria-label": string;
}> = ({ value, onChange, "aria-label": ariaLabel }) => (
  <div className="flex items-center gap-2">
    <Slider
      aria-label={ariaLabel}
      min={0}
      max={1}
      step={0.01}
      value={[value]}
      onValueChange={(next) => onChange(Array.isArray(next) ? next[0] ?? 0 : next)}
      className="min-w-[120px] flex-1 **:data-[slot=slider-track]:bg-muted-foreground/25"
    />
    <span className="w-9 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
      {value.toFixed(2)}
    </span>
  </div>
);

const DecisionModelFields: React.FC<DecisionModelFieldsProps> = ({
  accessToken,
  providerFilter,
  onModelChange,
  decisionModels,
  checks,
  onChecksChange,
  control,
}) => {
  const selectedModel = asText(useWatch({ control, name: "decision_model" }));
  const duplicateNames = duplicateDecisionCheckNames(checks);
  const providerByModel = new Map(decisionModels.map((option) => [option.model, option.provider]));

  const updateCheck = (id: string, patch: Partial<DecisionModelCheckDraft>) =>
    onChecksChange(checks.map((check) => (check.id === id ? { ...check, ...patch } : check)));

  const addCheck = () => onChecksChange([...checks, newDecisionCheckDraft(checks)]);

  const removeCheck = (id: string) => onChecksChange(checks.filter((check) => check.id !== id));

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-success/20 bg-success/10 px-3.5 py-2.5 text-[13px] text-success">
        <strong>决策模型</strong>会对每个请求（pre_call、during_call）或响应（post_call）回答是/否问题。当某问题的概率达到阈值时会阻止调用；若动作设为「仅记录」则只写入日志。
      </div>

      <GuardrailField
        control={control}
        name="decision_model"
        label={labelWithHint(
          "决策模型",
          "本 Proxy 上的 decisions API 模型，例如 typesafe/jev-latest，会对下方每个问题打分。",
        )}
        rules={requiredRule("选择决策模型")}
      >
        {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
          <Combobox
            items={decisionModels.map((option) => option.model)}
            value={asText(value) || null}
            onValueChange={(next: string | null) => {
              onChange(next);
              onModelChange();
            }}
          >
            <ComboboxInput
              id={id}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              placeholder={decisionModels.length > 0 ? "选择决策模型" : "尚无决策模型"}
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxEmpty>没有匹配的模型</ComboboxEmpty>
              <ComboboxList>
                {(model: string) => {
                  const provider = providerByModel.get(model);
                  return (
                    <ComboboxItem key={model} value={model} title={model}>
                      <span className="flex items-center gap-2">
                        {provider && <ProviderLogo provider={provider} />}
                        {model}
                      </span>
                    </ComboboxItem>
                  );
                }}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      </GuardrailField>

      {decisionModels.length === 0 && <NoDecisionModels providerFilter={providerFilter} />}

      <Field>
        <FieldLabel>问题</FieldLabel>
        <p className="m-0 text-xs text-muted-foreground">
          决策模型针对文本回答的是/否问题。「阻止」在分数达到阈值时终止调用；「仅记录」只写入日志。
        </p>
        {checks.map((check, index) => {
          const position = index + 1;
          return (
            <div key={check.id} className="relative space-y-3 rounded-lg border border-border bg-muted p-4">
              <button
                type="button"
                onClick={() => removeCheck(check.id)}
                aria-label={`移除问题 ${position}`}
                className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-4" />
              </button>
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">名称</span>
                <Input
                  aria-label={`问题 ${position} 名称`}
                  placeholder="名称（如 invoice_policy）"
                  className="bg-background"
                  value={check.name}
                  onChange={(event) => updateCheck(check.id, { name: event.target.value })}
                />
                {duplicateNames.has(check.name.trim()) && (
                  <p className="m-0 mt-1 text-xs text-destructive">已有其他问题使用此名称</p>
                )}
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">问题</span>
                <Textarea
                  aria-label={`问题 ${position}`}
                  rows={2}
                  placeholder="决策模型要回答的问题，例如：文本是否在询问发票？"
                  className="w-full resize-none bg-background"
                  value={check.instructions}
                  onChange={(event) => updateCheck(check.id, { instructions: event.target.value })}
                />
              </div>
              <div className="flex items-end gap-6">
                <div className="w-32">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">动作</span>
                  <Select
                    items={ACTION_ITEMS}
                    value={check.action}
                    onValueChange={(next: string | null) =>
                      next && updateCheck(check.id, { action: next as "block" | "log" })
                    }
                  >
                    <SelectTrigger className="w-full bg-background" aria-label={`问题 ${position} 动作`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-56">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">阈值</span>
                  <div className="flex h-9 items-center">
                    <ThresholdSlider
                      aria-label={`问题 ${position} 阈值`}
                      value={check.threshold}
                      onChange={(next) => updateCheck(check.id, { threshold: next })}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div>
          <Button variant="outline" size="sm" onClick={addCheck}>
            <Plus className="size-3" />
            添加问题
          </Button>
        </div>
      </Field>

      <DecisionTestSection accessToken={accessToken} model={selectedModel} checks={checks} />
    </div>
  );
};

export default DecisionModelFields;
