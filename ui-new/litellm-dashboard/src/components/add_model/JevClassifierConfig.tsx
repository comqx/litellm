import React, { useId } from "react";
import { AutoRouterAllowanceNote } from "./AutoRouterAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ClassifierCircuitBreakerConfig from "./ClassifierCircuitBreakerConfig";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultJevClassifierConfig, fixedClassifierModels } from "./jev_classifier_config";

const providerDescriptions = {
  jev: "使用 TypeSafe System One Choice 评估与你配置的层级",
  laya: "使用 Laya 与你配置的层级。在网关上设置 LAYA_API_BASE 以连接 Laya 服务器。",
  bespoke:
    "使用 Bespoke Nimble 与你配置的层级。在网关上设置 BESPOKE_API_BASE 以连接 Nimble 服务器。",
  databricks:
    "使用 Databricks ai_decide Serving 端点与你配置的层级。在网关上设置 DATABRICKS_API_BASE 与 DATABRICKS_API_KEY，并将 Serving 端点名称填为分类器模型。",
};

export default function JevClassifierConfig({
  value,
  onChange,
  section = "all",
}: {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  section?: "all" | "model" | "advanced";
}) {
  const id = useId();
  const config = value.jev_classifier_config ?? defaultJevClassifierConfig();
  const models = fixedClassifierModels(config.provider);
  const update = (patch: Partial<typeof config>) =>
    onChange({ ...value, jev_classifier_config: { ...config, ...patch } });

  return (
    <div className={section === "model" ? "space-y-3" : "mt-4 space-y-3"}>
      {section !== "advanced" && !config.deployment_name && (
        <>
          <p className="text-sm text-muted-foreground">{providerDescriptions[config.provider ?? "jev"]}</p>
          <div className="space-y-2">
            <Label htmlFor={`${id}-model`}>分类器模型</Label>
            {models ? (
              <Select value={config.model} onValueChange={(model) => model && update({ model })}>
                <SelectTrigger id={`${id}-model`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`${id}-model`}
                value={config.model}
                placeholder={
                  config.provider === "databricks"
                    ? "Serving 端点名称，例如 databricks-openjev-qwen35-4b"
                    : undefined
                }
                onChange={(event) => update({ model: event.target.value })}
              />
            )}
          </div>
        </>
      )}
      {section !== "model" && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${id}-timeout`}>Classifier Timeout (ms)</Label>
            <Input
              id={`${id}-timeout`}
              type="number"
              min={1}
              step={1}
              value={config.timeout_ms}
              onChange={(event) => update({ timeout_ms: Number(event.target.value) })}
            />
          </div>
          <ClassifierCircuitBreakerConfig
            value={config}
            onChange={(next) =>
              update({
                circuit_breaker_enabled: next.circuit_breaker_enabled,
                circuit_breaker_cooldown_seconds: next.circuit_breaker_cooldown_seconds,
              })
            }
          />
          <div className="space-y-2">
            <Label htmlFor={`${id}-instructions`}>分类器指令</Label>
            <AutoRouterAllowanceNote
              feature="tier_or_classifier_prompt"
              label="自定义指令占用自定义层级配额"
            />
            <Textarea
              id={`${id}-instructions`}
              value={config.instructions ?? ""}
              placeholder="留空则使用内置指令"
              onChange={(event) => update({ instructions: event.target.value || undefined })}
            />
            {config.instructions && (
              <Button variant="outline" type="button" onClick={() => update({ instructions: undefined })}>
                Restore built-in instructions
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Built-in decision model classification is available without a license and uses the shipped tier criteria
            </p>
          </div>
        </>
      )}
    </div>
  );
}
