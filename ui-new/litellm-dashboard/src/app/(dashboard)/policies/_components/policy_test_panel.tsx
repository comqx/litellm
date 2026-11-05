import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CircleAlert, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { resolvePoliciesCall, teamListCall, keyListCall, modelAvailableCall } from "@/components/networking";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { TokenSelect, includesQuery } from "./TokenSelect";

interface PolicyTestPanelProps {
  accessToken: string | null;
}

interface PolicyMatchDetail {
  policy_name: string;
  matched_via: string;
  guardrails_added: string[];
}

interface ResolveResult {
  effective_guardrails: string[];
  matched_policies: PolicyMatchDetail[];
}

interface PolicyTestFormValues {
  team_alias: string | undefined;
  key_alias: string | undefined;
  model: string | undefined;
  tags: string[] | undefined;
}

interface ResolveContext {
  team_alias?: string;
  key_alias?: string;
  model?: string;
  tags?: string[];
}

const EMPTY_VALUES: PolicyTestFormValues = {
  team_alias: undefined,
  key_alias: undefined,
  model: undefined,
  tags: undefined,
};

const buildResolveContext = (values: PolicyTestFormValues): ResolveContext => ({
  ...(values.team_alias ? { team_alias: values.team_alias } : {}),
  ...(values.key_alias ? { key_alias: values.key_alias } : {}),
  ...(values.model ? { model: values.model } : {}),
  ...(values.tags && values.tags.length > 0 ? { tags: values.tags } : {}),
});

interface ContextComboboxProps {
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  options: string[];
}

const ContextCombobox: React.FC<ContextComboboxProps> = ({ id, value, onChange, placeholder, options }) => (
  <Combobox
    items={options}
    value={value ?? null}
    onValueChange={(next: string | null) => onChange(next ?? undefined)}
    filter={includesQuery}
  >
    <ComboboxInput id={id} placeholder={placeholder} className="w-full" showClear={Boolean(value)} />
    <ComboboxContent>
      <ComboboxEmpty>未找到选项</ComboboxEmpty>
      <ComboboxList>
        {(item: string) => (
          <ComboboxItem key={item} value={item} title={item}>
            {item}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>
);

const PolicyTestPanel: React.FC<PolicyTestPanelProps> = ({ accessToken }) => {
  const form = useForm<PolicyTestFormValues>({ defaultValues: EMPTY_VALUES });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const { userId, userRole } = useAuthorized();

  useEffect(() => {
    if (accessToken) {
      loadOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const loadOptions = async () => {
    if (!accessToken) return;

    try {
      const teamsResponse = await teamListCall(accessToken, null, userId);
      const teamsArray = Array.isArray(teamsResponse) ? teamsResponse : teamsResponse?.data || [];
      setAvailableTeams(teamsArray.map((t: any) => t.team_alias).filter(Boolean));
    } catch (error) {
      console.error("Failed to load teams:", error);
    }

    try {
      const keysResponse = await keyListCall(accessToken, null, null, null, null, null, 1, 100);
      const keysArray = keysResponse?.keys || keysResponse?.data || [];
      setAvailableKeys(keysArray.map((k: any) => k.key_alias).filter(Boolean));
    } catch (error) {
      console.error("Failed to load keys:", error);
    }

    try {
      const modelsResponse = await modelAvailableCall(accessToken, userId || "", userRole || "");
      const modelsArray = modelsResponse?.data || (Array.isArray(modelsResponse) ? modelsResponse : []);
      setAvailableModels(modelsArray.map((m: any) => m.id || m.model_name).filter(Boolean));
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  };

  const handleTest = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await resolvePoliciesCall(accessToken, buildResolveContext(form.getValues()));
      setResult(data);
    } catch (error) {
      console.error("Error resolving policies:", error);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    form.reset(EMPTY_VALUES);
    setResult(null);
    setHasSearched(false);
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold mb-1">策略模拟器</h3>
          <span className="text-muted-foreground">
            模拟一次请求，查看会应用哪些 Policy 与 Guardrail。在下方选择 Team、Key、Model 或标签，点击「模拟」查看结果。
          </span>
        </div>

        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="team_alias" label="Team 别名">
              {({ id, value, onChange }) => (
                <ContextCombobox
                  id={id}
                  value={value}
                  onChange={onChange}
                  placeholder="选择或输入 Team 别名"
                  options={availableTeams}
                />
              )}
            </FormField>
            <FormField control={form.control} name="key_alias" label="Key 别名">
              {({ id, value, onChange }) => (
                <ContextCombobox
                  id={id}
                  value={value}
                  onChange={onChange}
                  placeholder="选择或输入 Key 别名"
                  options={availableKeys}
                />
              )}
            </FormField>
            <FormField control={form.control} name="model" label="模型">
              {({ id, value, onChange }) => (
                <ContextCombobox
                  id={id}
                  value={value}
                  onChange={onChange}
                  placeholder="选择或输入模型"
                  options={availableModels}
                />
              )}
            </FormField>
            <FormField control={form.control} name="tags" label="标签">
              {({ id, value, onChange, onBlur }) => (
                <TokenSelect
                  id={id}
                  value={value}
                  onValueChange={onChange}
                  onBlur={onBlur}
                  placeholder="输入标签后按 Enter"
                  allowCustomValues
                  tokenSeparators={[",", " "]}
                />
              )}
            </FormField>
          </FieldGroup>
          <div className="flex space-x-2 mt-4">
            <Button type="button" onClick={handleTest} disabled={isLoading || !accessToken} aria-busy={isLoading}>
              {isLoading && <UiLoadingSpinner className="size-4" />}
              模拟
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              重置
            </Button>
          </div>
        </form>
      </div>

      {!hasSearched && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-muted-foreground mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">尚未运行模拟</p>
          <p className="text-xs text-muted-foreground">
            填写上方一个或多个字段并点击「模拟」，查看该请求会匹配哪些 Policy 与 Guardrail。
          </p>
        </div>
      )}

      {hasSearched && result && (
        <div className="bg-card border border-border rounded-lg p-6">
          {result.matched_policies.length === 0 ? (
            <div className="py-6 text-center">
              <Inbox className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">没有 Policy 匹配此上下文</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">生效的 Guardrail</p>
                <div className="flex flex-wrap gap-1">
                  {result.effective_guardrails.length > 0 ? (
                    result.effective_guardrails.map((g) => (
                      <Badge key={g} className="border-success/20 bg-success/10 text-success">
                        {g}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">无</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">匹配的 Policy</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4">策略</th>
                      <th className="text-left py-2 pr-4">匹配方式</th>
                      <th className="text-left py-2">添加的 Guardrail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matched_policies.map((p) => (
                      <tr key={p.policy_name} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 font-medium">{p.policy_name}</td>
                        <td className="py-2 pr-4">
                          <Badge className="border-info/20 bg-info/10 text-info">{p.matched_via}</Badge>
                        </td>
                        <td className="py-2">
                          {p.guardrails_added.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.guardrails_added.map((g) => (
                                <Badge key={g} className="border-success/20 bg-success/10 text-success">
                                  {g}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">无</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {hasSearched && !result && !isLoading && (
        <Alert variant="error">
          <CircleAlert />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>解析 Policy 失败，请查看 proxy 日志。</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PolicyTestPanel;
