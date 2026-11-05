import React from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { AUTH_TYPE } from "@/components/mcp_tools/types";

/**
 * Warning shown in the create/edit MCP server forms when auth_type
 * true_passthrough is selected: the gateway performs no admission auth for
 * that server, so callers reach the upstream without a LiteLLM identity.
 */
export default function TruePassthroughWarning({ authType }: { authType?: string | null }) {
  if (authType !== AUTH_TYPE.TRUE_PASSTHROUGH) return null;
  return (
    <Alert className="mb-4">
      <TriangleAlert />
      <AlertTitle>True Passthrough 会禁用此服务器的 LiteLLM 身份验证</AlertTitle>
      <AlertDescription>
        Anyone who can reach the gateway can call this server without a LiteLLM key. The caller&apos;s Authorization
        任何能访问网关的人无需 LiteLLM Key 即可调用此服务器。调用方的 Authorization
        头将原样转发给上游，按 Key 和按 Team 的速率限制与花费追踪均不生效，
        上游完全负责对调用方进行身份验证。如果调用方仍应向 LiteLLM 进行身份验证，请改用 OAuth Delegate。
      </AlertDescription>
    </Alert>
  );
}
