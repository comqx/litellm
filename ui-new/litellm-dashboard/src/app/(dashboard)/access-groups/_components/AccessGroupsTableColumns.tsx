"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Bot, Layers, MoreHorizontal, Server, Trash2 } from "lucide-react";

import { DataTableSortHeader } from "@/components/shared/DataTable";
import { DateCell, IdentityCell } from "@/components/shared/table_cells";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cva.config";

import { AccessGroup } from "./types";

interface ResourceTone {
  icon: typeof Layers;
  className: string;
}

const RESOURCE_TONES: Record<"models" | "mcpServers" | "agents", ResourceTone> = {
  models: { icon: Layers, className: "bg-info/10 text-info ring-blue-600/20" },
  mcpServers: { icon: Server, className: "bg-info/10 text-info ring-cyan-600/20" },
  agents: {
    icon: Bot,
    className:
      "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950 dark:text-purple-300 dark:ring-purple-400/30",
  },
};

function ResourcesCell({ group }: { group: AccessGroup }) {
  const items = [
    { key: "models" as const, label: "模型", count: group.modelIds.length },
    { key: "mcpServers" as const, label: "MCP 服务器", count: group.mcpServerIds.length },
    { key: "agents" as const, label: "智能体", count: group.agentIds.length },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item) => {
        const tone = RESOURCE_TONES[item.key];
        const Icon = tone.icon;
        return (
          <span
            key={item.key}
            title={`${item.count} ${item.label}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset [&_svg]:size-3.5",
              tone.className,
            )}
          >
            <Icon />
            <span className="tabular-nums">{item.count}</span>
          </span>
        );
      })}
    </div>
  );
}

function AccessGroupRowActions({
  group,
  onDeleteClick,
}: {
  group: AccessGroup;
  onDeleteClick: (group: AccessGroup) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="打开 访问组 操作菜单"
        data-testid={`access-group-actions-${group.id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          variant="destructive"
          data-testid="access-group-action-delete"
          onClick={() => onDeleteClick(group)}
        >
          <Trash2 />
          删除 访问组
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AccessGroupsTableColumnsDeps {
  canModify: boolean;
  onGroupClick: (id: string) => void;
  onDeleteClick: (group: AccessGroup) => void;
}

export const getAccessGroupsTableColumns = ({
  canModify,
  onGroupClick,
  onDeleteClick,
}: AccessGroupsTableColumnsDeps): ColumnDef<AccessGroup>[] => {
  const columns: ColumnDef<AccessGroup>[] = [
    {
      id: "id",
      accessorKey: "id",
      meta: { title: "ID" },
      header: "ID",
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <IdentityCell
          title={row.original.id}
          titleClassName="font-mono text-xs font-normal"
          onClick={() => onGroupClick(row.original.id)}
        />
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      meta: { title: "名称" },
      header: ({ column }) => <DataTableSortHeader column={column} title="名称" />,
      size: 220,
      enableSorting: true,
      cell: ({ row }) => {
        const name = row.original.name;
        return (
          <span className="block max-w-72 truncate text-sm font-medium" title={name}>
            {name || "-"}
          </span>
        );
      },
    },
    {
      id: "resources",
      meta: { title: "资源" },
      header: "资源",
      size: 220,
      enableSorting: false,
      cell: ({ row }) => <ResourcesCell group={row.original} />,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      meta: { title: "创建时间" },
      header: ({ column }) => <DataTableSortHeader column={column} title="创建时间" />,
      size: 150,
      enableSorting: true,
      sortingFn: "datetime",
      cell: ({ row }) => <DateCell value={row.original.createdAt} precision="date" />,
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      meta: { title: "更新时间" },
      header: "更新时间",
      size: 150,
      enableSorting: false,
      cell: ({ row }) => <DateCell value={row.original.updatedAt} precision="date" />,
    },
  ];

  if (!canModify) {
    return columns;
  }

  return [
    ...columns,
    {
      id: "actions",
      meta: { className: "text-right", headerClassName: "text-right" },
      header: () => <span className="sr-only">操作</span>,
      size: 64,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AccessGroupRowActions group={row.original} onDeleteClick={onDeleteClick} />
        </div>
      ),
    },
  ];
};
