"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { useRoutingGroups, useSaveRoutingGroups } from "@/app/(dashboard)/hooks/routingGroups/useRoutingGroups";
import { useRouterFields } from "@/app/(dashboard)/hooks/router/useRouterFields";
import { useModelHub } from "@/app/(dashboard)/hooks/models/useModels";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useProxySettings from "@/app/(dashboard)/hooks/proxySettings/useProxySettings";
import RoutingGroupsTable from "./RoutingGroupsTable";
import RoutingGroupModal from "./RoutingGroupModal";
import { toast } from "@/lib/toast";
import type { RoutingGroup } from "./types";
import { groupNameByModel } from "./modelOwnership";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RoutingGroups: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useRoutingGroups();
  const { data: routerFields } = useRouterFields();
  const { data: modelHub } = useModelHub();
  const { accessToken } = useAuthorized();
  const proxySettings = useProxySettings(accessToken);
  const saveMutation = useSaveRoutingGroups();

  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = useState<RoutingGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<RoutingGroup | null>(null);

  const groups = useMemo(() => data?.routingGroups ?? [], [data?.routingGroups]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.group_name.toLowerCase().includes(q) ||
        g.routing_strategy.toLowerCase().includes(q) ||
        g.models.some((m) => m.toLowerCase().includes(q)),
    );
  }, [groups, searchQuery]);

  const availableStrategies = useMemo(() => {
    if (data?.availableStrategies?.length) return data.availableStrategies;
    if (routerFields?.routing_group_strategies?.length) return routerFields.routing_group_strategies;
    const fromFields = routerFields?.fields?.find((f) => f.field_name === "routing_strategy")?.options;
    return fromFields ?? [];
  }, [data?.availableStrategies, routerFields]);

  const strategyDescriptions = routerFields?.routing_strategy_descriptions ?? {};

  const ownerByModel = useMemo(
    () => groupNameByModel(groups, drawerMode === "edit" ? editingGroup?.group_name : undefined),
    [groups, drawerMode, editingGroup],
  );

  const modelOptions = useMemo<string[]>(() => {
    const records = (modelHub?.data ?? []) as Array<{ model_group?: string }>;
    const names = records.map((r) => r.model_group).filter((n): n is string => Boolean(n));
    return Array.from(new Set(names));
  }, [modelHub]);

  const openCreate = () => {
    setDrawerMode("create");
    setEditingGroup(null);
    setDrawerOpen(true);
  };

  const openEdit = (group: RoutingGroup) => {
    setDrawerMode("edit");
    setEditingGroup(group);
    setDrawerOpen(true);
  };

  const handleSubmit = async (incoming: RoutingGroup) => {
    const next: RoutingGroup[] =
      drawerMode === "create"
        ? [...groups, incoming]
        : groups.map((g) => (g.group_name === editingGroup?.group_name ? incoming : g));

    try {
      await saveMutation.mutateAsync(next);
      toast.success(
        drawerMode === "create" ? `已创建路由组「${incoming.group_name}」` : `已更新路由组「${incoming.group_name}」`,
      );
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存路由组失败");
    }
  };

  const confirmDelete = async () => {
    if (!deletingGroup) return;
    const next = groups.filter((g) => g.group_name !== deletingGroup.group_name);
    try {
      await saveMutation.mutateAsync(next);
      toast.success(`已删除路由组「${deletingGroup.group_name}」`);
      setDeletingGroup(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除路由组失败");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card size="sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="搜索分组…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label="清除搜索" onClick={() => setSearchQuery("")}>
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching && !isLoading}
                aria-busy={isFetching && !isLoading}
              >
                <RefreshCw />
                刷新
              </Button>
              <Button onClick={openCreate}>
                <Plus />
                创建组
              </Button>
              <span className="text-sm whitespace-nowrap text-muted-foreground">
                共 {filteredGroups.length} 条结果
              </span>
            </div>
          </div>

          <RoutingGroupsTable
            groups={filteredGroups}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={(g) => setDeletingGroup(g)}
            proxyBaseUrl={proxySettings.LITELLM_UI_API_DOC_BASE_URL?.trim() || proxySettings.PROXY_BASE_URL || ""}
          />
        </CardContent>
      </Card>

      <RoutingGroupModal
        open={drawerOpen}
        mode={drawerMode}
        initialValue={editingGroup}
        availableStrategies={availableStrategies}
        strategyDescriptions={strategyDescriptions}
        modelOptions={modelOptions}
        existingGroupNames={groups.map((g) => g.group_name)}
        groupNameByModel={ownerByModel}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        saving={saveMutation.isPending}
      />

      <Dialog open={Boolean(deletingGroup)} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>删除路由组？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground">
            {deletingGroup?.routing_strategy === "priority" ? (
              <>
                对 <span className="font-medium">{deletingGroup.group_name}</span>{" "}
                的调用将失效。直接请求其成员模型仍沿用原有路由行为。此操作不可撤销。
              </>
            ) : (
              <>
                <span className="font-medium">{deletingGroup?.group_name}</span>{" "}
                组内的模型将回退到代理顶层路由策略。此操作不可撤销。
              </>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingGroup(null)}>
              取消
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              disabled={saveMutation.isPending}
              aria-busy={saveMutation.isPending}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutingGroups;
