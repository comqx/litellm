import React from "react";
import { CircleHelp } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RateLimitType = "tpm" | "rpm";

interface RateLimitTypeOption {
  value: string;
  label: string;
  description: string;
}

interface RateLimitTypeFormItemProps {
  /** The type of rate limit - either 'tpm' or 'rpm' */
  type: RateLimitType;
  /** The form field name */
  name: string;
  /** Whether to show detailed descriptions (default: true) */
  showDetailedDescriptions?: boolean;
  /** Additional CSS classes */
  className?: string;
  value?: string | null;
  /** Custom onChange handler */
  onChange?: (value: string) => void;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: true | undefined;
  "aria-describedby"?: string | undefined;
}

const rateLimitTypeOptions = (type: RateLimitType): RateLimitTypeOption[] => {
  const upper = type.toUpperCase();
  const lower = type.toLowerCase();
  return [
    {
      value: "best_effort_throughput",
      label: "默认",
      description: `Best effort 至put - no error if we're overallocating ${lower} (Team/Key Limits checked at runtime).`,
    },
    {
      value: "guaranteed_throughput",
      label: "保证吞吐",
      description: `Guaranteed 至put - raise an error if we're overallocating ${lower} (also checks model-specific limits)`,
    },
    {
      value: "dynamic",
      label: "动态",
      description: `如果 Key 设置了 ${upper} 上限（例如 2 ${upper}）且没有 429 错误，当被调用的 Model 未报错时，可以动态超出限制。`,
    },
  ];
};

const plainLabels: Record<string, string> = {
  best_effort_throughput: "尽力吞吐",
  guaranteed_throughput: "保证吞吐",
  dynamic: "动态",
};

const rateLimitTypeLabelText = (type: RateLimitType): string => `${type.toUpperCase()} 限流类型`;

const rateLimitTypeTooltip = (type: RateLimitType): string =>
  `Select 'guaranteed_throughput' to prevent overallocating ${type.toUpperCase()} limit when the key belongs to a Team with specific ${type.toUpperCase()} limits.`;

export const RateLimitTypeFormItem: React.FC<RateLimitTypeFormItemProps> = ({
  type,
  name,
  showDetailedDescriptions = true,
  className = "",
  value,
  onChange,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}) => {
  const controlId = id ?? `rate-limit-type-${name}`;
  const options = rateLimitTypeOptions(type);

  return (
    <div className={className}>
      <TooltipProvider>
        <label htmlFor={controlId} className="mb-2 flex items-center gap-1 text-sm text-foreground">
          {rateLimitTypeLabelText(type)}
          <Tooltip>
            <TooltipTrigger
              render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />}
              aria-label={rateLimitTypeTooltip(type)}
            />
            <TooltipContent>{rateLimitTypeTooltip(type)}</TooltipContent>
          </Tooltip>
        </label>
      </TooltipProvider>
      <Select
        value={value ?? null}
        onValueChange={(next: string | null) => next !== null && onChange?.(next)}
        disabled={disabled}
      >
        <SelectTrigger id={controlId} className="w-full" aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
          <SelectValue placeholder="请选择限流类型">
            {(selected: string | null) =>
              selected === null ? "请选择限流类型" : plainLabels[selected] ?? selected
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) =>
            showDetailedDescriptions ? (
              <SelectItem key={option.value} value={option.value} title={option.label}>
                <span className="flex flex-col py-1">
                  <span className="font-medium">{option.label}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">{option.description}</span>
                </span>
              </SelectItem>
            ) : (
              <SelectItem key={option.value} value={option.value} title={plainLabels[option.value]}>
                {plainLabels[option.value]}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RateLimitTypeFormItem;
