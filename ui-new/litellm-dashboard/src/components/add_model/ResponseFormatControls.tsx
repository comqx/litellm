import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const ResponseFormatControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => (
  <>
    <div className="flex items-center gap-2 mb-2">
      <Switch
        checked={value.return_raw_model_name ?? false}
        onCheckedChange={(returnRawModelName) => onChange({ ...value, return_raw_model_name: returnRawModelName })}
        aria-label="返回原始 模型名称"
      />
      <strong className="font-semibold">返回原始 模型名称</strong>
    </div>
    <span className="block text-xs text-muted-foreground">
      在响应中返回解析后的底层 模型名称，而不是 自动路由 别名。
    </span>
    <div className="mt-4 flex items-center gap-2 mb-2">
      <Switch
        checked={value.max_tokens_from_tier_model ?? true}
        onCheckedChange={(enabled) => onChange({ ...value, max_tokens_from_tier_model: enabled })}
        aria-label="将 max_tokens 限制为层级模型的输出上限"
      />
      <strong className="font-semibold">Cap max_tokens at the tier model&apos;s output ceiling</strong>
    </div>
    <span className="block text-xs text-muted-foreground">
      Replace the caller&apos;s max_tokens with the routed tier model&apos;s output ceiling so one client value fits
      every tier. Off forwards the caller&apos;s value unchanged.
    </span>
  </>
);

export default ResponseFormatControls;
