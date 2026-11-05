"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleHelp } from "lucide-react";
import type { Dayjs } from "dayjs";
import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { FormField } from "@/components/shared/form/FormField";
import { UtcDateTimeInput } from "@/components/shared/form/UtcDateTimeInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { credentialOptions } from "@/components/shared/credentialOptions";
import { AttachedCredential, CredentialNameHint } from "@/components/shared/CredentialIdentity";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";

import CacheControlInjectionPoints, {
  CACHE_CONTROL_LABEL,
  CACHE_CONTROL_TOOLTIP,
  type CacheControlInjectionPoint,
} from "./add_model/cache_control_settings";
import type { Team } from "./key_team_helpers/key_list";
import type { CredentialItem } from "./networking";
import NumericalInput from "./shared/numerical_input";
import type { Tag } from "./tag_management/types";
import { ModelTeamSelect } from "./view_model/ModelTeamSelect";
import VectorStoreSelector from "./vector_store_management/VectorStoreSelector";
import { formatPtuUtcDisplay, utcIsoToPickerValue } from "../utils/ptuDatetime";
import { isMaskedSecret } from "../utils/maskedSecretUtils";
import {
  MAX_COST_PER_PTU_PER_HOUR,
  MAX_PTU_COUNT,
  PTU_COUNT_FIELD,
  PTU_END_FIELD,
  PTU_RATE_FIELD,
  PTU_START_FIELD,
  isFilledPtuValue,
  isNonNegativePtuRate,
  isPositiveWholePtuCount,
  ptuWindowIsOrdered,
} from "../utils/ptuValidation";

interface PtuEditField {
  name: string;
  label: string;
  input: "number" | "datetime";
  placeholder?: string;
  isCount?: boolean;
}

const PTU_EDIT_FIELDS: PtuEditField[] = [
  { name: PTU_COUNT_FIELD, label: "PTU 数量", input: "number", placeholder: "例如 15", isCount: true },
  { name: PTU_RATE_FIELD, label: "每 PTU 每小时费用（美元）", input: "number", placeholder: "例如 2.00" },
  { name: PTU_START_FIELD, label: "PTU 生效开始（UTC）", input: "datetime" },
  { name: PTU_END_FIELD, label: "PTU 生效结束（UTC）", input: "datetime" },
];

export type TouchedPricingField = "input_cost" | "output_cost" | "cache_read_cost" | "cache_write_cost";

const PRICING_FIELDS: readonly TouchedPricingField[] = [
  "input_cost",
  "output_cost",
  "cache_read_cost",
  "cache_write_cost",
] as const;

const COST_SOURCES: Record<TouchedPricingField, { param: string; info: string }> = {
  input_cost: { param: "input_cost_per_token", info: "input_cost_per_token" },
  output_cost: { param: "output_cost_per_token", info: "output_cost_per_token" },
  cache_read_cost: { param: "cache_read_input_token_cost", info: "cache_read_input_token_cost" },
  cache_write_cost: { param: "cache_creation_input_token_cost", info: "cache_creation_input_token_cost" },
};

export interface ModelEditFormValues {
  model_name?: string;
  litellm_model_name?: string;
  api_base?: string;
  custom_llm_provider?: string;
  organization?: string;
  tpm?: string | number | null;
  rpm?: string | number | null;
  max_retries?: string | number | null;
  timeout?: string | number | null;
  stream_timeout?: string | number | null;
  input_cost?: string | number | null;
  output_cost?: string | number | null;
  cache_read_cost?: string | number | null;
  cache_write_cost?: string | number | null;
  ptu_count?: string | number | null;
  cost_per_ptu_per_hour?: string | number | null;
  ptu_effective_from?: Dayjs | null;
  ptu_effective_to?: Dayjs | null;
  cache_control?: boolean;
  cache_control_injection_points?: CacheControlInjectionPoint[];
  model_access_group?: string[];
  guardrails?: string[];
  vector_store_ids?: string[];
  tags?: string[];
  health_check_model?: string | null;
  litellm_credential_name?: string | null;
  litellm_extra_params?: string;
  model_info?: string;
  team_id?: string;
}

