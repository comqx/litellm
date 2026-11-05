"use client";

import {
  ConfigType,
  GeneralSettingsFieldName,
  useDeleteProxyConfigField,
  useProxyConfig,
} from "@/app/(dashboard)/hooks/proxyConfig/useProxyConfig";
import {
  StoreRequestInSpendLogsParams,
  useStoreRequestInSpendLogs,
} from "@/app/(dashboard)/hooks/storeRequestInSpendLogs/useStoreRequestInSpendLogs";
import { toast } from "@/lib/toast";
import { parseErrorMessage } from "@/components/shared/errorUtils";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleHelp, Clock } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";

const STORE_PROMPTS_FIELD_NAME = "store_prompts_in_spend_logs";

interface 可选Field {
  readonly name: GeneralSettingsFieldName;
  readonly kind: "duration" | "count";
  readonly label: string;
  readonly placeholder: string;
  readonly fallbackTooltip: string;
}

const OPTIONAL_FIELDS: readonly 可选Field[] = [
  {
    name: GeneralSettingsFieldName.MAXIMUM_SPEND_LOGS_RETENTION_PERIOD,
    kind: "duration",
    label: "消耗日志最长保留时间（可选）",
    placeholder: "e.g., 7d, 30d",
    fallbackTooltip:
      "设置消耗日志的最长保留时间（例如 7d 表示 7 天、30d 表示 30 天）。留空表示不限制。",
  },
  {
    name: GeneralSettingsFieldName.MAXIMUM_SPEND_LOGS_CLEANUP_BATCH_SIZE,
    kind: "count",
    label: "消耗日志清理批次大小（可选）",
    placeholder: "e.g., 1000",
    fallbackTooltip: "清理时每次 DELETE 语句删除的行数。留空则使用默认值 1000。",
  },
  {
    name: GeneralSettingsFieldName.MAXIMUM_SPEND_LOGS_CLEANUP_MAX_BATCHES,
    kind: "count",
    label: "消耗日志清理最大批次数（可选）",
    placeholder: "e.g., 500",
    fallbackTooltip:
      "每次清理每张表运行的 DELETE 语句数量上限。留空则使用默认值 500。",
  },
  {
    name: GeneralSettingsFieldName.MAXIMUM_SPEND_LOGS_CLEANUP_RUN_BUDGET,
    kind: "duration",
    label: "消耗日志清理运行预算（可选）",
    placeholder: "e.g., 5m",
    fallbackTooltip:
      "单次清理运行的总耗时上限，在所有被清理的表之间共享（例如 5m）。留空则使用默认值 5m。",
  },
  {
    name: GeneralSettingsFieldName.MAXIMUM_SPEND_LOGS_CLEANUP_BATCH_TIMEOUT,
    kind: "duration",
    label: "消耗日志清理批次超时（可选）",
    placeholder: "e.g., 30s",
    fallbackTooltip:
      "每个清理批次应用的 Postgres 语句与锁超时，避免清理长时间占用连接（例如 30s）。留空则使用默认值 30s。",
  },
];

const MINIMUM_COUNT = 1;

interface LoggingSettingsFormValues {
  store_prompts_in_spend_logs: boolean;
  maximum_spend_logs_retention_period: string;
  maximum_spend_logs_cleanup_batch_size: string;
  maximum_spend_logs_cleanup_max_batches: string;
  maximum_spend_logs_cleanup_run_budget: string;
  maximum_spend_logs_cleanup_batch_timeout: string;
}

const duration = (value: string): string | undefined => (value.trim() === "" ? undefined : value);

// antd InputNumber applied `min` and `precision` to the committed value rather
// than only to the display, and it did so on blur, so the raw keystrokes have
// to survive until then or "12.34" commits as 124 instead of 12.
const count = (raw: string): number | undefined => {
  const parsed = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(MINIMUM_COUNT, Math.round(parsed));
};

