"use client";

import { CircleHelp } from "lucide-react";
import React, { useEffect, useId } from "react";
import {
  useController,
  useWatch,
  type Control,
  type ControllerRenderProps,
  type RegisterOptions,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getLoggingOnlyScopeOptions,
  modeIncludesLoggingOnly,
  normalizeLoggingOnlyScopeChoice,
  type LoggingOnlyScopeChoice,
} from "./guardrail_info_helpers";

export interface GuardrailCriterion {
  name: string;
  weight: number | string;
  description?: string;
}

export interface GuardrailFormValues extends Record<string, unknown> {
  criteria?: GuardrailCriterion[];
  logging_only_scope_choice?: LoggingOnlyScopeChoice;
  logging_only_continue_on_input_failure?: boolean;
}
export type GuardrailFormControl = Control<GuardrailFormValues>;
export type GuardrailFieldRules = Pick<RegisterOptions<GuardrailFormValues, string>, "validate">;

export type GuardrailFieldControlProps = ControllerRenderProps<GuardrailFormValues, string> & {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

export const requiredRule = (message: string): GuardrailFieldRules => ({
  validate: (value: unknown) => (isBlank(value) ? message : true),
});

export const asText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const LOGGING_ONLY_SCOPE_CHOICES: ReadonlySet<string> = new Set(
  getLoggingOnlyScopeOptions(true).map(({ value }) => value),
);

const isLoggingOnlyScopeChoice = (value: unknown): value is LoggingOnlyScopeChoice =>
  typeof value === "string" && LOGGING_ONLY_SCOPE_CHOICES.has(value);

export const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string" && value !== "") return [value];
  return [];
};

export const readRecord = (source: unknown, key: string): unknown =>
  source !== null && typeof source === "object" ? (source as Record<string, unknown>)[key] : undefined;

export const labelWithHint = (label: React.ReactNode, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  </>
);

export interface GuardrailFieldProps {
  control: GuardrailFormControl;
  name: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  rules?: GuardrailFieldRules;
  defaultValue?: unknown;
  className?: string;
  children: (control: GuardrailFieldControlProps) => React.ReactNode;
}

export const GuardrailField: React.FC<GuardrailFieldProps> = ({
  control,
  name,
  label,
  description,
  rules,
  defaultValue,
  className,
  children,
}) => {
  const reactId = useId();
  const controlId = `${reactId}-control`;
  const descriptionId = `${reactId}-description`;
  const errorId = `${reactId}-error`;
  const { field, fieldState } = useController({ control, name, rules, defaultValue });
  const invalid = fieldState.error !== undefined;
  const describedBy =
    [description !== undefined ? descriptionId : undefined, invalid ? errorId : undefined]
      .filter((id): id is string => id !== undefined)
      .join(" ") || undefined;

  return (
    <Field data-invalid={invalid || undefined} className={className}>
      {label !== undefined && <FieldLabel htmlFor={controlId}>{label}</FieldLabel>}
      {children({ ...field, id: controlId, "aria-invalid": invalid || undefined, "aria-describedby": describedBy })}
      {description !== undefined && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      <FieldError id={errorId} errors={[fieldState.error]} />
    </Field>
  );
};

const SKIP_MESSAGE_ITEMS = [
  { label: "使用全局默认", value: "inherit" },
  { label: "是，从 Guardrail 扫描中排除", value: "yes" },
  { label: "否，始终包含在扫描中", value: "no" },
];

export const SkipMessageSelect: React.FC<{ control: GuardrailFieldControlProps }> = ({ control }) => {
  const { id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy } = control;

  return (
    <Select items={SKIP_MESSAGE_ITEMS} value={asText(value) || null} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy} className="w-full">
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        {SKIP_MESSAGE_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const LoggingOnlyScopeSelect: React.FC<{
  control: GuardrailFieldControlProps;
  directionalScopeSupported: boolean;
}> = ({ control, directionalScopeSupported }) => {
  const { id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy } = control;
  const items = getLoggingOnlyScopeOptions(directionalScopeSupported);

  useEffect(() => {
    const currentChoice = isLoggingOnlyScopeChoice(value) ? value : "default";
    const choice = normalizeLoggingOnlyScopeChoice(currentChoice, directionalScopeSupported);
    if (choice !== value) onChange(choice);
  }, [value, directionalScopeSupported, onChange]);

  return (
    <Select items={items} value={asText(value) || "default"} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy} className="w-full">
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const LoggingOnlyScopeField: React.FC<{
  control: GuardrailFormControl;
  mode: unknown;
  directionalScopeSupported: boolean;
}> = ({ control, mode, directionalScopeSupported }) => {
  const scopeChoice = useWatch({ control, name: "logging_only_scope_choice" });
  const continueDisabled = scopeChoice === "input" || scopeChoice === "output";
  if (!modeIncludesLoggingOnly(mode)) return null;

  return (
    <>
      <GuardrailField
        control={control}
        name="logging_only_scope_choice"
        label={labelWithHint(
          "仅记录范围",
          "logging_only 扫描观察请求还是响应。仅观察的扫描不会阻止；同一护栏上的 pre_call 与 post_call 仍会阻止。",
        )}
      >
        {(fieldControl) => (
          <LoggingOnlyScopeSelect control={fieldControl} directionalScopeSupported={directionalScopeSupported} />
        )}
      </GuardrailField>
      <GuardrailField
        control={control}
        name="logging_only_continue_on_input_failure"
        label={labelWithHint(
          "标记请求后继续观察响应",
          "开启后，请求扫描被标记或失败时会记录日志，并继续扫描响应，两种结论都会保留。",
        )}
      >
        {(fieldControl) => (
          <Switch
            id={fieldControl.id}
            checked={!continueDisabled && fieldControl.value === true}
            disabled={continueDisabled}
            onCheckedChange={fieldControl.onChange}
            aria-invalid={fieldControl["aria-invalid"]}
            aria-describedby={fieldControl["aria-describedby"]}
            aria-label="标记请求后继续观察响应"
          />
        )}
      </GuardrailField>
    </>
  );
};
