"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Unplug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { fetchMCPGatewaySessions, terminateMCPGatewaySessions } from "@/components/networking";
import type {
  MCPGatewaySessionGroupCount,
  MCPGatewaySessionSelector,
  MCPGatewaySessionsResponse,
  MCPGatewaySessionsTerminateResponse,
} from "@/components/mcp_tools/types";
import { createQueryKeys } from "@/app/(dashboard)/hooks/common/queryKeysFactory";

const mcpGatewaySessionKeys = createQueryKeys("mcpGatewaySessions");
const REFETCH_INTERVAL_MS = 15000;
const UNKNOWN_LABEL = "(unknown)";

export function formatIdleSeconds(idleSeconds: number): string {
  const total = Math.max(0, Math.floor(idleSeconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function groupLabel(label: string | null): string {
  if (label === null) return UNKNOWN_LABEL;
  return label === "" ? '""' : label;
}

export function describeSelector(selector: MCPGatewaySessionSelector): string {
  if (selector.user_id !== undefined) return `用户 ${groupLabel(selector.user_id)} 打开的所有实时会话`;
  return `会话 ${selector.session_id_prefix}`;
}

export function describeTerminateResult(result: MCPGatewaySessionsTerminateResponse): string {
  const noun = result.terminated_sessions === 1 ? "session" : "sessions";
  return `Disconnected ${result.terminated_sessions} ${noun} on worker pid ${result.worker_pid}.`;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DisconnectUserButton({
  userId,
  onDisconnectUser,
}: {
  userId: string | null;
  onDisconnectUser: (userId: string) => void;
}) {
  if (userId === null || userId === "") return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onDisconnectUser(userId)}
      aria-label={`断开用户 ${groupLabel(userId)} 的所有会话`}
    >
      <Unplug className="size-4" />
      全部断开
    </Button>
  );
}

function GroupCountTable({
  title,
  groups,
  labelHeader,
  onDisconnectUser,
}: {
  title: string;
  groups: MCPGatewaySessionGroupCount[];
  labelHeader: string;
  onDisconnectUser?: (userId: string) => void;
}) {
  return (
    <section aria-label={title} className="rounded-lg border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labelHeader}</TableHead>
            <TableHead className="text-right">会话数</TableHead>
            {onDisconnectUser ? <TableHead className="text-right">操作</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.label ?? "__unknown__"}>
              <TableCell className="font-mono text-xs">{groupLabel(group.label)}</TableCell>
              <TableCell className="text-right">{group.count}</TableCell>
              {onDisconnectUser ? (
                <TableCell className="text-right">
                  <DisconnectUserButton userId={group.label} onDisconnectUser={onDisconnectUser} />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function SessionsBody({
  data,
  error,
  isLoading,
  onDisconnect,
}: {
  data: MCPGatewaySessionsResponse | undefined;
  error: Error | null;
  isLoading: boolean;
  onDisconnect: ((selector: MCPGatewaySessionSelector) => void) | null;
}) {
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12"
      >
        <UiLoadingSpinner className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">正在加载实时连接…</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>无法加载实时连接</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!data) return null;
  if (data.total_sessions === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No live MCP connections on this worker (pid {data.worker_pid}). Connect an AI client to the gateway to see it
          here.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="实时会话" value={data.total_sessions} />
        <StatCard label="AI 客户端" value={data.by_client.length} />
        <StatCard label="用户" value={data.by_user.length} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GroupCountTable title="按 AI 客户端分组的会话" labelHeader="客户端" groups={data.by_client} />
        <GroupCountTable
          title="按用户分组的会话"
          labelHeader="用户"
          groups={data.by_user}
          onDisconnectUser={onDisconnect ? (userId) => onDisconnect({ user_id: userId }) : undefined}
        />
      </div>
      <section aria-label="实时会话" className="rounded-lg border border-border bg-card">
        <h3 className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">
          Live sessions (worker pid {data.worker_pid})
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会话</TableHead>
              <TableHead>客户端</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>Key 别名</TableHead>
              <TableHead>团队</TableHead>
              <TableHead>客户端 IP</TableHead>
              <TableHead className="text-right">空闲</TableHead>
              <TableHead className="text-right">进行中</TableHead>
              {onDisconnect ? <TableHead className="text-right">操作</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.sessions.map((session, index) => (
              <TableRow key={`${session.session_id_prefix}-${index}`}>
                <TableCell className="font-mono text-xs">{session.session_id_prefix}</TableCell>
                <TableCell>
                  {session.client_name === null ? (
                    <span className="text-muted-foreground">{UNKNOWN_LABEL}</span>
                  ) : (
                    <>
                      <span className="font-mono text-xs">{groupLabel(session.client_name)}</span>
                      {session.client_version ? (
                        <span className="ml-1 text-xs text-muted-foreground">v{session.client_version}</span>
                      ) : null}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  {session.user_id === null ? (
                    <span className="text-muted-foreground">{UNKNOWN_LABEL}</span>
                  ) : (
                    <>
                      <span className="font-mono text-xs">{session.user_id}</span>
                      {session.user_email ? (
                        <span className="ml-1 text-xs text-muted-foreground">{session.user_email}</span>
                      ) : null}
                    </>
                  )}
                </TableCell>
                <TableCell className="text-xs">{session.key_alias ?? "-"}</TableCell>
                <TableCell className="text-xs">{session.team_alias ?? session.team_id ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">{session.client_ip || "-"}</TableCell>
                <TableCell className="text-right text-xs">{formatIdleSeconds(session.idle_seconds)}</TableCell>
                <TableCell className="text-right text-xs">{session.in_flight_requests}</TableCell>
                {onDisconnect ? (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisconnect({ session_id_prefix: session.session_id_prefix })}
                      aria-label={`断开会话 ${session.session_id_prefix}`}
                    >
                      <Unplug className="size-4" />
                      断开
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}

interface MCPGatewaySessionsTabProps {
  accessToken: string | null;
  canTerminate: boolean;
}

export function MCPGatewaySessionsTab({ accessToken, canTerminate }: MCPGatewaySessionsTabProps) {
  const queryClient = useQueryClient();
  const [pendingSelector, setPendingSelector] = useState<MCPGatewaySessionSelector | null>(null);
  const queryOptions = {
    queryKey: mcpGatewaySessionKeys.lists(),
    queryFn: () => fetchMCPGatewaySessions(accessToken!),
    enabled: !!accessToken,
    refetchInterval: REFETCH_INTERVAL_MS,
  };
  const { data, error, isLoading, isFetching, refetch } = useQuery<MCPGatewaySessionsResponse, Error>(queryOptions);
  const terminate = useMutation<MCPGatewaySessionsTerminateResponse, Error, MCPGatewaySessionSelector>({
    mutationFn: (selector) => terminateMCPGatewaySessions(accessToken!, selector),
    onSettled: () => queryClient.invalidateQueries({ queryKey: mcpGatewaySessionKeys.lists() }),
  });
  const confirmDisconnect = () => {
    if (pendingSelector === null) return;
    terminate.mutate(pendingSelector);
    setPendingSelector(null);
  };

  return (
    <div className="mt-4 space-y-4" data-testid="mcp-gateway-sessions-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">实时连接</h2>
          <p className="text-sm text-muted-foreground">
            此 Proxy Worker 上当前打开的有状态 Streamable HTTP 会话，按发起请求的 AI 客户端分组
            the MCP initialize request and by the authenticated LiteLLM user. Stateless requests and SSE connections are
            not counted.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="刷新实时连接"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {terminate.isError ? (
        <Alert variant="destructive">
          <AlertTitle>无法断开连接</AlertTitle>
          <AlertDescription>{terminate.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {terminate.isSuccess ? (
        <Alert>
          <AlertTitle>已断开</AlertTitle>
          <AlertDescription>
            {describeTerminateResult(terminate.data)} Clients holding those sessions must send a new initialize request,
            请求，这会重新进行身份验证。其他代理 worker 上的会话不受影响。
          </AlertDescription>
        </Alert>
      ) : null}

      <SessionsBody
        data={data}
        error={error}
        isLoading={isLoading}
        onDisconnect={canTerminate ? setPendingSelector : null}
      />

      <AlertDialog open={pendingSelector !== null} onOpenChange={(open) => !open && setPendingSelector(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>断开 MCP 会话</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSelector ? `这将在此代理 worker 上强制关闭${describeSelector(pendingSelector)}。` : ""}
              进行中的请求将失败，客户端必须重新 initialize 才能调用工具。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingSelector(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDisconnect} disabled={terminate.isPending}>
              断开
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MCPGatewaySessionsTab;
