"use client";

import { ArrowLeft, History, Wrench } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
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
import TeamDropdown from "@/components/common_components/team_dropdown";
import { LogViewer } from "@/components/GuardrailsMonitor/LogViewer";
import type { LogEntry } from "@/components/GuardrailsMonitor/mockData";
import { PolicySelect } from "@/components/ToolPolicies/PolicySelect";
import {
  deleteToolPolicyOverride,
  fetchToolDetail,
  fetchToolPolicyOptions,
  getToolUsageLogs,
  keyListCall,
  updateToolPolicy,
  type ToolPolicyOverrideRow,
} from "@/components/networking";

interface ToolDetailProps {
  toolName: string;
  onBack: () => void;
  accessToken: string | null;
}

interface KeyOption {
  token: string;
  key_alias?: string;
}

interface KeyItem {
  value: string;
  label: string;
}

const TOOL_DETAIL_QUERY_KEY = "tool-detail";

const LOGS_PAGE_SIZE = 50;

function getDefaultLogsDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  return { start: fmt(start), end: fmt(end) };
}

export function ToolDetail({ toolName, onBack, accessToken }: ToolDetailProps) {
  const queryClient = useQueryClient();
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [inputPolicySaving, setInputPolicySaving] = useState(false);
  const [outputPolicySaving, setOutputPolicySaving] = useState(false);
  const [blockScope, setBlockScope] = useState<"team" | "key">("team");
  const [blockTeamId, setBlockTeamId] = useState<string | null>(null);
  const [blockKey, setBlockKey] = useState<KeyOption | null>(null);

  const logsDateRange = useMemo(() => getDefaultLogsDateRange(), []);

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery({
    queryKey: [TOOL_DETAIL_QUERY_KEY, toolName],
    queryFn: () => fetchToolDetail(accessToken!, toolName),
    enabled: !!accessToken && !!toolName,
  });

  const { data: policyOptions } = useQuery({
    queryKey: ["tool-policy-options"],
    queryFn: () => fetchToolPolicyOptions(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const { data: keysData } = useQuery({
    queryKey: ["keys-list-tool-detail"],
    queryFn: () => keyListCall(accessToken!, null, null, null, null, null, 1, 100),
    enabled: !!accessToken,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["tool-usage-logs", toolName, logsDateRange.start, logsDateRange.end],
    queryFn: () =>
      getToolUsageLogs(accessToken!, toolName, {
        page: 1,
        pageSize: LOGS_PAGE_SIZE,
        startDate: logsDateRange.start,
        endDate: logsDateRange.end,
      }),
    enabled: !!accessToken && !!toolName,
  });

  const logs: LogEntry[] = useMemo(() => {
    const list = logsData?.logs ?? [];
    return list.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      action: "passed" as const,
      model: l.model ?? undefined,
      input_snippet: l.input_snippet ?? undefined,
    }));
  }, [logsData?.logs]);

  const keys: KeyOption[] = useMemo(() => {
    const keysRes = keysData?.keys ?? keysData?.data ?? [];
    return keysRes.map((k: { token?: string; api_key?: string; key_hash?: string; key_alias?: string }) => ({
      token: k.token ?? k.api_key ?? k.key_hash ?? "",
      key_alias: k.key_alias ?? (k.token ?? k.api_key ?? k.key_hash)?.toString?.()?.substring?.(0, 8),
    }));
  }, [keysData]);

  const keyItems: KeyItem[] = useMemo(
    () => keys.map((k) => ({ value: k.token, label: k.key_alias || k.token?.substring?.(0, 12) || k.token })),
    [keys],
  );

  const invalidateDetail = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [TOOL_DETAIL_QUERY_KEY, toolName] });
  }, [queryClient, toolName]);

  const handleInputPolicyChange = useCallback(
    async (_name: string, newPolicy: string) => {
      if (!accessToken) return;
      setInputPolicySaving(true);
      try {
        await updateToolPolicy(accessToken, toolName, { input_policy: newPolicy });
        invalidateDetail();
      } catch (e: unknown) {
        alert(`更新输入策略失败：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setInputPolicySaving(false);
      }
    },
    [accessToken, toolName, invalidateDetail],
  );

  const handleOutputPolicyChange = useCallback(
    async (_name: string, newPolicy: string) => {
      if (!accessToken) return;
      setOutputPolicySaving(true);
      try {
        await updateToolPolicy(accessToken, toolName, { output_policy: newPolicy });
        invalidateDetail();
      } catch (e: unknown) {
        alert(`更新输出策略失败：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setOutputPolicySaving(false);
      }
    },
    [accessToken, toolName, invalidateDetail],
  );

  const handleAddOverride = useCallback(async () => {
    if (!accessToken || !toolName) return;
    const isTeam = blockScope === "team";
    if (isTeam && !blockTeamId) return;
    if (!isTeam && !blockKey?.token) return;
    setOverrideSaving(true);
    try {
      await updateToolPolicy(
        accessToken,
        toolName,
        { input_policy: "blocked" },
        {
          team_id: isTeam ? blockTeamId : undefined,
          key_hash: !isTeam ? blockKey!.token : undefined,
          key_alias: !isTeam ? blockKey!.key_alias : undefined,
        },
      );
      invalidateDetail();
      setBlockTeamId(null);
      setBlockKey(null);
    } catch (e: unknown) {
      alert(`添加覆盖规则失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOverrideSaving(false);
    }
  }, [accessToken, toolName, blockScope, blockTeamId, blockKey, invalidateDetail]);

  const handleRemoveOverride = useCallback(
    async (override: ToolPolicyOverrideRow) => {
      if (!accessToken || !toolName) return;
      setOverrideSaving(true);
      try {
        await deleteToolPolicyOverride(accessToken, toolName, {
          team_id: override.team_id ?? undefined,
          key_hash: override.key_hash ?? undefined,
        });
        invalidateDetail();
      } catch (e: unknown) {
        alert(`移除覆盖规则失败：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setOverrideSaving(false);
      }
    },
    [accessToken, toolName, invalidateDetail],
  );

  if (detailLoading && !detail) {
    return (
      <div className="flex items-center justify-center py-12">
        <UiLoadingSpinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (detailError && !detail) {
    return (
      <div>
        <Button variant="link" onClick={onBack} className="mb-4 pl-0">
          <ArrowLeft />
          返回工具策略
        </Button>
        <p className="text-destructive">加载工具详情失败。</p>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const { tool, overrides } = detail;

  const inputDesc = policyOptions?.input_policies?.find((p) => p.value === tool.input_policy)?.description;
  const outputDesc = policyOptions?.output_policies?.find((p) => p.value === tool.output_policy)?.description;

  return (
    <div>
      <div className="mb-6">
        <Button variant="link" onClick={onBack} className="mb-4 pl-0">
          <ArrowLeft />
          返回工具策略
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <Wrench className="size-5 text-muted-foreground" />
              <h1 className="font-mono text-xl font-semibold">{tool.tool_name}</h1>
              <Badge variant="outline">{tool.origin ?? "—"}</Badge>
              <Badge variant="secondary">{(tool.call_count ?? 0).toLocaleString()} 次调用</Badge>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {tool.user_agent && (
                <div className="flex items-center gap-1.5">
                  <dt className="font-medium whitespace-nowrap">用户代理:</dt>
                  <dd className="max-w-[40ch] truncate font-mono" title={tool.user_agent}>
                    {tool.user_agent}
                  </dd>
                </div>
              )}
              {tool.created_at && (
                <div className="flex items-center gap-1.5">
                  <dt className="font-medium whitespace-nowrap">首次发现：</dt>
                  <dd>{new Date(tool.created_at).toLocaleString()}</dd>
                </div>
              )}
              {tool.last_used_at && (
                <div className="flex items-center gap-1.5">
                  <dt className="font-medium whitespace-nowrap">最近使用：</dt>
                  <dd>{new Date(tool.last_used_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Two-panel policy layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="mb-1 text-sm font-semibold">输入策略</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {inputDesc ?? "控制此工具允许接受的数据。"}
            </p>
            <PolicySelect
              value={tool.input_policy}
              toolName={tool.tool_name}
              saving={inputPolicySaving}
              onChange={handleInputPolicyChange}
              policyType="input"
              size="middle"
              minWidth={140}
              stopPropagation={false}
            />
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="mb-1 text-sm font-semibold">输出策略</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {outputDesc ?? "控制下游工具如何信任此工具的输出。"}
            </p>
            <PolicySelect
              value={tool.output_policy}
              toolName={tool.tool_name}
              saving={outputPolicySaving}
              onChange={handleOutputPolicyChange}
              policyType="output"
              size="middle"
              minWidth={140}
              stopPropagation={false}
            />
          </section>
        </div>

        {overrides.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold">已按团队或密钥阻止</h2>
            <ul className="divide-y divide-border rounded-md border border-border">
              {overrides.map((ov) => (
                <li key={ov.override_id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span>
                    {ov.team_id ? `团队：${ov.team_id}` : ""}
                    {ov.team_id && ov.key_hash ? " · " : ""}
                    {ov.key_hash ? `密钥：${ov.key_alias || ov.key_hash.substring(0, 8)}` : ""}
                    {!ov.team_id && !ov.key_hash ? "—" : ""}
                  </span>
                  <Button variant="link" size="sm" disabled={overrideSaving} onClick={() => handleRemoveOverride(ov)}>
                    移除
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold">按团队或密钥阻止</h2>
          <div className="flex max-w-md flex-col gap-4">
            <div>
              <span className="mb-2 block text-sm font-medium">范围</span>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={blockScope === "team"}
                    onChange={() => setBlockScope("team")}
                    className="align-middle"
                  />
                  团队
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={blockScope === "key"}
                    onChange={() => setBlockScope("key")}
                    className="align-middle"
                  />
                  密钥
                </label>
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium">{blockScope === "team" ? "团队" : "密钥"}</span>
              {blockScope === "team" ? (
                <TeamDropdown value={blockTeamId ?? undefined} onChange={(id) => setBlockTeamId(id || null)} />
              ) : (
                <Combobox
                  items={keyItems}
                  value={keyItems.find((k) => k.value === blockKey?.token) ?? null}
                  onValueChange={(item: KeyItem | null) =>
                    setBlockKey(keys.find((k) => k.token === item?.value) ?? null)
                  }
                >
                  <ComboboxInput placeholder="选择密钥" showClear className="w-full min-w-50" />
                  <ComboboxContent>
                    <ComboboxEmpty>未找到密钥</ComboboxEmpty>
                    <ComboboxList>
                      {(item: KeyItem) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </div>
            <Button
              variant="destructive"
              disabled={overrideSaving || (blockScope === "team" ? !blockTeamId : !blockKey?.token)}
              onClick={handleAddOverride}
            >
              {blockScope === "team" ? "阻止该团队" : "阻止该密钥"}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" />
            最近调用
          </h2>
          <LogViewer
            guardrailName={tool.tool_name}
            filterAction="passed"
            logs={logs}
            logsLoading={logsLoading}
            totalLogs={logsData?.total ?? 0}
            accessToken={accessToken}
            startDate={logsDateRange.start}
            endDate={logsDateRange.end}
          />
        </section>
      </div>
    </div>
  );
}
