import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import DcrBridgeToggle from "./DcrBridgeToggle";
import { MountedFormField } from "@/components/common_components/MountedFormField";
import { textControl } from "./mcpFieldRules";
import { credentialAuthClass, isClientForwardedTokenMode } from "@/components/mcp_tools/types";

interface PassthroughOAuthFlow {
  startOAuthFlow: () => void | Promise<void>;
  status: string;
  error: string | null;
  tokenResponse: { access_token?: string; expires_in?: number } | null;
}

/**
 * Browser-only Authorize & Fetch for the client-forwarded token modes
 * (true_passthrough / oauth_delegate). Tokens are never stored: the token
 * obtained here lives in this browser session only, forwarded per-server for
 * the tools preview and allowlist configuration, and is never written to the
 * server row or the per-user credential store. The optional OAuth client
 * credentials cover IdPs without dynamic client registration (e.g. a
 * pre-registered Slack app); unlike the token they ARE saved onto the server
 * as declared config, so internal users' Authorize relays through the org's
 * app instead of dead-ending on upstreams that cannot mint clients.
 *
 * Blank fields follow the same convention as the M2M credential fields. On
 * create they mean "no app configured" (dynamic client registration). On edit
 * they mean "keep existing" ONLY when the credential class is unchanged: the
 * backend merges a partial update within the client-forwarded class, so a
 * true_passthrough <-> oauth_delegate switch keeps the stored app, but a switch
 * from a different class (e.g. oauth2) replaces it, so blanks then mean "no
 * app". Removing a stored app is an explicit checkbox (edit only) that writes
 * an explicit-null credential.
 */
export default function PassthroughAuthorizeSection({
  authType,
  oauthFlow,
  dcrBridgeInitialChecked,
  isEditing = false,
  savedAuthType,
  removeStoredApp = false,
  onRemoveStoredAppChange,
  appMayNotMatchUpstream = false,
}: {
  authType?: string | null;
  oauthFlow: PassthroughOAuthFlow;
  dcrBridgeInitialChecked?: boolean;
  isEditing?: boolean;
  savedAuthType?: string | null;
  removeStoredApp?: boolean;
  onRemoveStoredAppChange?: (remove: boolean) => void;
  appMayNotMatchUpstream?: boolean;
}) {
  if (!isClientForwardedTokenMode(authType)) return null;
  const authorizeButtonLabels: Record<string, string> = {
    authorizing: "等待授权中…",
    exchanging: "正在交换授权码…",
  };
  const authorizeButtonLabel = authorizeButtonLabels[oauthFlow.status] ?? "授权并获取工具（仅限浏览器）";
  // On edit, "keep existing" only holds when the stored credential class is unchanged; a cross-class
  // switch (e.g. oauth2 -> true_passthrough) replaces credentials, so blanks then mean "no app".
  const classUnchanged = isEditing && credentialAuthClass(savedAuthType) === credentialAuthClass(authType);
  const clientIdPlaceholder = classUnchanged
    ? "留空则保留当前已保存的应用（如有）"
    : "留空则使用动态客户端注册";
  const clientSecretPlaceholder = classUnchanged
    ? "留空则保留当前已保存的密钥（如有）"
    : "Leave blank for public clients / PKCE";
  const clientIdExtra = classUnchanged
    ? "设置此项可让所有用户通过特定应用授权；对于不支持动态客户端注册的上游（例如预注册的 Slack 应用）为必填。"
    : "切换身份验证类型会丢弃之前保存的应用；请在此处输入客户端 ID，或留空以使用动态客户端注册。";
  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-2 mb-4">
      <p className="text-sm text-muted-foreground">
        Callers bring their own upstream token for this auth type, so LiteLLM never stores tokens. To preview tools and
        configure the tool allowlist, authorize against the upstream here: the token stays in this browser session only
        and is never saved to LiteLLM. An OAuth app configured below IS saved with the server, so internal users who
        authorize from the Tools page go through it.
      </p>
      {appMayNotMatchUpstream && (
        <p className="text-sm text-warning">
          You changed the upstream URL or endpoints; the OAuth app entered here was registered for the previous upstream
          and may not be valid. Update the client ID, or clear it to use dynamic client registration.
        </p>
      )}
      <MountedFormField
        label={<span className="text-sm font-medium text-foreground">OAuth 客户端 ID（可选）</span>}
        name={["credentials", "client_id"]}
        help={clientIdExtra}
      >
        {(control) => (
          <PasswordInput
            {...textControl(control)}
            placeholder={clientIdPlaceholder}
            disabled={removeStoredApp}
            groupClassName="rounded-lg border-border focus:border-info focus:ring-ring"
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={<span className="text-sm font-medium text-foreground">OAuth 客户端密钥（可选）</span>}
        name={["credentials", "client_secret"]}
      >
        {(control) => (
          <PasswordInput
            {...textControl(control)}
            placeholder={clientSecretPlaceholder}
            disabled={removeStoredApp}
            groupClassName="rounded-lg border-border focus:border-info focus:ring-ring"
          />
        )}
      </MountedFormField>
      <DcrBridgeToggle authType={authType} initialChecked={dcrBridgeInitialChecked} />
      {isEditing && onRemoveStoredAppChange && (
        <Label className="items-start leading-normal font-normal text-foreground">
          <Checkbox className="mt-0.5" checked={removeStoredApp} onCheckedChange={onRemoveStoredAppChange} />
          Remove the saved OAuth app on save (the server goes back to dynamic client registration)
        </Label>
      )}
      <Button
        variant="outline"
        onClick={oauthFlow.startOAuthFlow}
        disabled={oauthFlow.status === "authorizing" || oauthFlow.status === "exchanging"}
      >
        {authorizeButtonLabel}
      </Button>
      {oauthFlow.error && <p className="text-sm text-destructive">{oauthFlow.error}</p>}
      {oauthFlow.status === "success" && oauthFlow.tokenResponse?.access_token && (
        <p className="text-sm text-success">
          Token held for this browser session. Tools can now be previewed and configured; the token was not saved to
          LiteLLM.
        </p>
      )}
    </div>
  );
}
