import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const ContextWindowEscalationConfig: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.enable_context_window_escalation ?? false;
  // A number input renders Number("0.") as "0", so a decimal cannot be typed without a local draft.
  const [bufferDraft, setBufferDraft] = React.useState<string | null>(null);
  const commitBuffer = (raw: string) => {
    setBufferDraft(null);
    if (raw.trim() === "") {
      onChange({ ...value, context_window_escalation_buffer: undefined });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange({ ...value, context_window_escalation_buffer: Math.min(1, Math.max(0.01, parsed)) });
  };
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={enabled}
          onCheckedChange={(next) => onChange({ ...value, enable_context_window_escalation: next })}
          aria-label="将超出上下文窗口的提示词升级到合适的层级"
        />
        <strong className="font-semibold">将超出上下文窗口的提示词升级到合适的层级</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        When a prompt provably cannot fit the decided tier&apos;s context windows, route it to the lowest tier whose
        当提示词确定无法放入所选层级的上下文窗口时，将其路由到能容纳它的最低层级，
        而不是让 Provider 拒绝它。默认关闭。关闭时请求仅按复杂度分发。
      </span>
      {enabled && (
        <div style={{ maxWidth: 320 }}>
          <label className="block text-sm font-medium mb-1" htmlFor="context-window-escalation-buffer">
            窗口容纳缓冲
          </label>
          <Input
            id="context-window-escalation-buffer"
            inputMode="decimal"
            value={bufferDraft ?? value.context_window_escalation_buffer ?? ""}
            placeholder="0.95"
            onChange={(event) => setBufferDraft(event.target.value)}
            onBlur={(event) => commitBuffer(event.target.value)}
          />
          <span className="block text-xs mt-1 text-muted-foreground">
            Fraction of a model&apos;s window the counted prompt must fit within, above 0 up to 1. Empty tracks the
            backend default of 0.95.
          </span>
        </div>
      )}
    </>
  );
};

export default ContextWindowEscalationConfig;
