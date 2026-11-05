"use client";

import React, { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/lib/forms/useZodForm";
import {
  GROUP_NAME_MAX_LENGTH,
  STRATEGIES_WITH_ARGS,
  argsForStrategy,
  buildRoutingGroupPayload,
  prioritiesForModels,
  toRoutingGroupFormValues,
} from "./routingGroupPayload";
import type { RoutingGroup } from "./types";
import { modelConflictError } from "./modelOwnership";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { routingStrategyDescriptionZh } from "./routingStrategyDescriptionZh";

interface RoutingGroupModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValue: RoutingGroup | null;
  availableStrategies: string[];
  strategyDescriptions: Record<string, string>;
  modelOptions: string[];
  existingGroupNames: string[];
  groupNameByModel: Record<string, string>;
  onClose: () => void;
  onSubmit: (group: RoutingGroup) => Promise<void> | void;
  saving?: boolean;
}

const ARGS_EXAMPLES: Record<string, string> = {
  "latency-based-routing": '示例：{ "ttl": 3600, "lowest_latency_buffer": 0 }',
};

const RoutingGroupModal: React.FC<RoutingGroupModalProps> = ({
  open,
  mode,
  initialValue,
  availableStrategies,
  strategyDescriptions,
  modelOptions,
  existingGroupNames,
  groupNameByModel,
  onClose,
  onSubmit,
  saving,
}) => {
  const modelsAnchor = useComboboxAnchor();
  const selectableStrategies =
    mode === "edit" && initialValue
      ? Array.from(new Set([...availableStrategies, initialValue.routing_strategy]))
      : availableStrategies;
  const strategyItems = selectableStrategies.map((strategy) => ({
    label: strategy === "priority" ? "优先级" : strategy,
    value: strategy,
  }));

  const reservedNames = useMemo(() => {
    const others = existingGroupNames.filter((n) => n !== initialValue?.group_name);
    return new Set(others.map((n) => n.toLowerCase()));
  }, [existingGroupNames, initialValue]);

  const schema = useMemo(() => {
    const shape = {
      group_name: z
        .string()
        .trim()
        .min(1, "组名必填")
        .max(GROUP_NAME_MAX_LENGTH, `最多 ${GROUP_NAME_MAX_LENGTH} 个字符`)
        .refine((value) => !reservedNames.has(value.toLowerCase()), "已存在同名组"),
      models: z.array(z.string()).min(1, "请至少选择一个模型"),
      routing_strategy: z.string().min(1, "请选择策略"),
      routing_strategy_args: z.string(),
      model_priorities: z.array(z.object({ model: z.string(), priority: z.string() })),
    };
    return z.object(shape).superRefine((values, ctx) => {
      if (values.routing_strategy === "priority") return;
      const conflict = modelConflictError(values.models, groupNameByModel);
      if (conflict !== null) {
        ctx.addIssue({ code: "custom", message: conflict, path: ["models"] });
      }
    });
  }, [reservedNames, groupNameByModel]);

  const form = useZodForm(schema, { defaultValues: toRoutingGroupFormValues(initialValue, availableStrategies) });

  useEffect(() => {
    form.reset(toRoutingGroupFormValues(initialValue, availableStrategies));
  }, [open, initialValue, availableStrategies, form]);

  const selectedStrategy = useWatch({ control: form.control, name: "routing_strategy" });
  const selectedModels = useWatch({ control: form.control, name: "models" });

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    const payload = buildRoutingGroupPayload(values);
    if (!payload.ok) {
      form.setError(payload.field, { message: payload.message });
      return;
    }
    await onSubmit(payload.group);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "创建路由组" : `编辑 ${initialValue?.group_name ?? ""}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <FieldGroup>
            <FormField
              control={form.control}
              name="group_name"
              label="组名"
              description="在 API 调用中作为 model 使用此名称，LiteLLM 会路由到组内某一模型。"
            >
              {({ ref, ...field }) => <Input {...field} ref={ref} placeholder="fast-chat" disabled={mode === "edit"} />}
            </FormField>

            <FormField
              control={form.control}
              name="models"
              label="模型"
              description={
                selectedStrategy === "priority"
                  ? "从模型列表中选择本组路由的模型；同一模型可属于多个 priority 组。"
                  : "从模型列表中选择本组路由的模型；非 priority 组中每个模型只能属于一个组。"
              }
            >
              {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                <Combobox
                  multiple
                  items={modelOptions}
                  value={value}
                  onValueChange={(models: string[]) => {
                    onChange(models);
                    form.setValue("model_priorities", prioritiesForModels(models, form.getValues("model_priorities")));
                  }}
                >
                  <ComboboxChips render={<div ref={modelsAnchor} />}>
                    <ComboboxValue>
                      {(selected: string[]) => (
                        <>
                          {selected.map((model) => (
                            <ComboboxChip key={model} aria-label={model}>
                              {model}
                            </ComboboxChip>
                          ))}
                          <ComboboxChipsInput
                            id={id}
                            aria-invalid={ariaInvalid}
                            aria-describedby={ariaDescribedBy}
                            placeholder="选择模型"
                          />
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={modelsAnchor}>
                    <ComboboxEmpty>未找到模型</ComboboxEmpty>
                    <ComboboxList>
                      {(model: string) => (
                        <ComboboxItem key={model} value={model}>
                          {model}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </FormField>

            <FormField
              control={form.control}
              name="routing_strategy"
              label="策略"
              description={
                selectedStrategy === "priority"
                  ? "数字越小越优先尝试；相同优先级共享流量。仅在使用本组名称调用时生效。"
                  : routingStrategyDescriptionZh(selectedStrategy, strategyDescriptions[selectedStrategy])
              }
            >
              {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                <Select
                  items={strategyItems}
                  value={value}
                  onValueChange={(next: string | null) => {
                    onChange(next ?? "");
                    form.setValue(
                      "routing_strategy_args",
                      argsForStrategy(next ?? "", form.getValues("routing_strategy_args")),
                    );
                  }}
                >
                  <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
                    <SelectValue placeholder="选择策略" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyItems.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {selectedStrategy === "priority" && (
              <FormField
                control={form.control}
                name="model_priorities"
                label="模型优先级"
                description="第一选用 1，次选 2，以此类推；不可用模型会被跳过。"
              >
                {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                  <div id={id} className="space-y-2" role="group" aria-label="模型优先级">
                    {value.length === 0 && (
                      <p className="text-sm text-muted-foreground">请先选择模型以设置优先级</p>
                    )}
                    {value.map((entry, index) => (
                      <div key={entry.model} className="flex items-center justify-between gap-3">
                        <label htmlFor={`${id}-${index}`} className="min-w-0 flex-1 break-words text-sm">
                          {entry.model}
                          {!selectedModels.includes(entry.model) && (
                            <span className="block text-xs text-destructive">未选中该模型</span>
                          )}
                        </label>
                        <Input
                          id={`${id}-${index}`}
                          aria-label={`${entry.model} 的优先级`}
                          aria-invalid={ariaInvalid}
                          aria-describedby={ariaDescribedBy}
                          inputMode="numeric"
                          className="w-24"
                          value={entry.priority}
                          onChange={(event) =>
                            onChange(
                              value.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, priority: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        {!selectedModels.includes(entry.model) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`移除 ${entry.model} 的优先级`}
                            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            移除
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </FormField>
            )}

            {STRATEGIES_WITH_ARGS.has(selectedStrategy) && (
              <FormField
                control={form.control}
                name="routing_strategy_args"
                label="策略参数（JSON）"
                description={ARGS_EXAMPLES[selectedStrategy] ?? '示例：{ "ttl": 60 }'}
              >
                {({ ref, ...field }) => (
                  <Textarea {...field} ref={ref} rows={4} placeholder='{ "ttl": 3600 }' className="font-mono text-xs" />
                )}
              </FormField>
            )}

            <p className="text-xs text-muted-foreground">
              {selectedStrategy === "priority"
                ? "直接请求成员模型时仍沿用其原有路由行为。"
                : "不在非 priority 组中的模型使用代理顶层路由策略。"}
            </p>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => void form.handleSubmit(handleSubmit)()} disabled={saving} aria-busy={saving}>
            {mode === "create" ? "创建组" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoutingGroupModal;
