"use client";

import { ColumnDef } from "@tanstack/react-table";

import { DateCell, IdCell, IdentityCell, StatusBadge, type StatusTone } from "@/components/shared/table_cells";

import DefaultProxyAdminTag from "../../common_components/DefaultProxyAdminTag";

export type AuditLogEntry = {
  id: string;
  updated_at: string;
  changed_by: string;
  changed_by_api_key: string;
  action: string;
  table_name: string;
  object_id: string;
  before_value: Record<string, unknown>;
  updated_values: Record<string, unknown>;
};

export const AUDIT_TABLE_NAME_DISPLAY: Record<string, string> = {
  LiteLLM_VerificationToken: "密钥",
  LiteLLM_TeamTable: "团队",
  LiteLLM_UserTable: "用户",
  LiteLLM_OrganizationTable: "组织",
  LiteLLM_ProxyModelTable: "模型",
  LiteLLM_AgentsTable: "智能体",
};

const ACTION_TONE: Record<string, StatusTone> = {
  created: "success",
  updated: "info",
  deleted: "error",
  rotated: "warning",
  kill_switch_fired: "error",
};

const ACTION_LABEL: Record<string, string> = {
  created: "创建",
  updated: "更新",
  deleted: "删除",
  rotated: "轮换",
  kill_switch_fired: "紧急关停",
};

export const auditActionLabel = (action: string): string => ACTION_LABEL[action] ?? action.replace(/_/g, " ");

interface AuditLogsTableColumnsDeps {
  onViewLog: (log: AuditLogEntry) => void;
}

export const getAuditLogsTableColumns = ({ onViewLog }: AuditLogsTableColumnsDeps): ColumnDef<AuditLogEntry>[] => [
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: "时间",
    size: 200,
    enableSorting: false,
    cell: ({ row }) => <DateCell value={row.original.updated_at} />,
  },
  {
    id: "action",
    accessorKey: "action",
    header: "操作",
    size: 110,
    enableSorting: false,
    cell: ({ row }) => (
      <StatusBadge tone={ACTION_TONE[row.original.action] ?? "neutral"} label={auditActionLabel(row.original.action)} />
    ),
  },
  {
    id: "table_name",
    accessorKey: "table_name",
    header: "表",
    size: 130,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm">{AUDIT_TABLE_NAME_DISPLAY[row.original.table_name] ?? row.original.table_name}</span>
    ),
  },
  {
    id: "object_id",
    accessorKey: "object_id",
    header: "对象 ID",
    minSize: 220,
    enableSorting: false,
    cell: ({ row }) => (
      <IdentityCell
        title={row.original.object_id}
        titleClassName="font-mono text-xs font-normal text-primary"
        className="max-w-72"
        onClick={() => onViewLog(row.original)}
      />
    ),
  },
  {
    id: "changed_by",
    accessorKey: "changed_by",
    header: "变更人",
    size: 200,
    enableSorting: false,
    cell: ({ row }) => <DefaultProxyAdminTag userId={row.original.changed_by} />,
  },
  {
    id: "changed_by_api_key",
    accessorKey: "changed_by_api_key",
    header: "API 密钥（哈希）",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <IdCell value={row.original.changed_by_api_key} variant="plain" />,
  },
];
