import React from "react";
import { $api } from "@/lib/http/api";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fuseProfileFields,
  selectFuseProfile,
  type FuseProfileField,
  type FuseSettings,
} from "./forecast_classifier_config";

const catalogQueryOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

const profileLabels: Readonly<Record<FuseProfileField, string>> = {
  efficient_profile: "高效求解模型 配置",
  capable_profile: "强大求解模型 配置",
  harness: "框架与预算",
};

type FusePresetEntry = {
  id: string;
  label: string;
  text: string;
  sources: readonly string[];
  model?: string;
};

type FieldProps = {
  id: string;
  field: FuseProfileField;
  value: FuseSettings;
  onChange: (value: FuseSettings) => void;
  presets: readonly FusePresetEntry[] | undefined;
  catalogVersion: string | undefined;
  customWithoutPreview: ReadonlySet<FuseProfileField>;
  setCustomWithoutPreview: React.Dispatch<React.SetStateAction<ReadonlySet<FuseProfileField>>>;
};

const profileSelectionLabel = (awaitingCustomText: boolean, custom: boolean): string => {
  if (awaitingCustomText) return "已保存的预设保持生效，直到输入替换文本";
  if (custom) return "自定义文本覆盖预设";
  return "预设";
};

function FuseProfilePresetField({
  id,
  field,
  value,
  onChange,
  presets,
  catalogVersion,
  customWithoutPreview,
  setCustomWithoutPreview,
}: FieldProps) {
  const label = profileLabels[field];
  const presetId = value[`${field}_preset`];
  const preset = presets?.find((entry) => entry.id === presetId);
  const awaitingCustomText = customWithoutPreview.has(field) && value[field] == null && presetId != null;
  const custom = value[field] != null || presetId == null || awaitingCustomText;
  const effectiveText = value[field] ?? preset?.text ?? "";
  const selectionLabel = profileSelectionLabel(awaitingCustomText, custom);
  const chooseProfile = (selected: string | null) => {
    if (!selected) return;
    const missingPreview = presetId != null && preset == null && value[field] == null;
    if (selected === "custom" && missingPreview) {
      setCustomWithoutPreview((fields) => new Set([...fields, field]));
      return;
    }
    setCustomWithoutPreview((fields) => new Set([...fields].filter((entry) => entry !== field)));
    onChange(selectFuseProfile(value, field, selected === "custom" ? undefined : selected, effectiveText));
  };
  const editProfile = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (customWithoutPreview.has(field) && event.target.value.trim().length > 0) {
      setCustomWithoutPreview((fields) => new Set([...fields].filter((entry) => entry !== field)));
      onChange(selectFuseProfile(value, field, undefined, event.target.value));
      return;
    }
    onChange({ ...value, [field]: event.target.value });
  };
  const keepSavedPreset = () => {
    if (presetId == null) return;
    setCustomWithoutPreview((fields) => new Set([...fields].filter((entry) => entry !== field)));
    onChange(selectFuseProfile(value, field, presetId, ""));
  };
  const placeholder =
    field === "harness"
      ? "每个求解模型 可用的工具、执行环境、验证方式和预算"
      : "描述此求解模型 的优势、限制和设置";

  return (
    <div className="space-y-2 min-w-0">
      <Label htmlFor={`${id}-${field}-preset`}>{label} preset</Label>
      <SearchSelect
        inputId={`${id}-${field}-preset`}
        aria-label={`${label}预设`}
        value={custom ? "custom" : presetId}
        allowClear={false}
        options={[
          { value: "custom", label: "自定义" },
          ...(presets ?? []).map((entry) => ({ value: entry.id, label: entry.label, sublabel: entry.id })),
        ]}
        onValueChange={chooseProfile}
      />
      <Textarea
        aria-label={label}
        value={effectiveText}
        readOnly={!custom}
        maxLength={4000}
        rows={4}
        placeholder={placeholder}
        onChange={editProfile}
      />
      {customWithoutPreview.has(field) && presetId != null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Keep saved ${label.toLowerCase()} preset`}
          onClick={keepSavedPreset}
        >
          保留已保存的预设
        </Button>
      )}
      {presetId && (
        <div className="space-y-1 text-xs text-muted-foreground break-words">
          <p>
            {selectionLabel}: {presetId}
          </p>
          {preset ? (
            <>
              <p>Catalog version: {catalogVersion}</p>
              {preset.model && <p>Model: {preset.model}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {preset.sources.map((source, index) => (
                  <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="underline">
                    Source {index + 1}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p>预设预览不可用。已保存的引用会保留</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FuseProfilePresets({
  value,
  onChange,
}: {
  value: FuseSettings;
  onChange: (value: FuseSettings) => void;
}) {
  const id = React.useId();
  const [customWithoutPreview, setCustomWithoutPreview] = React.useState<ReadonlySet<FuseProfileField>>(
    () => new Set(),
  );
  const { data, isPending, isError } = $api.useQuery(
    "get",
    "/public/complexity_router/fuse_presets",
    {},
    catalogQueryOptions,
  );
  return (
    <div className="space-y-4 min-w-0">
      <p className="text-xs text-muted-foreground">
        Choose profiles that match every deployment in each solver group and its actual settings. Profile selection is
        independent of routing model names. Presets describe the solvers and runtime; they do not set a quality gap or
        calibration. Validate those separately for your workload, judge, and exact profile versions.
      </p>
      {isPending && (
        <p role="status" className="text-xs text-muted-foreground">
          正在加载配置预设。可以自定义编辑
        </p>
      )}
      {isError && (
        <p role="status" className="text-xs text-muted-foreground">
          无法加载配置预设。已保存的引用会保留，可以自定义编辑
        </p>
      )}
      {fuseProfileFields.map((field) => (
        <FuseProfilePresetField
          key={field}
          id={id}
          field={field}
          value={value}
          onChange={onChange}
          presets={field === "harness" ? data?.harnesses : data?.models}
          catalogVersion={data?.version}
          customWithoutPreview={customWithoutPreview}
          setCustomWithoutPreview={setCustomWithoutPreview}
        />
      ))}
    </div>
  );
}
