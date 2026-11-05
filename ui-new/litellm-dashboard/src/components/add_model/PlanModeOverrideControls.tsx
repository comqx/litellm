import React from "react";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/shared/MultiSelect";
import TierRowSelect from "./TierRowSelect";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const PlanModeOverrideControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  planModeTierOptions: { value: string; label: string }[];
}> = ({ value, onChange, planModeTierOptions }) => (
  <>
    <div className="flex items-center gap-2 mb-2">
      <Switch
        checked={value.plan_mode_min_tier !== undefined}
        disabled={planModeTierOptions.length === 0}
        onCheckedChange={(enabled) =>
          onChange({
            ...value,
            plan_mode_min_tier: enabled ? planModeTierOptions.at(-1)?.value : undefined,
          })
        }
        aria-label="将计划模式的请求路由到最低层级"
      />
      <strong className="font-semibold">将计划模式的请求路由到最低层级</strong>
    </div>
    <span className="block text-xs mb-3 text-muted-foreground">
      Requests from coding agents in plan mode (Claude Code, GitHub Copilot) route to at least this tier. The classifier
      still wins when it picks higher, and the override only lasts while plan mode is active.
      {planModeTierOptions.length === 0 && " 为层级添加模型s 以启用此功能。"}
    </span>
    {value.plan_mode_min_tier !== undefined && (
      <div style={{ maxWidth: 320 }}>
        <TierRowSelect
          label="计划模式最低层级"
          options={planModeTierOptions}
          value={value.plan_mode_min_tier ?? null}
          onValueChange={(tier) => onChange({ ...value, plan_mode_min_tier: tier })}
        />
      </div>
    )}
    <div className="mt-4">
      <strong className="mb-1 block font-semibold">额外的计划模式哨兵词</strong>
      <MultiSelect
        options={(value.plan_mode_patterns ?? []).map((pattern) => ({ label: pattern, value: pattern }))}
        value={value.plan_mode_patterns ?? []}
        onValueChange={(patterns) =>
          onChange({ ...value, plan_mode_patterns: patterns.length > 0 ? patterns : undefined })
        }
        placeholder="例如进入计划模式"
        emptyText="输入以添加哨兵词"
        allowCustomValues
        className="w-full"
      />
      <span className="mt-1 block text-xs text-muted-foreground">
        追加到内置 Claude Code 和 Copilot 计划模式标记的区分大小写的字面字符串。
      </span>
    </div>
  </>
);

export default PlanModeOverrideControls;
