"use client";

import { SortingState } from "@tanstack/react-table";
import { Inbox } from "lucide-react";
import React, { useMemo, useState } from "react";

import DeleteResourceModal from "@/components/common_components/DeleteResourceModal";
import { DataTable } from "@/components/shared/DataTable";
import { toast } from "@/lib/toast";
import { isProxyAdminRole } from "@/utils/roles";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { ModelAccessGroup, useModelAccessGroups } from "@/app/(dashboard)/hooks/modelAccessGroups/useModelAccessGroups";
import { useDeleteModelAccessGroupBudget } from "@/app/(dashboard)/hooks/modelAccessGroups/useDeleteModelAccessGroupBudget";
import {
  SetModelAccessGroupBudgetParams,
  useSetModelAccessGroupBudget,
} from "@/app/(dashboard)/hooks/modelAccessGroups/useSetModelAccessGroupBudget";
import AccessGroupBudgetModal from "@/app/(dashboard)/models-and-endpoints/components/AccessGroupBudgetModal";
import { getAccessGroupBudgetColumns } from "@/app/(dashboard)/models-and-endpoints/components/AccessGroupBudgetColumns";

const DEFAULT_SORTING: SortingState = [{ id: "access_group", desc: false }];

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">暂无 模型访问组</div>
      <div className="text-sm text-muted-foreground">
        先在 模型设置中把部署加入某个 访问组，然后在这里为该组设置共享预算。
      </div>
    </div>
  );
}

export default function AccessGroupBudgetsPanel() {
  const { userRole } = useAuthorized();
  const { data: accessGroups, isLoading } = useModelAccessGroups();
  const setBudget = useSetModelAccessGroupBudget();
  const clearBudget = useDeleteModelAccessGroupBudget();

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [editing, setEditing] = useState<ModelAccessGroup | null>(null);
  const [clearing, setClearing] = useState<ModelAccessGroup | null>(null);

  const canWrite = isProxyAdminRole(userRole ?? "");
  const columns = useMemo(
    () => getAccessGroupBudgetColumns({ canWrite, onSetBudget: setEditing, onClearBudget: setClearing }),
    [canWrite],
  );

  const handleSubmit = (params: SetModelAccessGroupBudgetParams) => {
    if (!editing) return;
    const accessGroup = editing.access_group;
    setBudget.mutate(
      { accessGroup, params },
      {
        onSuccess: () => {
          toast.success(`已为 "${accessGroup}" 保存预算`);
          setEditing(null);
        },
      },
    );
  };

  const handleConfirmClear = () => {
    if (!clearing) return;
    const accessGroup = clearing.access_group;
    clearBudget.mutate(accessGroup, {
      onSuccess: () => {
        toast.success(`已清除 "${accessGroup}" 的预算`);
        setClearing(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        一个模型访问组 可以携带一个预算，所有按名称获得该组授权的 Key 共同从中扣费。通过通配符或 all-proxy-models 访问该组模型的 Key 不计入其中。
        that reach the group&apos;s models through a wildcard or all-proxy-models are not charged against it.
      </p>

      <DataTable
        data={accessGroups ?? []}
        paginationMode="client"
        columns={columns}
        getRowId={(group) => group.access_group}
        sortingMode="client"
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        loadingMessage="加载 模型访问组…"
        noDataMessage={<EmptyState />}
        size="compact"
      />

      <AccessGroupBudgetModal
        accessGroup={editing}
        isSaving={setBudget.isPending}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />

      <DeleteResourceModal
        isOpen={clearing !== null}
        title="清除预算"
        message="确定要清除此 访问组 的 预算吗？已记录的共享消耗 会一并清除，组内的模型 仍然可用。"
        resourceInformationTitle="访问组"
        resourceInformation={[
          { label: "访问组", value: clearing?.access_group ?? null, code: true },
          { label: "最大预算", value: clearing?.budget?.max_budget?.toString() ?? null },
        ]}
        onCancel={() => setClearing(null)}
        onOk={handleConfirmClear}
        confirmLoading={clearBudget.isPending}
      />
    </div>
  );
}
