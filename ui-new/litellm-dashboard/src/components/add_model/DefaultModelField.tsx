import React from "react";
import { Info } from "lucide-react";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { isForecastClassifier } from "./forecast_classifier_config";
import { resolveComplexityDefaultModel } from "./tier_rows";

interface DefaultModelFieldProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
}

const defaultModelPlaceholderFor = (derivedDefaultModel: string | undefined, isCustomSet: boolean): string => {
  if (derivedDefaultModel) return `从层级推导：${derivedDefaultModel}`;
  return isCustomSet ? "为你的 回退层级添加模型" : "为「简单」或「中等」层级添加模型";
};

const DefaultModelField = ({ value, onChange, modelOptions }: DefaultModelFieldProps) => {
  const defaultModelPlaceholder = defaultModelPlaceholderFor(
    resolveComplexityDefaultModel(value),
    Boolean(value.custom_tier_set),
  );
  // Clearing the select drops the key entirely rather than storing "", so an emptied pin reads as
  // "track the tiers" everywhere downstream instead of as a blank model name.
  const handleDefaultModelChange = (model: string | null | undefined) => {
    onChange({ ...value, default_model: model || undefined });
  };

  return (
    <div className="mt-4 mb-2" role="group" aria-label="默认模型配置">
      <div className="flex items-center gap-2 mb-2">
        <strong className="text-base font-semibold">默认模型</strong>
        <SimpleTooltip content="留空则跟随层级。在这里选择的 模型 会被固定：无论层级如何变化，它都保持为默认。">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <SearchSelect
        options={modelOptions}
        value={value.default_model ?? ""}
        onValueChange={handleDefaultModelChange}
        placeholder={defaultModelPlaceholder}
        emptyText="未找到模型"
        aria-label="默认模型"
      />
      <span className="block mt-1 text-xs text-muted-foreground">
        {isForecastClassifier(value.classifier_type)
          ? "当路由找不到合适的 模型 时使用。分类器失败时会路由到强大的求解模型。"
          : 'Used when the tier the request lands in has no model, and when the classifier fails with "路由到默认模型" selected.'}
      </span>
    </div>
  );
};

export default DefaultModelField;
