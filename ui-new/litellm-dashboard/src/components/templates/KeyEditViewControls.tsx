import React from "react";
import { Control, UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";
import { FormField } from "@/components/shared/form/FormField";
import { toast } from "@/lib/toast";
import AgentSelector from "../agent_management/AgentSelector";
import RateLimitTypeFormItem from "../common_components/RateLimitTypeFormItem";
import NumericalInput from "../shared/numerical_input";
import SkillSelector from "../skills/SkillSelector";
import { moveTagsOutOfMetadataJson } from "./keyEditFieldNormalizers";
import { AgentsAndGroups, KeyEditFormValues } from "./keyEditFormValues";

export const labelWithHint = (label: React.ReactNode, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  </>
);

const KEY_TYPE_OPTIONS = [
  { value: "default", label: "Full Access", hint: "可调用所有路由（AI API、管理及只读）" },
  { value: "llm_api", label: "AI API", hint: "Can call only AI API routes (chat/completions, embeddings, etc.)" },
  { value: "management", label: "Management", hint: "Can call only management routes (user/team/key management)" },
];

export const KeyTypeSelect = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <Select
    items={Object.fromEntries(KEY_TYPE_OPTIONS.map((option) => [option.value, option.label]))}
    value={value}
    onValueChange={(next: string | null) => next != null && onChange(next)}
  >
    <SelectTrigger id={id} className="w-full">
      <SelectValue placeholder="选择 Key 类型" />
    </SelectTrigger>
    <SelectContent>
      {KEY_TYPE_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          <div className="py-1">
            <div className="font-medium">{option.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</div>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const SKILLS_HINT =
  "已启用的 Skill 对所有 Key 可见。在此为此 Key 授予已禁用（私有）的 Claude Code 插件。";

const TPD_HINT =
  "Daily token budget for batch submissions (/v1/batches). When set, batch input files are charged against this 24h window instead of the key's TPM/RPM limits. Online requests keep using TPM/RPM.";

export const KeyRateLimitFields = ({ control }: { control: Control<KeyEditFormValues> }) => (
  <>
    <FormField control={control} name="tpm_limit" label="TPM 限制">
      {({ ref: _ref, ...field }) => <NumericalInput {...field} value={field.value ?? ""} min={0} />}
    </FormField>

    <FormField control={control} name="tpm_limit_type">
      {({ value, onChange, id }) => (
        <RateLimitTypeFormItem
          id={id}
          type="tpm"
          name="tpm_limit_type"
          showDetailedDescriptions={false}
          value={value as string | null}
          onChange={onChange}
        />
      )}
    </FormField>

    <FormField control={control} name="rpm_limit" label="RPM 限制">
      {({ ref: _ref, ...field }) => <NumericalInput {...field} value={field.value ?? ""} min={0} />}
    </FormField>

    <FormField control={control} name="rpm_limit_type">
      {({ value, onChange, id }) => (
        <RateLimitTypeFormItem
          id={id}
          type="rpm"
          name="rpm_limit_type"
          showDetailedDescriptions={false}
          value={value as string | null}
          onChange={onChange}
        />
      )}
    </FormField>

    <FormField control={control} name="tpd_limit" label={labelWithHint("TPD 限制（批处理）", TPD_HINT)}>
      {({ ref: _ref, ...field }) => <NumericalInput {...field} value={field.value ?? ""} min={0} />}
    </FormField>
  </>
);

export const KeyAgentAndSkillFields = ({
  control,
  accessToken,
}: {
  control: Control<KeyEditFormValues>;
  accessToken: string;
}) => (
  <>
    <FormField control={control} name="agents_and_groups" label="Agents / 访问组">
      {({ value, onChange }) => (
        <AgentSelector
          onChange={onChange}
          value={value as AgentsAndGroups | undefined}
          accessToken={accessToken}
          placeholder="选择 Agent 或 Access Group（可选）"
        />
      )}
    </FormField>

    <FormField control={control} name="skills" label={labelWithHint("Skills", SKILLS_HINT)}>
      {({ value, onChange }) => (
        <SkillSelector onChange={onChange} value={value as string[] | undefined} accessToken={accessToken} />
      )}
    </FormField>
  </>
);

type KeyEditForm = Pick<
  UseFormReturn<KeyEditFormValues, unknown, KeyEditFormValues>,
  "control" | "getValues" | "setValue"
>;

export const moveMetadataTagsToTagsField = (form: KeyEditForm): void => {
  const moved = moveTagsOutOfMetadataJson(form.getValues("metadata"), form.getValues("tags"));
  if (moved === null) return;
  form.setValue("metadata", moved.metadata, { shouldDirty: true });
  form.setValue("tags", moved.tags, { shouldDirty: true });
  if (moved.movedTags.length > 0) {
    toast.info(`已将 ${moved.movedTags.join(", ")} 从元数据移动到 Tag 字段`);
  }
};

export const KeyMetadataField = ({ form }: { form: KeyEditForm }) => (
  <FormField
    control={form.control}
    name="metadata"
    label="元数据"
    description="Tag 由上方的 Tags 字段管理。在此处输入的 tags 数组会被移动到该字段。"
  >
    {(field) => (
      <Textarea
        {...field}
        value={(field.value as string | undefined) ?? ""}
        rows={10}
        onBlur={() => {
          field.onBlur();
          moveMetadataTagsToTagsField(form);
        }}
      />
    )}
  </FormField>
);

export const KeyBudgetNumberField = ({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<KeyEditFormValues>;
  name: "max_budget" | "soft_budget";
  label: string;
  placeholder: string;
}) => (
  <FormField control={control} name={name} label={label}>
    {({ ref: _ref, ...field }) => (
      <NumericalInput
        {...field}
        value={field.value ?? ""}
        step={0.01}
        style={{ width: "100%" }}
        placeholder={placeholder}
      />
    )}
  </FormField>
);