const countDisplay = (raw: string): string => {
  const normalized = count(raw);
  return normalized === undefined ? "" : String(normalized);
};

const buildUpdateParams = (formValues: LoggingSettingsFormValues): StoreRequestInSpendLogsParams => {
  const retentionPeriod = duration(formValues.maximum_spend_logs_retention_period);
  const batchSize = count(formValues.maximum_spend_logs_cleanup_batch_size);
  const maxBatches = count(formValues.maximum_spend_logs_cleanup_max_batches);
  const runBudget = duration(formValues.maximum_spend_logs_cleanup_run_budget);
  const batchTimeout = duration(formValues.maximum_spend_logs_cleanup_batch_timeout);

  return {
    store_prompts_in_spend_logs: formValues.store_prompts_in_spend_logs,
    ...(retentionPeriod !== undefined && { maximum_spend_logs_retention_period: retentionPeriod }),
    ...(batchSize !== undefined && { maximum_spend_logs_cleanup_batch_size: batchSize }),
    ...(maxBatches !== undefined && { maximum_spend_logs_cleanup_max_batches: maxBatches }),
    ...(runBudget !== undefined && { maximum_spend_logs_cleanup_run_budget: runBudget }),
    ...(batchTimeout !== undefined && { maximum_spend_logs_cleanup_batch_timeout: batchTimeout }),
  };
};

// A blank field only needs clearing when something is actually stored for it.
// Asking the proxy to clear a field it has no value for is a 400 whenever no
// general_settings row exists at all, which is the state of every deployment
// that has never saved one, so clearing unconditionally would fail the first
// save on a new proxy and take the rest of the form down with it.
const omittedFieldNames = (
  updateParams: StoreRequestInSpendLogsParams,
  isStored: (name: GeneralSettingsFieldName) => boolean,
): readonly GeneralSettingsFieldName[] =>
  OPTIONAL_FIELDS.map((field) => field.name).filter((name) => !(name in updateParams) && isStored(name));

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

interface LoggingSettingsFormProps {
  initialValues: LoggingSettingsFormValues;
  describeField: (name: string, fallback: string) => string;
  isSaving: boolean;
  onSubmit: (formValues: LoggingSettingsFormValues) => void;
}

const LoggingSettingsForm: React.FC<LoggingSettingsFormProps> = ({
  initialValues,
  describeField,
  isSaving,
  onSubmit,
}) => {
  const form = useForm<LoggingSettingsFormValues>({ defaultValues: initialValues });

  return (
    <TooltipProvider>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <FormField
            control={form.control}
            name={STORE_PROMPTS_FIELD_NAME}
            label={labelWithHint(
              "在消耗日志中存储提示词",
              describeField(
                STORE_PROMPTS_FIELD_NAME,
                "启用后，提示词会写入消耗日志，便于追踪与分析。",
              ),
            )}
          >
            {({ id, value, onChange, onBlur }) => (
              <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} onBlur={onBlur} className="w-fit" />
            )}
          </FormField>

          {OPTIONAL_FIELDS.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              label={labelWithHint(field.label, describeField(field.name, field.fallbackTooltip))}
            >
              {({ ref, onChange, onBlur, ...control }) =>
                field.kind === "duration" ? (
                  <InputGroup>
                    <InputGroupInput
                      {...control}
                      ref={ref}
                      onChange={(event) => onChange(event.target.value)}
                      onBlur={onBlur}
                      placeholder={field.placeholder}
                    />
                    <InputGroupAddon>
                      <Clock />
                    </InputGroupAddon>
                  </InputGroup>
                ) : (
                  <Input
                    {...control}
                    ref={ref}
                    type="number"
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={(event) => {
                      onChange(countDisplay(event.target.value));
                      onBlur();
                    }}
                    placeholder={field.placeholder}
                  />
                )
              }
            </FormField>
          ))}
        </FieldGroup>

        <Button type="submit" className="mt-6" disabled={isSaving}>
          {isSaving && <UiLoadingSpinner role="img" aria-label="loading" className="size-4" />}
          {isSaving ? "Saving..." : "保存设置"}
        </Button>
      </form>
    </TooltipProvider>
  );
};

