import { Info } from "lucide-react";
import React from "react";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { Switch } from "@/components/ui/switch";
import { MountedFormField } from "@/components/common_components/MountedFormField";
import { isClientForwardedTokenMode } from "@/components/mcp_tools/types";
import { switchControl } from "./mcpFieldRules";

/**
 * DCR-bridge toggle for the client-forwarded token modes (true_passthrough /
 * oauth_delegate); self-gates to those two auth types and renders nothing
 * otherwise. When on, OAuth-only clients like Claude Desktop can register and
 * sign in through the gateway; when off, the gateway relays the upstream
 * server's own OAuth metadata instead. `initialChecked` seeds the field's
 * default value (not the Switch's DOM defaultChecked): the create form defaults
 * it on, the edit form seeds it from the stored value.
 */
export default function DcrBridgeToggle({
  authType,
  initialChecked,
}: {
  authType?: string | null;
  initialChecked?: boolean;
}) {
  if (!isClientForwardedTokenMode(authType)) return null;
  return (
    <MountedFormField
      label={
        <span className="text-sm font-medium text-foreground flex items-center">
          Gateway-hosted sign-in (DCR bridge)
          <SimpleTooltip content="允许 Claude Desktop 等仅支持 OAuth 的客户端通过网关注册和登录。关闭则改为转发上游服务器自己的 OAuth 元数据（适用于已在上游 IdP 预注册的客户端）。">
            <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
          </SimpleTooltip>
        </span>
      }
      name="dcr_bridge"
      defaultValue={initialChecked}
    >
      {(control) => <Switch {...switchControl(control)} />}
    </MountedFormField>
  );
}
