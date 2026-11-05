import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { type ComplexityRouterConfigValue, classificationFrequency } from "./ComplexityRouterConfig";

export const DEFAULT_STALL_ESCALATION_WINDOW = 6;
export const DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD = 3;

/**
 * Why the toggle is unavailable, or null when it can be turned on. Both blockers replay a held
 * routing decision instead of classifying most turns, so detection would never see the tool
 * calls it reads.
 */
export const stallEscalationBlockedReason = (value: ComplexityRouterConfigValue): string | null => {
  const frequency = classificationFrequency(value);
  if (frequency === "session")
    return '请在「高级：分类方式」下将「分类频率」设为每个请求以使用此功能。每个会话只评分一次会重放该 Model 而不重新分类，因此停滞永远不会到达分类器。';
  if (frequency === "user_turn")
    return '请在「高级：分类方式」下将「分类频率」设为每个请求以使用此功能。只评分新用户消息会跳过停滞所出现的工具调用轮次。';
  return null;
};

const clampedInt = (raw: string, min: number, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.trunc(parsed));
};

const StallEscalationConfig: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.stall_escalation_enabled ?? false;
  const blockedReason = stallEscalationBlockedReason(value);
  const window = value.stall_escalation_window ?? DEFAULT_STALL_ESCALATION_WINDOW;
  const threshold = value.stall_escalation_repeat_threshold ?? DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD;
  // A threshold above the window can never be reached, and the backend rejects the pair, so the
  // window rises with the threshold rather than letting the form save something inert.
  const commitThreshold = (raw: string) => {
    const nextThreshold = clampedInt(raw, 2, DEFAULT_STALL_ESCALATION_REPEAT_THRESHOLD);
    onChange({
      ...value,
      stall_escalation_repeat_threshold: nextThreshold,
      stall_escalation_window: Math.max(window, nextThreshold),
    });
  };
  const commitWindow = (raw: string) => {
    const nextWindow = clampedInt(raw, 1, DEFAULT_STALL_ESCALATION_WINDOW);
    onChange({
      ...value,
      stall_escalation_window: Math.max(nextWindow, threshold),
    });
  };
  const toggle = (next: boolean) => {
    const enabledValue: ComplexityRouterConfigValue = {
      ...value,
      stall_escalation_enabled: next || undefined,
      stall_escalation_window: next ? window : undefined,
      stall_escalation_repeat_threshold: next ? threshold : undefined,
    };
    onChange(enabledValue);
  };
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={enabled}
          // Blocked only prevents turning it on: an already-on router that just became
          // blocked (e.g. session pinning turned on afterward) still needs a way to turn
          // this back off, since the backend rejects saving both together.
          disabled={blockedReason !== null && !enabled}
          onCheckedChange={toggle}
          aria-label="将停滞的任务升级到更强的 Model"
        />
        <strong className="font-semibold">将停滞的任务升级到更强的 Model</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        当 Model 不断重复同一个工具调用，或同一个调用持续出错时，在任务看起来卡住期间
        将请求提升一个层级。这是升级关键词的自动化版本：不需要有人发现
        这个循环并手动提出。关闭时卡住的任务会保持其被分类到的 模型。
        {blockedReason !== null && ` ${blockedReason}`}
      </span>
      {enabled && blockedReason === null && (
        <div className="flex flex-wrap gap-4">
          <div style={{ maxWidth: 240 }}>
            <label className="block text-sm font-medium mb-1" htmlFor="stall-escalation-repeat-threshold">
              升级前的重复次数
            </label>
            <Input
              id="stall-escalation-repeat-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => commitThreshold(event.target.value)}
            />
            <span className="block text-xs mt-1 text-muted-foreground">
              How many identical or failing calls count as stuck. At least 2; lower reacts sooner and misfires more.
            </span>
          </div>
          <div style={{ maxWidth: 240 }}>
            <label className="block text-sm font-medium mb-1" htmlFor="stall-escalation-window">
              检查的最近调用数
            </label>
            <Input
              id="stall-escalation-window"
              inputMode="numeric"
              value={window}
              onChange={(event) => commitWindow(event.target.value)}
            />
            <span className="block text-xs mt-1 text-muted-foreground">
              向前回看多少个工具调用。不会低于重复次数，否则永远无法达到。
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default StallEscalationConfig;