const LoggingSettings: React.FC = () => {
  const { mutate, isPending } = useStoreRequestInSpendLogs();
  const { mutate: deleteField, isPending: isDeletingField } = useDeleteProxyConfigField();
  const { data: proxyConfigData, isLoading: isLoadingConfig } = useProxyConfig(ConfigType.GENERAL_SETTINGS);

  const describeField = (name: string, fallback: string) =>
    proxyConfigData?.find((field) => field.field_name === name)?.field_description || fallback;

  const storedValue = useCallback(
    (name: string) => proxyConfigData?.find((field) => field.field_name === name)?.field_value,
    [proxyConfigData],
  );

  const isStored = (name: GeneralSettingsFieldName) => {
    const value = storedValue(name);
    return value !== null && value !== undefined;
  };

  const initialValues = useMemo(
    () =>
      ({
        store_prompts_in_spend_logs: storedValue(STORE_PROMPTS_FIELD_NAME) ?? false,
        ...Object.fromEntries(
          OPTIONAL_FIELDS.map((field) => {
            const stored = storedValue(field.name);
            return [field.name, stored === null || stored === undefined ? "" : String(stored)];
          }),
        ),
      }) as LoggingSettingsFormValues,
    [storedValue],
  );

  // Resolves to the field name when clearing it failed, or null when it worked.
  const clearStoredField = (fieldName: GeneralSettingsFieldName) =>
    new Promise<GeneralSettingsFieldName | null>((resolve) => {
      let failed = false;
      deleteField(
        { config_type: ConfigType.GENERAL_SETTINGS, field_name: fieldName },
        {
          onError: () => {
            failed = true;
          },
          onSettled: () => resolve(failed ? fieldName : null),
        },
      );
    });

  // Clearing a field rewrites the whole stored general_settings object server
  // side, so these must run one at a time: in parallel the last write back wins
  // and silently restores the fields the earlier ones just cleared.
  const clearStoredFieldsInSequence = async (
    fieldNames: readonly GeneralSettingsFieldName[],
  ): Promise<readonly GeneralSettingsFieldName[]> => {
    const failed: GeneralSettingsFieldName[] = [];
    for (const fieldName of fieldNames) {
      const failure = await clearStoredField(fieldName);
      if (failure !== null) {
        failed.push(failure);
      }
    }
    return failed;
  };

  const handleFormSubmit = (formValues: LoggingSettingsFormValues) => {
    const updateParams = buildUpdateParams(formValues);
    const submitUpdate = () =>
      mutate(updateParams, {
        onSuccess: () => toast.success("消耗日志设置已更新"),
        onError: (error) => toast.fromError("保存消耗日志设置失败：" + parseErrorMessage(error)),
      });

    const fieldsToClear = omittedFieldNames(updateParams, isStored);
    if (fieldsToClear.length === 0) {
      submitUpdate();
      return;
    }

    void clearStoredFieldsInSequence(fieldsToClear).then((failed) => {
      if (failed.length > 0) {
        // Reporting an unqualified success here would tell the admin a setting
        // was reset to its default while the old value is still in force.
        toast.fromError(`清除已保存的值失败：${failed.join(", ")}`);
        return;
      }
      submitUpdate();
    });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>日志设置</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full flex-col gap-6">
          <p className="mb-0 text-muted-foreground">
            控制请求与响应数据如何写入消耗日志的全局 Proxy 设置。
          </p>

          {isLoadingConfig ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : (
            <LoggingSettingsForm
              initialValues={initialValues}
              describeField={describeField}
              isSaving={isPending || isDeletingField}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoggingSettings;
