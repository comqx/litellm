import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import React from "react";

import type { ClassifierLLMConfig } from "./ComplexityRouterConfig";

export const DEFAULT_CLASSIFIER_CIRCUIT_BREAKER_ENABLED = true;
export const DEFAULT_CLASSIFIER_CIRCUIT_BREAKER_COOLDOWN_SECONDS = 30;

const COOLDOWN_ID = "classifier-circuit-breaker-cooldown-seconds";

interface ClassifierCircuitBreakerConfigProps {
  value: ClassifierLLMConfig;
  onChange: (value: ClassifierLLMConfig) => void;
}

const ClassifierCircuitBreakerConfig: React.FC<ClassifierCircuitBreakerConfigProps> = ({ value, onChange }) => {
  const [draftCooldown, setDraftCooldown] = React.useState<string | null>(null);
  const enabled = value.circuit_breaker_enabled ?? DEFAULT_CLASSIFIER_CIRCUIT_BREAKER_ENABLED;

  const handleCooldownChange = (raw: string) => {
    setDraftCooldown(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange({
      ...value,
      circuit_breaker_cooldown_seconds: Math.max(1, Math.round(parsed)),
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(circuit_breaker_enabled) => onChange({ ...value, circuit_breaker_enabled })}
          aria-label="分类器熔断器"
        />
        <strong className="font-semibold">分类器熔断器</strong>
      </div>
      <span className="block text-xs text-muted-foreground">
        一次分类器超时后，立即对所有会话使用 回退，直到恢复探测成功。
        默认启用。
      </span>
      {enabled && (
        <div>
          <Label htmlFor={COOLDOWN_ID} className="block mb-1 font-semibold">
            Circuit breaker cooldown (seconds)
          </Label>
          <Input
            id={COOLDOWN_ID}
            type="text"
            inputMode="numeric"
            value={
              draftCooldown ??
              String(value.circuit_breaker_cooldown_seconds ?? DEFAULT_CLASSIFIER_CIRCUIT_BREAKER_COOLDOWN_SECONDS)
            }
            onChange={(event) => handleCooldownChange(event.target.value)}
            onBlur={() => setDraftCooldown(null)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default ClassifierCircuitBreakerConfig;
