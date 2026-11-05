import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Switch } from "@/components/ui/switch";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const HousekeepingRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.route_housekeeping_to_cheapest_tier ?? true;
  const patterns = value.housekeeping_patterns ?? [];
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(next) => onChange({ ...value, route_housekeeping_to_cheapest_tier: next })}
          aria-label="将 Housekeeping 调用路由到最便宜的层级"
        />
        <strong className="font-semibold">将 Housekeeping 调用路由到最便宜的层级</strong>
      </div>
      <span className="mb-3 block text-xs text-muted-foreground">
        会话标题类的调用会跳过分类器，直接进入最便宜的层级。
      </span>
      <strong className="mb-1 block font-semibold">额外的 Housekeeping 哨兵词</strong>
      <MultiSelect
        options={patterns.map((pattern) => ({ label: pattern, value: pattern }))}
        value={patterns}
        onValueChange={(next) => onChange({ ...value, housekeeping_patterns: next.length > 0 ? next : undefined })}
        placeholder="例如会话标题"
        emptyText="输入以添加哨兵词"
        allowCustomValues
        disabled={!enabled}
        className="w-full"
      />
      <span className="mt-1 block text-xs text-muted-foreground">
        追加到内置会话标题哨兵词的区分大小写的字面字符串。
        {!enabled && " 开启 Housekeeping 路由后这些才会生效。"}
      </span>
    </>
  );
};

export default HousekeepingRoutingControls;
