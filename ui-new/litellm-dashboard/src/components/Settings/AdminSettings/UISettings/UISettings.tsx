"use client";

import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import { useUpdateUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUpdateUISettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { uiHref } from "@/utils/uiHref";
import PageVisibilitySettings from "./PageVisibilitySettings";
import BackgroundChatSettings from "./BackgroundChatSettings";
import { getUiSettingsFieldDescription, UI_SETTINGS_SECTION_DESCRIPTION } from "./uiSettingsFieldDescriptions";

interface SettingRowProps {
  ariaLabel: string;
  checked: boolean;
  description?: string;
  disabled: boolean;
  indented?: boolean;
  label: string;
  muted?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({
  ariaLabel,
  checked,
  description,
  disabled,
  indented = false,
  label,
  muted = false,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className={indented ? "ml-8 flex items-start gap-3" : "flex items-start gap-3"}>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={ariaLabel} />
      <div className="space-y-1">
        <p className={muted ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
          {label}
        </p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export default function UISettings() {
  const { accessToken } = useAuthorized();
  const { data, isLoading, isError, error } = useUISettings();
  const { mutate: updateSettings, isPending: isUpdating, error: updateError } = useUpdateUISettings(accessToken);

  const schema = data?.field_schema;
  const enableProjectsUIProperty = schema?.properties?.enable_projects_ui;
  const values = data?.values ?? {};
  const moyaiUrl = (values.moyai_url as string | undefined) ?? null;
  const isDisabledForInternalUsers = Boolean(values.disable_model_add_for_internal_users);
  const isDisabledTeamAdminDeleteTeamUser = Boolean(values.disable_team_admin_delete_team_user);
  const isAgentsDisabled = Boolean(values.disable_agents_for_internal_users);
  const isVectorStoresDisabled = Boolean(values.disable_vector_stores_for_internal_users);

  const handleToggle = (checked: boolean) => {
    updateSettings(
      { disable_model_add_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleTeamAdminDelete = (checked: boolean) => {
    updateSettings(
      { disable_team_admin_delete_team_user: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleUpdatePageVisibility = (settings: { enabled_ui_pages_internal_users: string[] | null }) => {
    updateSettings(settings, {
      onSuccess: () => {
        toast.success("页面可见性设置已更新");
      },
      onError: (error) => {
        toast.fromError(error);
      },
    });
  };

  const handleToggleForwardClientHeaders = (checked: boolean) => {
    updateSettings(
      { forward_client_headers_to_llm_api: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleForwardLLMProviderAuthHeaders = (checked: boolean) => {
    updateSettings(
      { forward_llm_provider_auth_headers: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleEnableProjectsUI = (checked: boolean) => {
    updateSettings(
      { enable_projects_ui: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新，正在刷新页面...");
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleEnableChatUI = (checked: boolean) => {
    updateSettings(
      { enable_chat_ui: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新，正在刷新页面...");
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleRequireAuthForPublicAIHub = (checked: boolean) => {
    updateSettings(
      { require_auth_for_public_ai_hub: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableAgents = (checked: boolean) => {
    updateSettings(
      { disable_agents_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleAllowAgentsTeamAdmins = (checked: boolean) => {
    updateSettings(
      { allow_agents_for_team_admins: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableVectorStores = (checked: boolean) => {
    updateSettings(
      { disable_vector_stores_for_internal_users: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleAllowVectorStoresTeamAdmins = (checked: boolean) => {
    updateSettings(
      { allow_vector_stores_for_team_admins: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleScopeUserSearch = (checked: boolean) => {
    updateSettings(
      { scope_user_search_to_org: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleDisconnectMoyai = () => {
    updateSettings(
      { moyai_url: null },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  const handleToggleDisableCustomApiKeys = (checked: boolean) => {
    updateSettings(
      { disable_custom_api_keys: checked },
      {
        onSuccess: () => {
          toast.success("UI 设置已更新");
        },
        onError: (error) => {
          toast.fromError(error);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>UI 设置</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-label="正在加载 UI 设置" className="space-y-3">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="error">
            <AlertTitle>无法加载 UI 设置</AlertTitle>
            {error instanceof Error && <AlertDescription>{error.message}</AlertDescription>}
          </Alert>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-foreground">{UI_SETTINGS_SECTION_DESCRIPTION}</p>
            {updateError && (
              <Alert variant="error">
                <AlertTitle>无法更新 UI 设置</AlertTitle>
                {updateError instanceof Error && <AlertDescription>{updateError.message}</AlertDescription>}
              </Alert>
            )}

            <SettingRow
              checked={isDisabledForInternalUsers}
              disabled={isUpdating}
              onCheckedChange={handleToggle}
              ariaLabel="禁止内部用户添加模型"
              label="禁止内部用户添加模型"
              description={getUiSettingsFieldDescription("disable_model_add_for_internal_users")}
            />
            <SettingRow
              checked={isDisabledTeamAdminDeleteTeamUser}
              disabled={isUpdating}
              onCheckedChange={handleToggleTeamAdminDelete}
              ariaLabel="禁止团队管理员删除团队成员"
              label="禁止团队管理员删除团队成员"
              description={getUiSettingsFieldDescription("disable_team_admin_delete_team_user")}
            />
            <SettingRow
              checked={Boolean(values.require_auth_for_public_ai_hub)}
              disabled={isUpdating}
              onCheckedChange={handleToggleRequireAuthForPublicAIHub}
              ariaLabel="公开 AI 中心需登录验证"
              label="公开 AI 中心需登录验证"
              description={getUiSettingsFieldDescription("require_auth_for_public_ai_hub")}
            />
            <SettingRow
              checked={Boolean(values.forward_client_headers_to_llm_api)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardClientHeaders}
              ariaLabel="将客户端 Header 转发至 LLM API"
              label="将客户端 Header 转发至 LLM API"
              description={getUiSettingsFieldDescription("forward_client_headers_to_llm_api")}
            />
            <SettingRow
              checked={Boolean(values.forward_llm_provider_auth_headers)}
              disabled={isUpdating}
              onCheckedChange={handleToggleForwardLLMProviderAuthHeaders}
              ariaLabel="将 LLM 供应商鉴权 Header 转发至上游"
              label="将 LLM 供应商鉴权 Header 转发至上游"
              description={getUiSettingsFieldDescription("forward_llm_provider_auth_headers")}
            />
            {enableProjectsUIProperty && (
              <SettingRow
                checked={Boolean(values.enable_projects_ui)}
                disabled={isUpdating}
                onCheckedChange={handleToggleEnableProjectsUI}
                ariaLabel="启用项目"
                label="[Beta] 启用项目（页面将刷新）"
                description={getUiSettingsFieldDescription("enable_projects_ui")}
              />
            )}
            <SettingRow
              checked={Boolean(values.enable_chat_ui)}
              disabled={isUpdating}
              onCheckedChange={handleToggleEnableChatUI}
              ariaLabel="启用聊天页"
              label="[Beta] 启用聊天页（页面将刷新）"
              description={getUiSettingsFieldDescription("enable_chat_ui")}
            />

            <BackgroundChatSettings />

            <Separator />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Moyai</p>
                <p className="text-sm text-muted-foreground">
                  {moyaiUrl ? `已连接到 ${moyaiUrl}` : "未连接"}
                </p>
              </div>
              {moyaiUrl ? (
                <Button variant="outline" size="sm" disabled={isUpdating} onClick={handleDisconnectMoyai}>
                  Disconnect
                </Button>
              ) : (
                <a href={uiHref("moyai")} className="text-sm text-primary underline underline-offset-4">
                  前往 Moyai 页面连接
                </a>
              )}
            </div>

            <Separator />
            <SettingRow
              checked={isAgentsDisabled}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableAgents}
              ariaLabel="禁止内部用户使用 Agent"
              label="禁止内部用户使用 Agent"
              description={getUiSettingsFieldDescription("disable_agents_for_internal_users")}
            />
            <SettingRow
              checked={Boolean(values.allow_agents_for_team_admins)}
              disabled={isUpdating || !isAgentsDisabled}
              onCheckedChange={handleToggleAllowAgentsTeamAdmins}
              ariaLabel="允许团队管理员使用 Agent"
              label="允许团队管理员使用 Agent"
              description={getUiSettingsFieldDescription("allow_agents_for_team_admins")}
              indented
              muted={!isAgentsDisabled}
            />

            <Separator />
            <SettingRow
              checked={isVectorStoresDisabled}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableVectorStores}
              ariaLabel="禁止内部用户使用向量存储"
              label="禁止内部用户使用向量存储"
              description={getUiSettingsFieldDescription("disable_vector_stores_for_internal_users")}
            />
            <SettingRow
              checked={Boolean(values.allow_vector_stores_for_team_admins)}
              disabled={isUpdating || !isVectorStoresDisabled}
              onCheckedChange={handleToggleAllowVectorStoresTeamAdmins}
              ariaLabel="允许团队管理员使用向量存储"
              label="允许团队管理员使用向量存储"
              description={getUiSettingsFieldDescription("allow_vector_stores_for_team_admins")}
              indented
              muted={!isVectorStoresDisabled}
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.scope_user_search_to_org)}
              disabled={isUpdating}
              onCheckedChange={handleToggleScopeUserSearch}
              ariaLabel="用户搜索限定在本组织"
              label="用户搜索限定在本组织"
              description={getUiSettingsFieldDescription("scope_user_search_to_org")}
            />

            <Separator />
            <SettingRow
              checked={Boolean(values.disable_custom_api_keys)}
              disabled={isUpdating}
              onCheckedChange={handleToggleDisableCustomApiKeys}
              ariaLabel="禁止自定义密钥值"
              label="禁止自定义密钥值"
              description={getUiSettingsFieldDescription("disable_custom_api_keys")}
            />

            <Separator />
            <PageVisibilitySettings
              enabledPagesInternalUsers={values.enabled_ui_pages_internal_users}
              enabledPagesPropertyDescription={getUiSettingsFieldDescription("enabled_ui_pages_internal_users")}
              isUpdating={isUpdating}
              onUpdate={handleUpdatePageVisibility}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