type ModelEditFieldName = keyof ModelEditFormValues;

const scalar = z.union([z.string(), z.number(), z.null()]).optional();
const textish = z.string().optional();

const modelEditShape = {
  model_name: textish,
  litellm_model_name: textish,
  api_base: textish,
  custom_llm_provider: textish,
  organization: textish,
  tpm: scalar,
  rpm: scalar,
  max_retries: scalar,
  timeout: scalar,
  stream_timeout: scalar,
  input_cost: scalar,
  output_cost: scalar,
  cache_read_cost: scalar,
  cache_write_cost: scalar,
  ptu_count: scalar,
  cost_per_ptu_per_hour: scalar,
  ptu_effective_from: z.custom<Dayjs | null>().nullish(),
  ptu_effective_to: z.custom<Dayjs | null>().nullish(),
  cache_control: z.boolean().optional(),
  cache_control_injection_points: z.array(z.custom<CacheControlInjectionPoint>()).optional(),
  model_access_group: z.array(z.string()).optional(),
  guardrails: z.array(z.string()).optional(),
  vector_store_ids: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  health_check_model: z.string().nullish(),
  litellm_credential_name: z.string().nullish(),
  litellm_extra_params: textish,
  model_info: textish,
  team_id: textish,
};

const isJson = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const buildSchema = (ptuEnabled: boolean, isFieldTouched: (field: TouchedPricingField) => boolean) =>
  z.object(modelEditShape).superRefine((values, ctx) => {
    const reject = (path: ModelEditFieldName, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (values.litellm_extra_params && !isJson(values.litellm_extra_params)) {
      reject("litellm_extra_params", "请输入合法 JSON");
    }

    // antd validates only mounted fields, and the PTU block does not render when the flag is off.
    if (!ptuEnabled) {
      return;
    }

    if (!isPositiveWholePtuCount(values.ptu_count)) {
      reject("ptu_count", `PTU 数量必须是 1 到 ${MAX_PTU_COUNT.toLocaleString()} 之间的整数`);
    }
    if (!isNonNegativePtuRate(values.cost_per_ptu_per_hour)) {
      reject(
        "cost_per_ptu_per_hour",
        `每 PTU 每小时费用必须在 0 到 ${MAX_COST_PER_PTU_PER_HOUR.toLocaleString()} 之间`,
      );
    }
    if (isFilledPtuValue(values.ptu_count) !== isFilledPtuValue(values.cost_per_ptu_per_hour)) {
      const message = "PTU 数量和每 PTU 每小时费用必须同时填写";
      reject("ptu_count", message);
      reject("cost_per_ptu_per_hour", message);
    }
    if (isFilledPtuValue(values.ptu_count) && !isFilledPtuValue(values.ptu_effective_from)) {
      reject("ptu_effective_from", "填写了 PTU 数量时，必须设置生效开始时间");
    }
    if (!ptuWindowIsOrdered(values.ptu_effective_from, values.ptu_effective_to)) {
      const message = "生效结束时间必须晚于生效开始时间";
      reject("ptu_effective_from", message);
      reject("ptu_effective_to", message);
    }

    for (const field of PRICING_FIELDS) {
      const value = values[field];
      if (
        isFieldTouched(field) &&
        isFilledPtuValue(values.ptu_count) &&
        isFilledPtuValue(value) &&
        Number(value) !== 0
      ) {
        reject(field, "PTU 部署按预留容量计费，此项价格必须为 0 或留空");
      }
    }
  });

const perMillionTokens = (...rates: (number | null | undefined)[]): number | null => {
  const rate = rates.find((candidate) => candidate != null);
  return rate == null ? null : rate * 1_000_000;
};

export const toModelEditFormValues = (localModelData: any, isWildcardModel: boolean): ModelEditFormValues => ({
  model_name: localModelData.model_name,
  litellm_model_name: localModelData.litellm_model_name,
  api_base: localModelData.litellm_params.api_base,
  custom_llm_provider: localModelData.litellm_params.custom_llm_provider,
  organization: localModelData.litellm_params.organization,
  tpm: localModelData.litellm_params.tpm,
  rpm: localModelData.litellm_params.rpm,
  max_retries: localModelData.litellm_params.max_retries,
  timeout: localModelData.litellm_params.timeout,
  stream_timeout: localModelData.litellm_params.stream_timeout,
  input_cost: perMillionTokens(
    localModelData.litellm_params.input_cost_per_token,
    localModelData.model_info?.input_cost_per_token,
  ),
  output_cost: perMillionTokens(
    localModelData.litellm_params?.output_cost_per_token,
    localModelData.model_info?.output_cost_per_token,
  ),
  ptu_count: localModelData.model_info?.ptu_count ?? null,
  cost_per_ptu_per_hour: localModelData.model_info?.cost_per_ptu_per_hour ?? null,
  ptu_effective_from: utcIsoToPickerValue(localModelData.model_info?.ptu_effective_from),
  ptu_effective_to: utcIsoToPickerValue(localModelData.model_info?.ptu_effective_to),
  cache_read_cost: perMillionTokens(
    localModelData.litellm_params?.cache_read_input_token_cost,
    localModelData.model_info?.cache_read_input_token_cost,
  ),
  cache_write_cost: perMillionTokens(
    localModelData.litellm_params?.cache_creation_input_token_cost,
    localModelData.model_info?.cache_creation_input_token_cost,
  ),
  cache_control: localModelData.litellm_params?.cache_control_injection_points ? true : false,
  cache_control_injection_points: localModelData.litellm_params?.cache_control_injection_points || [],
  model_access_group: Array.isArray(localModelData.model_info?.access_groups)
    ? localModelData.model_info.access_groups
    : [],
  guardrails: Array.isArray(localModelData.litellm_params?.guardrails) ? localModelData.litellm_params.guardrails : [],
  vector_store_ids:
    Array.isArray(localModelData.litellm_params?.vector_store_ids) &&
    localModelData.litellm_params.vector_store_ids.length > 0
      ? localModelData.litellm_params.vector_store_ids
      : undefined,
  tags: Array.isArray(localModelData.litellm_params?.tags) ? localModelData.litellm_params.tags : [],
  // antd never mounted this field for a non-wildcard model, so the key must be absent, not null.
  ...(isWildcardModel ? { health_check_model: localModelData.model_info?.health_check_model } : {}),
  litellm_credential_name: localModelData.litellm_params?.litellm_credential_name ?? null,
  litellm_extra_params: JSON.stringify(
    Object.fromEntries(
      Object.entries(localModelData.litellm_params || {}).filter(
        ([key, value]) => key !== "litellm_credential_name" && !isMaskedSecret(value),
      ),
    ),
    null,
    2,
  ),
  team_id: localModelData.model_info?.team_id ?? undefined,
});

const displayCost = (localModelData: any, field: TouchedPricingField): string => {
  const { param, info } = COST_SOURCES[field];
  const rate = localModelData?.litellm_params?.[param] ?? localModelData?.model_info?.[info];
  return rate != null ? (Number(rate) * 1_000_000).toFixed(4) : "未设置";
};

interface ModelInfoEditFormProps {
  localModelData: any;
  modelData: { model_info: { team_id?: string | null } };
  teamAlias: string | null;
  accessToken: string | null;
  isEditing: boolean;
  isSaving: boolean;
  isWildcardModel: boolean;
  ptuCostAttributionEnabled: boolean;
  showCacheControl: boolean;
  setShowCacheControl: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: (values: ModelEditFormValues, isFieldTouched: (field: TouchedPricingField) => boolean) => Promise<void>;
  modelAccessGroups: string[] | null;
  guardrailsList: string[];
  tagsList: Record<string, Tag>;
  credentialsList: CredentialItem[];
  healthCheckModelOptions: { value: string; label: string }[];
  teams: Team[] | null;
}

const Display: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-1 rounded-sm bg-muted p-2">{children}</div>
);

