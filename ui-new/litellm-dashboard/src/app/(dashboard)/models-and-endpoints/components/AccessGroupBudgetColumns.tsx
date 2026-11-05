"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Wallet } from "lucide-react";

import { getBudgetDurationLabel } from "@/components/common_components/budget_duration_dropdown";
import { DataTableSortHeader } from "@/components/shared/DataTable";
import { ModelsCell, SpendBudgetCell } from "@/components/shared/table_cells";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cva.config";
import { ModelAccessGroup } from "@/app/(dashboard)/hooks/modelAccessGroups/useModelAccessGroups";

const budgetDecimals = (maxBudget: number | null | undefined): number =>
  maxBudget != null && maxBudget > 0 && maxBudget < 0.01 ? 5 : 2;

/**
 * A group name is a free-text path segment on the budget routes, so a `/` in it splits the path and
 * no encoding recovers it. Such a group is listed but its budget is unreachable.
 */
export const isBudgetAddressable = (accessGroup: string): boolean => !accessGroup.includes("/");

const writeBlockedReason = (accessGroup: ModelAccessGroup, canWrite: boolean): string | undefined => {
  if (!canWrite) return "只有代理管理员可以修改 访问组 的预算";
  if (!isBudgetAddressable(accessGroup.access_group)) {
    return "名称包含斜杠的 访问组 无法设置 Budget";
  }
  return undefined;
};

interface AccessGroupRowActionsProps {
  accessGroup: ModelAccessGroup;
  canWrite: boolean;
  onSetBudget: (accessGroup: ModelAccessGroup) => void;
  onClearBudget: (accessGroup: ModelAccessGroup) => void;
}

function AccessGroupRowActions({ accessGroup, canWrite, onSetBudget, onClearBudget }: AccessGroupRowActionsProps) {
  const hasBudget = accessGroup.budget != null;
  const blocked = writeBlockedReason(accessGroup, canWrite);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`打开 ${accessGroup.access_group} 的预算 操作`}
        data-testid={`access-group-actions-${accessGroup.access_group}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          disabled={blocked !== undefined}
          title={blocked}
          data-testid="access-group-action-set-budget"
          onClick={() => onSetBudget(accessGroup)}
        >
          <Wallet />
          {hasBudget ? "编辑 Budget" : "设置 Budget"}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={blocked !== undefined || !hasBudget}
          data-testid="access-group-action-clear-budget"
          title={blocked ?? (hasBudget ? undefined : "此 访问组 没有可清除的预算")}
          onClick={() => onClearBudget(accessGroup)}
        >
          <Trash2 />
          清除预算
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AccessGroupBudgetColumnsDeps {
  canWrite: boolean;
  onSetBudget: (accessGroup: ModelAccessGroup) => void;
  onClearBudget: (accessGroup: ModelAccessGroup) => void;
}

export const getAccessGroupBudgetColumns = ({
  canWrite,
  onSetBudget,
  onClearBudget,
}: AccessGroupBudgetColumnsDeps): ColumnDef<ModelAccessGroup>[] => [
  {
    id: "access_group",
    accessorKey: "access_group",
    meta: { title: "访问组" },
    header: ({ column }) => <DataTableSortHeader column={column} title="访问组" />,
    size: 220,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="block max-w-56 truncate font-mono text-xs" title={row.original.access_group}>
        {row.original.access_group}
      </span>
    ),
  },
  {
    id: "models",
    meta: { title: "模型", skeleton: "chips" },
    header: "模型",
    size: 280,
    enableSorting: false,
    cell: ({ row }) => <ModelsCell models={row.original.model_names} />,
  },
  {
    id: "deployment_count",
    accessorKey: "deployment_count",
    meta: { title: "部署数", numeric: true },
    header: ({ column }) => <DataTableSortHeader column={column} title="部署数" />,
    size: 120,
    enableSorting: true,
    cell: ({ row }) => row.original.deployment_count,
  },
  {
    id: "spend",
    accessorKey: "spend",
    meta: { title: "共享消耗" },
    header: ({ column }) => <DataTableSortHeader column={column} title="共享消耗" />,
    size: 180,
    enableSorting: true,
    cell: ({ row }) => (
      <SpendBudgetCell
        spend={row.original.spend}
        maxBudget={row.original.budget?.max_budget}
        budgetDecimals={budgetDecimals(row.original.budget?.max_budget)}
      />
    ),
  },
  {
    id: "budget_duration",
    meta: { title: "重置周期" },
    header: "重置周期",
    size: 110,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {getBudgetDurationLabel(row.original.budget?.budget_duration)}
      </span>
    ),
  },
  {
    id: "actions",
    meta: { className: "text-right", headerClassName: "text-right" },
    header: () => <span className="sr-only">操作</span>,
    size: 64,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <AccessGroupRowActions
          accessGroup={row.original}
          canWrite={canWrite}
          onSetBudget={onSetBudget}
          onClearBudget={onClearBudget}
        />
      </div>
    ),
  },
];
