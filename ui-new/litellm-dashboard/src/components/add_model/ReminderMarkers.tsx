import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { getReminderMarkersError, type ReminderMarkerPair } from "./build_complexity_router_config";

const ReminderMarkers: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  showValidationErrors?: boolean;
}> = ({ value, onChange, showValidationErrors = false }) => {
  const markers = value.reminder_markers ?? [];
  const update = (index: number, patch: Partial<ReminderMarkerPair>) =>
    onChange({
      ...value,
      reminder_markers: markers.map((marker, markerIndex) =>
        markerIndex === index ? { ...marker, ...patch } : marker,
      ),
    });
  const remove = (index: number) => {
    const next = markers.filter((_, markerIndex) => markerIndex !== index);
    onChange({ ...value, reminder_markers: next.length > 0 ? next : undefined });
  };
  const error = getReminderMarkersError(value.reminder_markers);
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Auto Router already ignores built-in reminder tags, such as <code>&lt;system-reminder&gt;</code>, when choosing
        留空则保留默认值。添加自定义的开始和结束标签，可在路由时忽略它们之间的文本。
        自定义标签对会替换默认值，因此请包含你仍需要的内置标签对。所选
        模型仍会收到完整消息。匹配不区分大小写。
      </p>
      <div className="space-y-3">
        {markers.map((marker, index) => (
          <div className="flex items-end gap-2" key={index}>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium" htmlFor={`reminder-marker-${index}-open`}>
                开始标签
              </label>
              <Input
                id={`reminder-marker-${index}-open`}
                placeholder="<note>"
                value={marker.open}
                onChange={(event) => update(index, { open: event.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium" htmlFor={`reminder-marker-${index}-close`}>
                结束标签
              </label>
              <Input
                id={`reminder-marker-${index}-close`}
                placeholder="</note>"
                value={marker.close}
                onChange={(event) => update(index, { close: event.target.value })}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`移除标签对 ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() => onChange({ ...value, reminder_markers: [...markers, { open: "", close: "" }] })}
      >
        <Plus />
        添加标签对
      </Button>
      {showValidationErrors && error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default ReminderMarkers;
