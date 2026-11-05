"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";

import { DataTableSortHeader } from "@/components/shared/DataTable";
import { DateCell, IdCell, StatusBadge } from "@/components/shared/table_cells";
import { PolicyAttachment } from "@/components/policies/types";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cva.config";
import { copyToClipboard } from "@/utils/dataUtils";

import ImpactPopover from "./impact_popover";

function ChipList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.slice(0, 2).map((value) => (
        <StatusBadge key={value} tone="neutral" label={value} />
      ))}
      {values.length > 2 && (
        <StatusBadge tone="neutral" label={`+${values.length - 2}`} tooltip={values.slice(2).join(", ")} />
      )}
    </div>
  );
}

interface AttachmentRowActionsProps {
  attachment: PolicyAttachment;
  isAdmin: boolean;
  onDeleteClick: (attachmentId: string) => void;
}

const CONFIG_ATTACHMENT_HINT =
  "配置类绑定在配置文件中定义，无法在控制台中删除。";

function AttachmentRowActions({ attachment, isAdmin, onDeleteClick }: AttachmentRowActionsProps) {
  const isConfigAttachment = attachment.definition_location === "config";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="打开绑定操作菜单"
        data-testid={`attachment-actions-${attachment.attachment_id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          data-testid="attachment-action-copy-id"
          onClick={() => void copyToClipboard(attachment.attachment_id, "绑定 ID 已复制")}
        >
          <Copy />
          复制绑定 ID
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              data-testid="attachment-action-delete"
              disabled={isConfigAttachment}
              title={isConfigAttachment ? CONFIG_ATTACHMENT_HINT : undefined}
              onClick={() => onDeleteClick(attachment.attachment_id)}
            >
              <Trash2 />
              删除绑定
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AttachmentTableColumnsDeps {
  isAdmin: boolean;
  accessToken: string | null;
  onDeleteClick: (attachmentId: string) => void;
}

export const getAttachmentTableColumns = ({
  isAdmin,
  accessToken,
  onDeleteClick,
}: AttachmentTableColumnsDeps): ColumnDef<PolicyAttachment>[] => [
  {
    id: "attachment_id",
    accessorKey: "attachment_id",
    meta: { title: "绑定 ID" },
    header: "绑定 ID",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <IdCell value={row.original.attachment_id} variant="plain" />,
  },
  {
    id: "policy_name",
    accessorKey: "policy_name",
    meta: { title: "范围", skeleton: "badge" },
    header: ({ column }) => <DataTableSortHeader column={column} title="Policy" />,
    size: 180,
    enableSorting: true,
    cell: ({ row }) => <StatusBadge tone="info" label={row.original.policy_name} />,
  },
  {
    id: "scope",
    accessorFn: (row) => row.scope ?? "",
    meta: { title: "范围", skeleton: "badge" },
    header: "范围",
    size: 120,
    enableSorting: false,
    cell: ({ row }) => {
      const scope = row.original.scope;
      if (!scope) {
        return <span className="text-muted-foreground">-</span>;
      }
      if (scope === "*") {
        return <StatusBadge tone="warning" label="Global (*)" />;
      }
      return (
        <span className="block max-w-40 truncate text-xs" title={scope}>
          {scope}
        </span>
      );
    },
  },
  {
    id: "teams",
    meta: { title: "团队", skeleton: "chips" },
    header: "团队",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.teams ?? []} />,
  },
  {
    id: "keys",
    meta: { title: "Keys", skeleton: "chips" },
    header: "Keys",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.keys ?? []} />,
  },
  {
    id: "models",
    meta: { title: "模型", skeleton: "chips" },
    header: "模型",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.models ?? []} />,
  },
  {
    id: "tags",
    meta: { title: "标签", skeleton: "chips" },
    header: "标签",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <ChipList values={row.original.tags ?? []} />,
  },
  {
    id: "priority",
    accessorFn: (row) => row.priority ?? Number.POSITIVE_INFINITY,
    meta: { title: "优先级" },
    header: ({ column }) => <DataTableSortHeader column={column} title="优先级" />,
    size: 100,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.priority == null ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span className="font-mono text-xs">{row.original.priority}</span>
      ),
  },
  {
    id: "default",
    accessorFn: (row) => (row.default ? 1 : 0),
    meta: { title: "默认" },
    header: ({ column }) => <DataTableSortHeader column={column} title="默认" />,
    size: 100,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.default ? (
        <StatusBadge tone="info" label="默认" tooltip="仅在没有非默认绑定匹配时应用" />
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    id: "created_at",
    accessorFn: (row) => row.created_at ?? "",
    meta: { title: "创建时间" },
    header: ({ column }) => <DataTableSortHeader column={column} title="创建时间" />,
    size: 150,
    enableSorting: true,
    cell: ({ row }) => <DateCell value={row.original.created_at} />,
  },
  {
    id: "actions",
    meta: { className: "text-right", headerClassName: "text-right" },
    header: () => <span className="sr-only">操作</span>,
    size: 88,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <ImpactPopover attachment={row.original} accessToken={accessToken} />
        <AttachmentRowActions attachment={row.original} isAdmin={isAdmin} onDeleteClick={onDeleteClick} />
      </div>
    ),
  },
];
