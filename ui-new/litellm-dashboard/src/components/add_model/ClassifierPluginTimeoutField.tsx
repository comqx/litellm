import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { getClassifierPluginTimeoutError } from "./build_complexity_router_config";

const CLASSIFIER_PLUGIN_TIMEOUT_ID = "classifier-plugin-timeout-ms";

interface ClassifierPluginTimeoutFieldProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  showValidationErrors?: boolean;
}

const ClassifierPluginTimeoutField: React.FC<ClassifierPluginTimeoutFieldProps> = ({
  value,
  onChange,
  showValidationErrors = false,
}) => {
  const error = getClassifierPluginTimeoutError("custom", value.classifier_plugin_timeout_ms);
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-muted-foreground">
        此路由器使用 config.yaml 中设置的自定义分类器插件。在下方选择一个分类器来替换它。
      </p>
      <Label htmlFor={CLASSIFIER_PLUGIN_TIMEOUT_ID} className="block font-semibold">
        Classifier plugin timeout (ms)
      </Label>
      <Input
        id={CLASSIFIER_PLUGIN_TIMEOUT_ID}
        inputMode="numeric"
        placeholder="3000"
        value={value.classifier_plugin_timeout_ms ?? ""}
        onChange={(event) =>
          onChange({
            ...value,
            classifier_plugin_timeout_ms: event.target.value.trim() === "" ? undefined : Number(event.target.value),
          })
        }
        aria-invalid={Boolean(showValidationErrors && error)}
      />
      <p className="text-sm text-muted-foreground">
        插件调用的时间预算。超时后由 Fallback 路径决定层级。
      </p>
      {showValidationErrors && error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ClassifierPluginTimeoutField;
