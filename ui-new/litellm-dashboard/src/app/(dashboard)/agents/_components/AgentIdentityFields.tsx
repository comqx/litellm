import React, { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { apiClient } from "@/components/networking";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentFormField, type AgentFormValues } from "./AgentFormKit";
import { entraTenantFromIssuer, IDENTITY_UUID_PATTERN } from "./agent_identity";

const PROVIDER_OPTIONS = [
  { value: "none", label: "不绑定显式身份" },
  { value: "microsoft_entra", label: "Microsoft Entra ID" },
];
const EXECUTION_MODE_OPTIONS = [
  { value: "autonomous", label: "自主运行" },
  { value: "delegated", label: "代表用户" },
  { value: "both", label: "两者皆可" },
];
const EXECUTION_OPTIONS = [
  { value: "enabled", label: "已启用" },
  { value: "disabled", label: "已禁用" },
];

export const AgentIdentityFields = ({ accessToken }: { accessToken: string | null }) => {
  const provider = useWatch<AgentFormValues>({ name: "identity_provider" });
  const mode = useWatch<AgentFormValues>({ name: "execution_mode" });
  const showScopes = mode !== "autonomous" && mode !== undefined;
  const [tenants, setTenants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || provider !== "microsoft_entra") return;
    let active = true;
    apiClient
      .get<string[]>("/v1/agents/identity/providers", { accessToken })
      .then((issuers) => {
        if (active) {
          setError(null);
          setTenants(
            issuers.flatMap((issuer) => {
              const tenant = entraTenantFromIssuer(issuer);
              return tenant ? [tenant] : [];
            }),
          );
        }
      })
      .catch(() => {
        if (active) setError("无法加载网关信任的身份提供商");
      });
    return () => {
      active = false;
    };
  }, [accessToken, provider]);

  return (
    <>
      <section aria-label="智能体身份" className="my-6 space-y-4 rounded-lg border border-border p-4">
        <div>
          <h3 className="font-medium">智能体身份</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            将现有身份提供商应用与此智能体关联。应用名称与运行时地址可独立变更。
          </p>
        </div>
        <AgentFormField name="identity_provider" label="身份提供商" defaultValue="none">
          {({ value, onChange, id }) => (
            <Select
              items={PROVIDER_OPTIONS}
              value={typeof value === "string" ? value : "none"}
              onValueChange={onChange}
            >
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </AgentFormField>
        {provider === "microsoft_entra" && (
          <>
            <AgentFormField
              name="identity_tenant_id"
              label="受信任的 Entra 租户"
              rules={{ required: "请选择受信任的租户" }}
            >
              {({ value, onChange, id }) => (
                <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="选择网关信任的租户" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant} value={tenant}>
                        {tenant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {!error && tenants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                暂无受信任的 Entra 租户。请先在网关上配置 JWT 签发者与受众校验。控制台 Microsoft SSO
                需单独配置。
              </p>
            )}
            <AgentFormField
              name="identity_client_id"
              label="应用程序（客户端）ID"
              rules={{
                required: "请输入 Entra 应用程序客户端 ID",
                pattern: { value: IDENTITY_UUID_PATTERN, message: "请输入有效的应用程序客户端 UUID" },
              }}
              description={
                <>
                  可在{" "}
                  <a className="underline" href="https://entra.microsoft.com/" target="_blank" rel="noreferrer">
                    Entra 应用注册
                  </a>
                  中选择智能体应用，在「概述」页查看。此处无需客户端密钥。
                </>
              }
            >
              {({ value, onChange, ref, ...control }) => (
                <Input
                  {...control}
                  ref={ref}
                  value={typeof value === "string" ? value : ""}
                  onChange={onChange}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              )}
            </AgentFormField>
            <AgentFormField name="execution_mode" label="执行模式" defaultValue="autonomous">
              {({ value, onChange, id }) => (
                <Select
                  items={EXECUTION_MODE_OPTIONS}
                  value={typeof value === "string" ? value : "autonomous"}
                  onValueChange={onChange}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            <AgentFormField
              name="identity_service_principal_id"
              label="企业应用程序对象 ID"
              rules={{
                required: mode !== "delegated" ? "请输入服务主体对象 ID" : false,
                pattern: { value: IDENTITY_UUID_PATTERN, message: "请输入有效的服务主体 UUID" },
              }}
              description={
                <>
                  打开{" "}
                  <a
                    className="underline"
                    href="https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Entra 企业应用程序
                  </a>
                  ，选择此应用并复制其对象 ID。应用注册中的对象 ID 是另一个值。
                </>
              }
            >
              {({ value, onChange, ref, ...control }) => (
                <Input {...control} ref={ref} value={typeof value === "string" ? value : ""} onChange={onChange} />
              )}
            </AgentFormField>

            <AgentFormField
              name="identity_required_roles"
              label="必需的应用程序角色"
              description="自主应用程序令牌上必须具备的角色值，逗号分隔"
            >
              {({ value, onChange, ref, ...control }) => (
                <Input
                  {...control}
                  ref={ref}
                  value={typeof value === "string" ? value : ""}
                  onChange={onChange}
                  placeholder="Agent.Invoke"
                />
              )}
            </AgentFormField>

            {showScopes && (
              <>
                <AgentFormField
                  name="identity_required_scopes"
                  label="必需的委派范围"
                  defaultValue="user_impersonation"
                  rules={{ required: "请输入委派范围" }}
                >
                  {({ value, onChange, ref, ...control }) => (
                    <Input
                      {...control}
                      ref={ref}
                      value={typeof value === "string" ? value : "user_impersonation"}
                      onChange={onChange}
                    />
                  )}
                </AgentFormField>
                <p className="text-sm text-muted-foreground">
                  用户须先通过本网关的 Microsoft SSO 登录。后续委派调用须同时满足用户与智能体权限。
                </p>
              </>
            )}
            <AgentFormField name="enabled" label="执行" defaultValue={true}>
              {({ value, onChange, id }) => (
                <Select
                  items={EXECUTION_OPTIONS}
                  value={value === false ? "disabled" : "enabled"}
                  onValueChange={(next) => onChange(next === "enabled")}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            <p className="text-sm text-muted-foreground">
              LiteLLM 在匹配此身份前会校验智能体的 Entra 令牌。保存这些字段即配置绑定，需经认证请求才能完成验证。运行时认证
              Header 需单独配置。
            </p>
          </>
        )}
      </section>
    </>
  );
};