const FIELD_LABEL_CLASS = "text-sm font-medium text-foreground";

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) =>
  htmlFor === undefined ? (
    <p className={FIELD_LABEL_CLASS}>{children}</p>
  ) : (
    <label htmlFor={htmlFor} className={FIELD_LABEL_CLASS}>
      {children}
    </label>
  );

const Hint: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip>
    <TooltipTrigger
      render={<CircleHelp className="ml-1 inline size-3.5 shrink-0 cursor-help text-muted-foreground" />}
    />
    <TooltipContent className="max-w-xs">{text}</TooltipContent>
  </Tooltip>
);

const DocsHint: React.FC<{ text: string; href: string }> = ({ text, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
    <Hint text={text} />
  </a>
);

const ChipList: React.FC<{ values: unknown; emptyLabel: string }> = ({ values, emptyLabel }) => {
  if (!values) {
    return <>未设置</>;
  }
  if (!Array.isArray(values)) {
    return <>{String(values)}</>;
  }
  if (values.length === 0) {
    return <>{emptyLabel}</>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((entry: string, index: number) => (
        <Badge key={index} variant="secondary">
          {entry}
        </Badge>
      ))}
    </div>
  );
};

const ModelInfoEditForm: React.FC<ModelInfoEditFormProps> = ({
  localModelData,
  modelData,
  teamAlias,
  accessToken,
  isEditing,
  isSaving,
  isWildcardModel,
  ptuCostAttributionEnabled,
  showCacheControl,
  setShowCacheControl,
  onCancel,
  onSubmit,
  modelAccessGroups,
  guardrailsList,
  tagsList,
  credentialsList,
  healthCheckModelOptions,
  teams,
}) => {
  // Neither RHF's blur-based touchedFields nor its resettable dirtyFields matches antd's touched-on-change.
  const touchedRef = React.useRef<ReadonlySet<string>>(new Set<string>());
  const isFieldTouched = React.useCallback((field: TouchedPricingField) => touchedRef.current.has(field), []);
  const markTouched = (field: string) => {
    touchedRef.current = new Set([...touchedRef.current, field]);
  };

  // react-hook-form refreshes control._options every render, so this rebuild is what the next submit runs.
  const resolver: Resolver<ModelEditFormValues> = (values, context, options) =>
    zodResolver(buildSchema(ptuCostAttributionEnabled, isFieldTouched))(values, context, options);

  const form = useForm<ModelEditFormValues>({
    resolver,
    defaultValues: toModelEditFormValues(localModelData, isWildcardModel),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (values) => {
      await onSubmit(values, isFieldTouched);
    })(event);

  const cancel = () => {
    form.reset(toModelEditFormValues(localModelData, isWildcardModel));
    touchedRef.current = new Set<string>();
    onCancel();
  };

  const textField = (name: ModelEditFieldName, label: string, placeholder: string, stored: unknown) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <FormField control={form.control} name={name}>
          {({ value, ...control }) => <Input {...control} value={(value as string) ?? ""} placeholder={placeholder} />}
        </FormField>
      ) : (
        <Display>{(stored as string) || "未设置"}</Display>
      )}
    </div>
  );

  const numberField = (name: ModelEditFieldName, label: string, placeholder: string, stored: unknown) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <FormField control={form.control} name={name}>
          {({ value, ...control }) => <NumericalInput {...control} value={value ?? ""} placeholder={placeholder} />}
        </FormField>
      ) : (
        <Display>{(stored as string) || "未设置"}</Display>
      )}
    </div>
  );

  const pricingField = (name: TouchedPricingField, label: string, placeholder: string, description?: string) =>
    isEditing ? (
      <FormField control={form.control} name={name} label={label} description={description}>
        {({ value, onChange, ...control }) => (
          <NumericalInput
            {...control}
            value={value ?? ""}
            placeholder={placeholder}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              markTouched(name);
              onChange(event);
            }}
          />
        )}
      </FormField>
    ) : (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <Display>{displayCost(localModelData, name)}</Display>
      </div>
    );

  const tagsField = (
    name: "model_access_group" | "guardrails" | "tags",
    options: { value: string; label: string }[],
    placeholder: string,
  ) => (
    <FormField control={form.control} name={name}>
      {({ id, value, onChange }) => (
        <TagsInput
          id={id}
          value={(value as string[]) ?? []}
          onValueChange={onChange}
          options={options}
          placeholder={placeholder}
          tokenSeparators={[","]}
        />
      )}
    </FormField>
  );

  return (
    <TooltipProvider>
      <form onSubmit={submit}>
        <div className="space-y-4">
          <div className="space-y-4">
            {textField("model_name", "模型名称", "填写模型名称", localModelData.model_name)}
            {textField(
              "litellm_model_name",
              "LiteLLM 模型名称",
              "填写 LiteLLM 模型名称",
              localModelData.litellm_model_name,
            )}

            {pricingField("input_cost", "输入价格（每 100 万 token）", "填写输入价格")}
            {pricingField("output_cost", "输出价格（每 100 万 token）", "填写输出价格")}

            {ptuCostAttributionEnabled &&
              PTU_EDIT_FIELDS.map((ptuField) => (
                <div key={ptuField.name}>
                  <FieldLabel htmlFor={ptuField.name}>{ptuField.label}</FieldLabel>
                  {isEditing ? (
                    <FormField control={form.control} name={ptuField.name as ModelEditFieldName}>
                      {({ value, onChange, ...control }) =>
                        ptuField.input === "number" ? (
                          <NumericalInput
                            {...control}
                            id={ptuField.name}
                            onChange={onChange}
                            value={value ?? ""}
                            placeholder={ptuField.placeholder}
                            step={ptuField.isCount ? 1 : undefined}
                            min={ptuField.isCount ? 1 : 0}
                          />
                        ) : (
                          <UtcDateTimeInput
                            {...control}
                            id={ptuField.name}
                            value={value as Dayjs | null}
                            onChange={onChange}
                          />
                        )
                      }
                    </FormField>
                  ) : (
                    <Display>
                      {(ptuField.input === "datetime"
                        ? formatPtuUtcDisplay(localModelData?.model_info?.[ptuField.name])
                        : localModelData?.model_info?.[ptuField.name]) ?? "未设置"}
                    </Display>
                  )}
                </div>
              ))}

            {pricingField(
              "cache_read_cost",
              "缓存读取价格（每 100 万 token）",
              "留空则默认使用输入价格",
              "保存时留空，则默认使用输入价格。",
            )}
            {pricingField(
              "cache_write_cost",
              "缓存写入价格（每 100 万 token）",
              "留空则默认使用输入价格",
              "保存时留空，则默认使用输入价格（后端回退到 input_cost_per_token）。",
            )}

            {textField("api_base", "API 地址", "填写 API 地址", localModelData.litellm_params?.api_base)}
            {textField(
              "custom_llm_provider",
              "自定义 LLM 提供商",
              "填写自定义 LLM 提供商",
              localModelData.litellm_params?.custom_llm_provider,
            )}
            {textField(
              "organization",
              "组织",
              "填写组织",
              localModelData.litellm_params?.organization,
            )}

            {numberField("tpm", "TPM（每分钟 token）", "填写 TPM", localModelData.litellm_params?.tpm)}
            {numberField("rpm", "RPM（每分钟请求）", "填写 RPM", localModelData.litellm_params?.rpm)}
            {numberField("max_retries", "最大重试次数", "填写最大重试次数", localModelData.litellm_params?.max_retries)}
            {numberField("timeout", "超时（秒）", "填写超时时间", localModelData.litellm_params?.timeout)}
            {numberField(
              "stream_timeout",
              "流式超时（秒）",
              "填写流式超时时间",
              localModelData.litellm_params?.stream_timeout,
            )}

            <div>
              <FieldLabel>模型访问组</FieldLabel>
              {isEditing ? (
                tagsField(
                  "model_access_group",
                  (modelAccessGroups ?? []).map((group) => ({ value: group, label: group })),
                  "选择已有分组，或输入以新建",
                )
              ) : (
                <Display>
                  <ChipList values={localModelData.model_info?.access_groups} emptyLabel="未分配分组" />
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>
                护栏
                <DocsHint
                  text="为该模型应用安全护栏，用于过滤内容或执行策略"
                  href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                />
              </FieldLabel>
              {isEditing ? (
                tagsField(
                  "guardrails",
                  guardrailsList.map((name) => ({ value: name, label: name })),
                  "选择已有护栏，或输入以新建",
                )
              ) : (
                <Display>
                  <ChipList values={localModelData.litellm_params?.guardrails} emptyLabel="未分配护栏" />
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>
                已挂载知识库（RAG）
                <DocsHint
                  text="用于 RAG 的向量库。对该模型的每次请求都会自动从这些知识库检索上下文。"
                  href="https://docs.litellm.ai/docs/completion/knowledgebase"
                />
              </FieldLabel>
              {isEditing ? (
                <FormField control={form.control} name="vector_store_ids">
                  {({ value, onChange }) => (
                    <VectorStoreSelector
                      value={value as string[] | undefined}
                      onChange={onChange}
                      accessToken={accessToken || ""}
                      placeholder="选择知识库（可选）"
                    />
                  )}
                </FormField>
              ) : (
                <Display>
                  <ChipList
                    values={localModelData.litellm_params?.vector_store_ids}
                    emptyLabel="未挂载知识库"
                  />
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>标签</FieldLabel>
              {isEditing ? (
                tagsField(
                  "tags",
                  Object.values(tagsList).map((tag: Tag) => ({ value: tag.name, label: tag.name })),
                  "选择已有标签，或输入以新建",
                )
              ) : (
                <Display>
                  <ChipList values={localModelData.litellm_params?.tags} emptyLabel="未分配标签" />
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>已有凭证</FieldLabel>
              {isEditing ? (
                <FormField control={form.control} name="litellm_credential_name">
                  {({ id, value, onChange }) => (
                    <>
                      <SearchSelect
                        inputId={id}
                        placeholder="选择或搜索已有凭证"
                        options={credentialOptions(credentialsList)}
                        value={(value as string | null) ?? ""}
                        allowClear={false}
                        onValueChange={(selected) => {
                          if (selected !== null) onChange(selected === "" ? null : selected);
                        }}
                      />
                      <CredentialNameHint
                        credentialName={value as string | null | undefined}
                        credentials={credentialsList}
                      />
                    </>
                  )}
                </FormField>
              ) : (
                <Display>
                  <AttachedCredential
                    credentialName={localModelData.litellm_params?.litellm_credential_name}
                    credentials={credentialsList}
                  />
                </Display>
              )}
            </div>

            {isWildcardModel && (
              <div>
                <FieldLabel>健康检查模型</FieldLabel>
                {isEditing ? (
                  <FormField control={form.control} name="health_check_model">
                    {({ id, value, onChange, onBlur }) => (
                      <Select
                        items={healthCheckModelOptions}
                        value={(value as string | null) ?? null}
                        onValueChange={onChange}
                      >
                        <SelectTrigger id={id} className="w-full" onBlur={onBlur}>
                          <SelectValue placeholder="选择已有健康检查模型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>无</SelectItem>
                          {healthCheckModelOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                ) : (
                  <Display>{localModelData.model_info?.health_check_model || "未设置"}</Display>
                )}
              </div>
            )}

            {isEditing ? (
              <>
                <FormField
                  control={form.control}
                  name="cache_control"
                  label={
                    <>
                      {CACHE_CONTROL_LABEL}
                      <Hint text={CACHE_CONTROL_TOOLTIP} />
                    </>
                  }
                  orientation="horizontal"
                >
                  {({ id, value, onChange, onBlur }) => (
                    <Switch
                      id={id}
                      onBlur={onBlur}
                      checked={Boolean(value)}
                      onCheckedChange={(checked: boolean) => {
                        onChange(checked);
                        setShowCacheControl(checked);
                      }}
                    />
                  )}
                </FormField>
                {showCacheControl && (
                  <FormField control={form.control} name="cache_control_injection_points">
                    {({ value, onChange }) => (
                      <CacheControlInjectionPoints
                        value={(value as CacheControlInjectionPoint[]) ?? []}
                        onChange={onChange}
                      />
                    )}
                  </FormField>
                )}
              </>
            ) : (
              <div>
                <FieldLabel>缓存控制</FieldLabel>
                <Display>
                  {localModelData.litellm_params?.cache_control_injection_points ? (
                    <div>
                      <p>已启用</p>
                      <div className="mt-2">
                        {localModelData.litellm_params.cache_control_injection_points.map((point: any, i: number) => (
                          <div key={i} className="mb-1 text-sm text-muted-foreground">
                            位置：{point.location},{point.role && <span> 角色：{point.role}</span>}
                            {point.index !== undefined && <span> 索引：{point.index}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    "已禁用"
                  )}
                </Display>
              </div>
            )}

            <div>
              <FieldLabel>模型信息</FieldLabel>
              {isEditing ? (
                <FormField control={form.control} name="model_info">
                  {({ value, ...control }) => (
                    <Textarea
                      {...control}
                      rows={4}
                      placeholder={'{"gpt-4": 100, "claude-v1": 200}'}
                      defaultValue={JSON.stringify(modelData.model_info, null, 2)}
                    />
                  )}
                </FormField>
              ) : (
                <Display>
                  <pre className="mt-1 overflow-auto rounded-sm bg-muted p-2 text-xs">
                    {JSON.stringify(localModelData.model_info, null, 2)}
                  </pre>
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>
                LiteLLM 参数
                <DocsHint
                  text="用于 litellm.completion() 调用的可选参数。部分参数由 LiteLLM 自动添加。"
                  href="https://docs.litellm.ai/docs/completion/input"
                />
              </FieldLabel>
              {isEditing ? (
                <FormField control={form.control} name="litellm_extra_params">
                  {({ value, ...control }) => (
                    <Textarea
                      {...control}
                      value={(value as string) ?? ""}
                      rows={4}
                      placeholder={'{\n  "rpm": 100,\n  "timeout": 0,\n  "stream_timeout": 0\n}'}
                    />
                  )}
                </FormField>
              ) : (
                <Display>
                  <pre className="mt-1 overflow-auto rounded-sm bg-muted p-2 text-xs">
                    {JSON.stringify(localModelData.litellm_params, null, 2)}
                  </pre>
                </Display>
              )}
            </div>

            <div>
              <FieldLabel>团队</FieldLabel>
              {isEditing ? (
                <FormField control={form.control} name="team_id">
                  {({ id, value, onChange, onBlur }) => (
                    <ModelTeamSelect id={id} value={value} onChange={onChange} onBlur={onBlur} teams={teams} />
                  )}
                </FormField>
              ) : (
                <Display>
                  {teamAlias
                    ? `${teamAlias} (${localModelData.model_info?.team_id})`
                    : localModelData.model_info?.team_id || "未设置"}
                </Display>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end gap-2">
              <Button type="submit" variant="secondary" onClick={cancel} disabled={isSaving}>
                取消
              </Button>
              <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
                {isSaving && <UiLoadingSpinner className="size-4" />}
                保存更改
              </Button>
            </div>
          )}
        </div>
      </form>
    </TooltipProvider>
  );
};

export default ModelInfoEditForm;
