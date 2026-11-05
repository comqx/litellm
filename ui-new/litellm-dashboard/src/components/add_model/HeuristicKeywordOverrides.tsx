import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const fields = [
  ["code_keywords", "代码关键词"],
  ["reasoning_keywords", "推理关键词"],
  ["technical_keywords", "技术关键词"],
  ["simple_keywords", "简单关键词"],
] as const;

const HeuristicKeywordOverrides: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      每个列表都会替换启发式评分器中同名的内置关键词列表。留空则保留内置列表。
      如需添加技术术语而不替换列表，请使用「分类方式」下的自定义技术关键词。
    </p>
    {fields.map(([key, label]) => {
      const keywords = value[key] ?? [];
      return (
        <div key={key}>
          <strong className="mb-1 block font-semibold">{label}</strong>
          <MultiSelect
            options={keywords.map((keyword) => ({ label: keyword, value: keyword }))}
            value={keywords}
            onValueChange={(next) => onChange({ ...value, [key]: next.length > 0 ? next : undefined })}
            placeholder={`Add ${label.toLowerCase()}`}
            emptyText="输入以添加关键词"
            allowCustomValues
            className="w-full"
          />
        </div>
      );
    })}
  </div>
);

export default HeuristicKeywordOverrides;
