import React, { useContext, useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { ChevronDownIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  effectiveClassifierType,
  type ClassifierType,
  type ComplexityRouterConfigValue,
} from "./ComplexityRouterConfig";
import {
  defaultJevClassifierConfig,
  isOssClassifierProvider,
  normalizeJevClassifierConfig,
} from "./jev_classifier_config";
import { transitionClassifierType } from "./classifier_type_transition";
import { isForecastClassifier } from "./forecast_classifier_config";
import {
  AutoRouterAllowanceLabel,
  AutoRouterAvailabilityContext,
  AutoRouterLimits,
  AutoRouterContactLink,
  isAllowanceExhausted,
  AUTO_ROUTER_CONTACT_URL,
} from "./AutoRouterAvailability";

export function ClassifierOption({
  value,
  label,
  description,
  feature,
  disabled,
  unlimited = true,
}: {
  value: string;
  label: string;
  description: string;
  feature?: string;
  disabled?: boolean;
  unlimited?: boolean;
}) {
  const state = useContext(AutoRouterAvailabilityContext);
  const allowance = state.data?.allowances.find((entry) => entry.key === feature);
  const fresh = !state.isPending && !state.isError && !state.isChecking;
  const exhausted = isAllowanceExhausted(allowance);
  return (
    <div className="relative">
      <DropdownMenuRadioItem value={value} disabled={disabled || exhausted} closeOnClick className="py-3">
        <span className="grid w-full min-w-0 gap-1 whitespace-normal">
          <span className="flex items-center justify-between gap-3">
            <span className="font-medium">{label}</span>
            {feature ? (
              <AutoRouterAllowanceLabel feature={feature} />
            ) : (
              unlimited && <span className="shrink-0 text-xs leading-5 text-muted-foreground">不限量</span>
            )}
          </span>
          <span className={`text-xs leading-5 text-muted-foreground ${exhausted ? "pr-28" : ""}`}>{description}</span>
        </span>
      </DropdownMenuRadioItem>
      {fresh && exhausted && (
        <DropdownMenuItem
          render={<a href={AUTO_ROUTER_CONTACT_URL} target="_blank" rel="noopener noreferrer" />}
          aria-label={`联系我们的团队了解 ${label}`}
          className="absolute top-9 right-8 cursor-pointer px-0 py-0 text-xs leading-5 font-medium text-blue-600 focus:text-blue-600 hover:underline dark:text-blue-400 dark:focus:text-blue-400"
        >
          联系我们的团队
        </DropdownMenuItem>
      )}
    </div>
  );
}

export function ClassifierMenu({
  id,
  label,
  value,
  selectedLabel,
  feature,
  onValueChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  selectedLabel: string;
  feature?: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        aria-label={label}
        render={<Button variant="outline" className="w-full justify-between font-normal" />}
      >
        <span className="flex-1 text-left">{selectedLabel}</span>
        {feature ? (
          <AutoRouterAllowanceLabel feature={feature} />
        ) : (
          <span className="text-xs text-muted-foreground">不限量</span>
        )}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {children}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AutoRouterClassifierTabsProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  children: React.ReactNode;
  judgeModel?: React.ReactNode;
  decisionModel?: React.ReactNode;
}

const AutoRouterClassifierTabs: React.FC<AutoRouterClassifierTabsProps> = ({
  value,
  onChange,
  children,
  judgeModel,
  decisionModel,
}) => {
  const id = useId();
  const availability = useContext(AutoRouterAvailabilityContext);
  const classifierType = effectiveClassifierType(value);
  const familyByType: Record<ClassifierType, string> = {
    heuristic: "heuristics",
    heuristic_v2: "heuristics",
    llm: "llm",
    heuristic_first: "llm",
    hybrid: "llm",
    capability: "llm",
    llm_v2: "llm",
    jev: "jev",
    custom: "custom",
  };
  const family = familyByType[classifierType];
  const hasCustomTiers = Boolean(value.custom_tier_set);
  const changeType = (next: ClassifierType) => {
    if (next !== classifierType) onChange(transitionClassifierType(value, next));
  };

  const changeFamily = (next: unknown) => {
    if (next === family) return;
    if (next === "heuristics") changeType("heuristic");
    if (next === "llm") changeType("llm");
    if (next === "jev") changeType("jev");
  };
  const changeProvider = (provider: unknown) => {
    if (!isOssClassifierProvider(provider)) return;
    const defaults = defaultJevClassifierConfig(provider);
    onChange({
      ...value,
      jev_classifier_config: { ...defaults, ...value.jev_classifier_config, provider, model: defaults.model },
    });
  };
  const approachLabels: Partial<Record<ClassifierType, string>> = { capability: "能力", llm_v2: "Fuse v2" };
  const approachDescription: Partial<Record<ClassifierType, string>> = {
    capability: "当高效模型 可能成功时使用它",
    llm_v2: "当高效模型 的预测质量与强大 Model 足够接近时使用它",
  };
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="m-0 text-xl font-semibold text-foreground">选择分类器</h4>
            <SimpleTooltip content="选择如何评估请求并路由到各层级">
              <button type="button" aria-label="关于分类器" className="text-muted-foreground">
                <Info className="size-4" />
              </button>
            </SimpleTooltip>
          </div>
          <AutoRouterLimits />
        </legend>
        <RadioGroup value={family} onValueChange={changeFamily} className="grid gap-3 sm:grid-cols-3">
          {[
            { value: "heuristics", label: "启发式", description: "本地分类，无需 API 调用" },
            { value: "llm", label: "LLM", description: "使用评判模型 来选择求解模型" },
            {
              value: "jev",
              label: "决策模型",
              description: "使用决策模型选择层级",
            },
          ].map((option) => (
            <Label
              key={option.value}
              className="cursor-pointer items-start rounded-lg border p-4 transition-colors hover:bg-muted/50 has-data-checked:border-primary has-data-checked:bg-primary/5"
            >
              <RadioGroupItem
                aria-describedby={`${id}-${option.value}-description`}
                value={option.value}
                disabled={option.value === "heuristics" && hasCustomTiers}
              />
              <span className="space-y-1">
                <span className="block font-medium">{option.label}</span>
                <span
                  id={`${id}-${option.value}-description`}
                  aria-hidden="true"
                  className="block text-xs font-normal text-muted-foreground"
                >
                  {option.description}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      {family === "jev" &&
        (decisionModel ?? (
          <div className="space-y-2">
            <Label htmlFor={`${id}-decision-model`}>决策模型</Label>
            <Select
              items={[
                { value: "jev", label: "Jev" },
                { value: "laya", label: "Laya" },
                { value: "bespoke", label: "Bespoke Nimble" },
                { value: "databricks", label: "Databricks" },
              ]}
              value={normalizeJevClassifierConfig(value.jev_classifier_config).provider}
              onValueChange={changeProvider}
            >
              <SelectTrigger id={`${id}-decision-model`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jev">Jev</SelectItem>
                <SelectItem value="laya">Laya</SelectItem>
                <SelectItem value="bespoke">Bespoke Nimble</SelectItem>
                <SelectItem value="databricks">Databricks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      {family === "custom" && (
        <p className="text-sm text-muted-foreground">此路由器使用自定义分类器插件</p>
      )}
      {family === "heuristics" && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-heuristic`}>启发式</Label>
          <ClassifierMenu
            id={`${id}-heuristic`}
            label="启发式"
            selectedLabel={classifierType === "heuristic_v2" ? "Heuristic v2" : "Rule-based"}
            feature={classifierType === "heuristic_v2" ? "heuristic_v2" : undefined}
            value={classifierType}
            onValueChange={(next) => {
              if (next === "heuristic" || next === "heuristic_v2") changeType(next);
            }}
          >
            <ClassifierOption
              value="heuristic"
              label="Rule-based"
              description="使用本地规则为请求评分以选择层级，无需 API 调用"
            />
            <ClassifierOption
              value="heuristic_v2"
              label="Heuristic v2"
              description="使用校准概率将请求匹配到层级，无需 API 调用"
              feature="heuristic_v2"
            />
          </ClassifierMenu>
          <p className="text-xs text-muted-foreground">
            {classifierType === "heuristic_v2"
              ? "使用校准概率将请求匹配到层级"
              : "使用评分规则匹配请求。可自由选择或更改层级 Models"}
          </p>
        </div>
      )}
      {family === "llm" && judgeModel}
      {family === "llm" && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-approach`}>路由方式</Label>
          <ClassifierMenu
            id={`${id}-approach`}
            label="路由方式"
            selectedLabel={approachLabels[classifierType] ?? "复杂度"}
            feature={isForecastClassifier(classifierType) ? classifierType : undefined}
            value={isForecastClassifier(classifierType) ? classifierType : "llm"}
            onValueChange={(next) => {
              if (next === "llm" || next === "capability" || next === "llm_v2") {
                if (next === "llm" && !isForecastClassifier(classifierType)) return;
                changeType(next);
              }
            }}
          >
            <ClassifierOption
              value="llm"
              label="复杂度"
              description="将任务难度匹配到层级，然后使用该层级的某个 Model"
            />
            {family === "llm" && (
              <>
                <ClassifierOption
                  value="capability"
                  label="能力"
                  description="当高效模型 可能成功时使用它，否则使用强大 Model"
                  feature="capability"
                  disabled={hasCustomTiers}
                />
                <ClassifierOption
                  value="llm_v2"
                  label="能力"
                  description="当高效模型 的预测质量与强大 Model 足够接近时使用它"
                  feature="llm_v2"
                  disabled={hasCustomTiers}
                />
              </>
            )}
          </ClassifierMenu>
          <p className="text-xs text-muted-foreground">
            {approachDescription[classifierType] ?? "将任务难度匹配到层级"}
          </p>
        </div>
      )}
      {hasCustomTiers && (
        <p className="text-xs text-muted-foreground">
          恢复标准层级以使用启发式、能力或 Fuse v2
        </p>
      )}
      {availability.data?.error && !availability.isChecking && (
        <div role="alert" className="space-y-1">
          <p className="text-sm text-destructive">{availability.data.error}</p>
          <AutoRouterContactLink />
        </div>
      )}
      {availability.isError && (
        <p className="text-xs text-muted-foreground">
          Could not check availability.{" "}
          <button type="button" className="underline" onClick={() => availability.refetch?.()}>
            重试
          </button>
        </p>
      )}
      {children}
    </div>
  );
};

export default AutoRouterClassifierTabs;
