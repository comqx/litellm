import React from "react";
import { CircleHelp, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";

import GuardrailSelector from "../guardrails/GuardrailSelector";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type GuardrailFields = { request_fields?: string[]; response_fields?: string[] };
type GuardrailSettings = Record<string, GuardrailFields | null>;

interface PassThroughGuardrailsSectionProps {
  accessToken: string;
  value?: GuardrailSettings;
  onChange?: (guardrails: GuardrailSettings) => void;
  disabled?: boolean;
}

const labelWithHint = (label: React.ReactNode, hint: React.ReactNode): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

const PassThroughGuardrailsSection: React.FC<PassThroughGuardrailsSectionProps> = ({
  accessToken,
  value = {},
  onChange,
  disabled = false,
}) => {
  const selectedGuardrails = Object.keys(value);

  const emit = (next: GuardrailSettings) => {
    onChange?.(next);
  };

  const handleGuardrailChange = (guardrails: string[]) => {
    emit(Object.fromEntries(guardrails.map((name) => [name, value[name] ?? null])));
  };

  const handleFieldChange = (guardrailName: string, fieldType: keyof GuardrailFields, fields: string[]) => {
    const updated: GuardrailFields = {
      ...(value[guardrailName] ?? {}),
      [fieldType]: fields.length > 0 ? fields : undefined,
    };
    const isEmpty = !updated.request_fields && !updated.response_fields;
    emit({ ...value, [guardrailName]: isEmpty ? null : updated });
  };

  const appendField = (guardrailName: string, fieldType: keyof GuardrailFields, field: string) => {
    handleFieldChange(guardrailName, fieldType, [...(value[guardrailName]?.[fieldType] ?? []), field]);
  };

  return (
    <TooltipProvider>
      <Card className="block p-6">
        <h3 className="mb-2 text-lg font-semibold text-foreground">护栏</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          配置 Guardrails 以对请求和响应执行策略。透传端点上的 Guardrails 为可选启用。
        </p>

        <Alert variant="info" className="mb-4">
          <Info />
          <AlertTitle>
            字段级定向{" "}
            <a
              href="https://docs.litellm.ai/docs/proxy/pass_through_guardrails#field-level-targeting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-info underline hover:text-info/80"
            >
              (Learn More)
            </a>
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <div>可选指定要检查的字段。留空时，会将整个请求或响应发送给 Guardrail。</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="font-medium">常见示例：</div>
                <div>
                  • <code className="rounded-sm bg-muted px-1">query</code> - 单个字段
                </div>
                <div>
                  • <code className="rounded-sm bg-muted px-1">documents[*].text</code> - documents 数组中的全部 text
                </div>
                <div>
                  • <code className="rounded-sm bg-muted px-1">messages[*].content</code> - 全部 message 的 content
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Field>
          <FieldLabel htmlFor="pass-through-guardrails">
            {labelWithHint(
              "选择 Guardrails",
              "选择在此端点上运行的 Guardrails。组织、团队或密钥级别的 Guardrails 也会一并生效。",
            )}
          </FieldLabel>
          <GuardrailSelector
            accessToken={accessToken}
            value={selectedGuardrails}
            onChange={handleGuardrailChange}
            disabled={disabled}
          />
        </Field>

        {selectedGuardrails.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">字段定向（可选）</div>
              <div className="text-xs text-muted-foreground">💡 提示：留空则检查整个负载</div>
            </div>
            {selectedGuardrails.map((guardrailName) => (
              <Card key={guardrailName} className="block bg-muted/50 p-4">
                <div className="mb-3 text-sm font-medium text-foreground">{guardrailName}</div>
                <div className="space-y-3">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={`${guardrailName}-request-fields`} className="text-xs text-muted-foreground">
                        {labelWithHint(
                          "请求字段（pre_call）",
                          <div>
                            <div className="mb-1 font-medium">指定要检查的请求字段</div>
                            <div className="space-y-1 text-xs">
                              <div>示例：</div>
                              <div>• query</div>
                              <div>• documents[*].text</div>
                              <div>• messages[*].content</div>
                            </div>
                          </div>,
                        )}
                      </FieldLabel>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() => appendField(guardrailName, "request_fields", "query")}
                        >
                          + query
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() => appendField(guardrailName, "request_fields", "documents[*]")}
                        >
                          + documents[*]
                        </Button>
                      </div>
                    </div>
                    <TagsInput
                      id={`${guardrailName}-request-fields`}
                      placeholder="输入字段名或使用上方 + 按钮（例如 query、documents[*].text）"
                      value={value[guardrailName]?.request_fields ?? []}
                      onValueChange={(fields) => handleFieldChange(guardrailName, "request_fields", fields)}
                      tokenSeparators={[","]}
                      disabled={disabled}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel
                        htmlFor={`${guardrailName}-response-fields`}
                        className="text-xs text-muted-foreground"
                      >
                        {labelWithHint(
                          "响应字段（post_call）",
                          <div>
                            <div className="mb-1 font-medium">指定要检查的响应字段</div>
                            <div className="space-y-1 text-xs">
                              <div>示例：</div>
                              <div>• results[*].text</div>
                              <div>• choices[*].message.content</div>
                            </div>
                          </div>,
                        )}
                      </FieldLabel>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() => appendField(guardrailName, "response_fields", "results[*]")}
                        >
                          + results[*]
                        </Button>
                      </div>
                    </div>
                    <TagsInput
                      id={`${guardrailName}-response-fields`}
                      placeholder="输入字段名或使用上方 + 按钮（例如 results[*].text）"
                      value={value[guardrailName]?.response_fields ?? []}
                      onValueChange={(fields) => handleFieldChange(guardrailName, "response_fields", fields)}
                      tokenSeparators={[","]}
                      disabled={disabled}
                    />
                  </Field>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default PassThroughGuardrailsSection;
