import { CircleHelp, Minus, Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import NumericalInput from "../shared/numerical_input";

export const CACHE_CONTROL_LABEL = "缓存控制注入点";

export const CACHE_CONTROL_TOOLTIP =
  "告诉 LiteLLM 在何处注入缓存控制检查点。可以按角色应用到该角色的全部消息，也可以按具体消息索引指定。";

export const CACHE_CONTROL_DESCRIPTION =
  "Anthropic、Bedrock API 等提供商要求指定缓存控制检查点的注入位置。LiteLLM 可以自动添加，用来节省费用。";

export const CACHE_CONTROL_ROLE_HINT = "LiteLLM 会将该角色的全部消息标记为可缓存";

export const CACHE_CONTROL_INDEX_HINT = "（可选）设置后，LiteLLM 会将此索引处的消息标记为可缓存";

export type CacheControlRole = "user" | "system" | "assistant";

export interface CacheControlInjectionPoint {
  location: "message";
  role?: CacheControlRole;
  index?: string | number;
}

export const NEW_CACHE_CONTROL_POINT: CacheControlInjectionPoint = { location: "message" };

const LOCATION_ITEMS = [{ value: "message", label: "消息" }] as const;

const ROLE_ITEMS = [
  { value: "user", label: "用户" },
  { value: "system", label: "系统" },
  { value: "assistant", label: "助手" },
] as const;

const LabelWithHint: React.FC<{ label: string; hint: string }> = ({ label, hint }) => (
  <div className="flex items-center">
    <Label>{label}</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`${label}帮助`}
              className="ml-1 inline-flex cursor-help items-center rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          }
        >
          <CircleHelp aria-hidden className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

interface CacheControlInjectionPointsProps {
  value?: CacheControlInjectionPoint[];
  onChange?: (points: CacheControlInjectionPoint[]) => void;
}

/**
 * Editor for `cache_control_injection_points`. It holds no form state of its own so that an antd
 * `Form.Item` and a react-hook-form `FormField` can each host it while their pages migrate
 * independently; both hand a child exactly `value` and `onChange`.
 */
const CacheControlInjectionPoints: React.FC<CacheControlInjectionPointsProps> = ({ value, onChange }) => {
  const points = value ?? [];

  const replaceAt = (index: number, point: CacheControlInjectionPoint) =>
    onChange?.(points.map((existing, position) => (position === index ? point : existing)));

  return (
    <div className="ml-6 border-l-2 border-border pl-4">
      <p className="mb-4 block text-sm text-muted-foreground">{CACHE_CONTROL_DESCRIPTION}</p>

      {points.map((point, index) => (
        <div key={index} className="mb-4 flex items-end gap-4">
          <div className="w-[180px] space-y-1">
            <Label>类型</Label>
            <Select items={LOCATION_ITEMS} value={point.location} disabled>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px] space-y-1">
            <LabelWithHint label="角色" hint={CACHE_CONTROL_ROLE_HINT} />
            <Select
              items={ROLE_ITEMS}
              value={point.role ?? null}
              onValueChange={(selected) =>
                replaceAt(index, { ...point, role: (selected as CacheControlRole | null) ?? undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>无</SelectItem>
                {ROLE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px] space-y-1">
            <LabelWithHint label="索引" hint={CACHE_CONTROL_INDEX_HINT} />
            <NumericalInput
              type="number"
              placeholder="可选"
              step={1}
              value={point.index ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                replaceAt(index, {
                  ...point,
                  index: event.target.value === "" ? undefined : event.target.value,
                })
              }
            />
          </div>

          {points.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`移除注入点 ${index + 1}`}
              className="text-destructive"
              onClick={() => onChange?.(points.filter((_, position) => position !== index))}
            >
              <Minus className="size-4" />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => onChange?.([...points, NEW_CACHE_CONTROL_POINT])}
      >
        <Plus className="mr-2 size-4" />
        添加注入点
      </Button>
    </div>
  );
};

export default CacheControlInjectionPoints;
