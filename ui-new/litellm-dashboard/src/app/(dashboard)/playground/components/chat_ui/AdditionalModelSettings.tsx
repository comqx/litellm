import { Info } from "lucide-react";
import React, { useEffect, useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cva.config";

interface AdditionalModelSettingsProps {
  temperature?: number;
  maxTokens?: number;
  useAdvancedParams?: boolean;
  onTemperatureChange?: (value: number) => void;
  onMaxTokensChange?: (value: number) => void;
  onUseAdvancedParamsChange?: (value: boolean) => void;
  mockTestFallbacks?: boolean;
  onMockTestFallbacksChange?: (value: boolean) => void;
  streamingEnabled?: boolean;
  onStreamingChange?: (value: boolean) => void;
  showAdvancedParams?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const AdditionalModelSettings: React.FC<AdditionalModelSettingsProps> = ({
  temperature = 1.0,
  maxTokens = 2048,
  useAdvancedParams: externalUseAdvancedParams,
  onTemperatureChange,
  onMaxTokensChange,
  onUseAdvancedParamsChange,
  mockTestFallbacks,
  onMockTestFallbacksChange,
  streamingEnabled = true,
  onStreamingChange,
  showAdvancedParams = true,
}) => {
  const [internalUseAdvancedParams, setInternalUseAdvancedParams] = useState(false);
  const useAdvancedParams =
    externalUseAdvancedParams !== undefined ? externalUseAdvancedParams : internalUseAdvancedParams;
  const [localTemperature, setLocalTemperature] = useState(temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens);
  const [temperatureText, setTemperatureText] = useState(String(temperature));
  const [maxTokensText, setMaxTokensText] = useState(String(maxTokens));

  const streamingId = useId();
  const advancedId = useId();
  const fallbacksId = useId();
  const temperatureId = useId();
  const maxTokensId = useId();

  useEffect(() => {
    setLocalTemperature(temperature);
    setTemperatureText(String(temperature));
  }, [temperature]);

  useEffect(() => {
    setLocalMaxTokens(maxTokens);
    setMaxTokensText(String(maxTokens));
  }, [maxTokens]);

  const handleTemperatureChange = (value: number) => {
    const newValue = clamp(Number.isFinite(value) ? value : 1.0, 0, 2);
    setLocalTemperature(newValue);
    setTemperatureText(String(newValue));
    onTemperatureChange?.(newValue);
  };

  const handleMaxTokensChange = (value: number) => {
    const newValue = clamp(Number.isFinite(value) ? Math.round(value) : 1000, 1, 32768);
    setLocalMaxTokens(newValue);
    setMaxTokensText(String(newValue));
    onMaxTokensChange?.(newValue);
  };

  const handleTemperatureTyped = (raw: string) => {
    setTemperatureText(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 2) {
      setLocalTemperature(parsed);
      onTemperatureChange?.(parsed);
    }
  };

  const handleMaxTokensTyped = (raw: string) => {
    setMaxTokensText(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isInteger(parsed) && parsed >= 1 && parsed <= 32768) {
      setLocalMaxTokens(parsed);
      onMaxTokensChange?.(parsed);
    }
  };

  const handleUseAdvancedParamsChange = (checked: boolean) => {
    if (onUseAdvancedParamsChange) {
      onUseAdvancedParamsChange(checked);
    } else {
      setInternalUseAdvancedParams(checked);
    }
  };

  const disabledTextColor = useAdvancedParams ? "text-foreground" : "text-muted-foreground";

  return (
    <div className="w-80 space-y-4 p-4">
      {onStreamingChange && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={streamingId}
            checked={streamingEnabled}
            onCheckedChange={(checked) => onStreamingChange(checked === true)}
            aria-label="流式输出响应"
          />
          <label htmlFor={streamingId} className="cursor-pointer text-sm font-medium">
            流式输出响应
          </label>
          <Tooltip>
            <TooltipTrigger aria-label="帮助：流式输出响应">
              <Info className="size-3 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              逐令牌流式输出回答。取消勾选则发送非流式请求，并一次性渲染完整响应。
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {showAdvancedParams && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={advancedId}
            checked={useAdvancedParams}
            onCheckedChange={(checked) => handleUseAdvancedParamsChange(checked === true)}
            aria-label="使用高级参数"
          />
          <label htmlFor={advancedId} className="cursor-pointer text-sm font-medium">
            使用高级参数
          </label>
        </div>
      )}

      {onMockTestFallbacksChange && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={fallbacksId}
            checked={mockTestFallbacks ?? false}
            onCheckedChange={(checked) => onMockTestFallbacksChange(checked === true)}
            aria-label="模拟失败以测试 Fallback"
          />
          <label htmlFor={fallbacksId} className="cursor-pointer text-sm font-medium">
            模拟失败以测试 Fallback
          </label>
          <Popover>
            <PopoverTrigger aria-label="帮助：模拟失败以测试 Fallback">
              <Info className="size-3 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground" />
            </PopoverTrigger>
            <PopoverContent side="right" className="max-w-[340px] gap-2 p-3 text-sm">
              <p>让第一个请求失败，以便路由器尝试 Fallback（如果已配置）。可用于验证你的 Fallback 设置。</p>
              <p>
                配置了 Key、团队或路由器设置时，行为可能有所不同。{" "}
                <a
                  href="https://docs.litellm.ai/docs/proxy/keys_teams_router_settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info hover:text-info/80"
                >
                  了解更多
                </a>
              </p>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {showAdvancedParams && (
        <div
          className={cn("space-y-4 transition-opacity duration-200", useAdvancedParams ? "opacity-100" : "opacity-40")}
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <label htmlFor={temperatureId} className={cn("text-sm", disabledTextColor)}>
                  温度
                </label>
                <Tooltip>
                  <TooltipTrigger aria-label="帮助：温度">
                    <Info className={cn("size-3 cursor-help", disabledTextColor)} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    控制随机性。值越低输出越确定，值越高越有创造性。
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id={`${temperatureId}-number`}
                type="text"
                inputMode="decimal"
                aria-label="温度值"
                value={temperatureText}
                disabled={!useAdvancedParams}
                className="h-8 w-20"
                onChange={(event) => handleTemperatureTyped(event.target.value)}
                onBlur={() => handleTemperatureChange(Number(temperatureText))}
              />
            </div>
            <input
              id={temperatureId}
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={localTemperature}
              disabled={!useAdvancedParams}
              aria-label="温度"
              className="w-full accent-primary disabled:cursor-not-allowed"
              onChange={(event) => handleTemperatureChange(Number(event.target.value))}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>1.0</span>
              <span>2.0</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <label htmlFor={maxTokensId} className={cn("text-sm", disabledTextColor)}>
                  最大令牌
                </label>
                <Tooltip>
                  <TooltipTrigger aria-label="帮助：最大令牌">
                    <Info className={cn("size-3 cursor-help", disabledTextColor)} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    响应中最多生成的令牌数。
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id={`${maxTokensId}-number`}
                type="text"
                inputMode="numeric"
                aria-label="最大令牌值"
                value={maxTokensText}
                disabled={!useAdvancedParams}
                className="h-8 w-24"
                onChange={(event) => handleMaxTokensTyped(event.target.value)}
                onBlur={() => handleMaxTokensChange(Number(maxTokensText))}
              />
            </div>
            <input
              id={maxTokensId}
              type="range"
              min={1}
              max={32768}
              step={1}
              value={localMaxTokens}
              disabled={!useAdvancedParams}
              aria-label="最大令牌"
              className="w-full accent-primary disabled:cursor-not-allowed"
              onChange={(event) => handleMaxTokensChange(Number(event.target.value))}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>32768</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalModelSettings;
