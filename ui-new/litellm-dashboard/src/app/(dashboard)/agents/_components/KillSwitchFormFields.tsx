import React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldTitle } from "@/components/ui/field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { AgentFormField, AgentFormValues, labelWithHint } from "./AgentFormKit";
import { KILL_SWITCH_AUTH_TYPES, KILL_SWITCH_METHODS, validateKillSwitchBody } from "./kill_switch_config";

const KeyValueFieldArray = ({
  name,
  addLabel,
  keyPlaceholder,
  valuePlaceholder,
}: {
  name: "kill_switch.headers" | "kill_switch.query_params";
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) => {
  const { control } = useFormContext<AgentFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((item, index) => (
        <div key={item.id} className="flex items-start gap-2">
          <AgentFormField name={`${name}.${index}.key`} rules={{ required: "请输入名称" }}>
            {({ value, onChange, ref, ...control }) => (
              <Input
                {...control}
                ref={ref}
                className="w-55"
                placeholder={keyPlaceholder}
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
              />
            )}
          </AgentFormField>
          <AgentFormField name={`${name}.${index}.value`}>
            {({ value, onChange, ref, ...control }) => (
              <Input
                {...control}
                ref={ref}
                className="w-65"
                placeholder={valuePlaceholder}
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
              />
            )}
          </AgentFormField>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`移除${addLabel.replace(/^添加/, "")}`}
            className="text-destructive hover:text-destructive/80"
            onClick={() => remove(index)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => append({})}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
};

const TextField = ({
  name,
  label,
  placeholder,
  required,
  secret,
}: {
  name: `kill_switch.${string}`;
  label: React.ReactNode;
  placeholder?: string;
  required?: string;
  secret?: boolean;
}) => (
  <AgentFormField name={name} label={label} rules={required ? { required } : undefined}>
    {({ value, onChange, ref, ...control }) =>
      secret ? (
        <PasswordInput
          {...control}
          ref={ref}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      ) : (
        <Input
          {...control}
          ref={ref}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      )
    }
  </AgentFormField>
);

const KillSwitchAuthFields = () => {
  const { control } = useFormContext<AgentFormValues>();
  const authType = useWatch({ control, name: "kill_switch.auth_type" });

  switch (authType) {
    case "bearer":
      return <TextField name="kill_switch.auth_token" label="Bearer 令牌" required="请输入令牌" secret />;
    case "api_key":
      return (
        <>
          <TextField name="kill_switch.auth_header_name" label="Header 名称" placeholder="X-API-Key" />
          <TextField name="kill_switch.auth_api_key" label="API Key" required="请输入 API Key" secret />
        </>
      );
    case "basic":
      return (
        <>
          <TextField name="kill_switch.auth_username" label="用户名" required="请输入用户名" />
          <TextField name="kill_switch.auth_password" label="密码" required="请输入密码" secret />
        </>
      );
    default:
      return null;
  }
};

const KillSwitchFormFields = () => (
  <>
    <TextField
      name="kill_switch.url"
      label={labelWithHint(
        "Webhook URL",
        "触发 Kill Switch 时 LiteLLM 调用的绝对 http(s) URL。留空则移除 Kill Switch。",
      )}
      placeholder="https://example.com/hooks/kill-agent"
    />

    <AgentFormField name="kill_switch.method" label="方法">
      {({ value, onChange, ref: _ref, ...control }) => (
        <Select value={typeof value === "string" ? value : "POST"} onValueChange={onChange}>
          <SelectTrigger {...control} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KILL_SWITCH_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </AgentFormField>

    <Field>
      <FieldTitle>请求头</FieldTitle>
      <KeyValueFieldArray
        name="kill_switch.headers"
        addLabel="添加请求头"
        keyPlaceholder="Header 名称"
        valuePlaceholder="Header 值"
      />
    </Field>

    <Field>
      <FieldTitle>查询参数</FieldTitle>
      <KeyValueFieldArray
        name="kill_switch.query_params"
        addLabel="添加查询参数"
        keyPlaceholder="参数名"
        valuePlaceholder="参数值"
      />
    </Field>

    <AgentFormField
      name="kill_switch.body"
      label={labelWithHint("JSON Body", "可选，作为请求体发送的 JSON 对象")}
      rules={{ validate: (value) => validateKillSwitchBody(typeof value === "string" ? value : "") }}
    >
      {({ value, onChange, ref, ...control }) => (
        <Textarea
          {...control}
          ref={ref}
          rows={4}
          placeholder='{"reason": "manual kill switch"}'
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      )}
    </AgentFormField>

    <AgentFormField name="kill_switch.auth_type" label="认证">
      {({ value, onChange, ref: _ref, ...control }) => (
        <Select value={typeof value === "string" ? value : "none"} onValueChange={onChange}>
          <SelectTrigger {...control} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KILL_SWITCH_AUTH_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </AgentFormField>

    <KillSwitchAuthFields />
  </>
);

export default KillSwitchFormFields;
