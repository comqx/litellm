import React from "react";

import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

export const ModalityRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const modalityRouting = value.modality_routing ?? false;
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={modalityRouting}
          onCheckedChange={(nextModalityRouting) => onChange({ ...value, modality_routing: nextModalityRouting })}
          aria-label="将图像请求路由到支持视觉的 Models"
        />
        <strong className="font-semibold">将图像请求路由到支持视觉的 Models</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">
        Replaces a routed model that cannot take image input with the nearest higher tier that can, then the default
        model, instead of failing with a provider 400. Only models explicitly declared supports_vision false are
        replaced, and a kept session pin still wins unless you turn on the override below.
      </span>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.modality_pin_override ?? false}
          onCheckedChange={(modalityPinOverride) => onChange({ ...value, modality_pin_override: modalityPinOverride })}
          disabled={!modalityRouting}
          aria-label="为图像请求覆盖会话固定"
        />
        <strong className="font-semibold">为图像请求覆盖会话固定</strong>
      </div>
      <span className="block text-xs text-muted-foreground">
        即使会话被固定到无法接收图像的 模型，也将图像轮次路由到支持图像的 模型。
        固定会保留，因此下一个文本轮次会回到它。需要先开启图像路由。
      </span>
    </>
  );
};
