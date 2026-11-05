"use client";

import { OnChangeFn, PaginationState } from "@tanstack/react-table";
import { KeyRound } from "lucide-react";
import { useMemo } from "react";

import { KeyResponse } from "@/components/key_team_helpers/key_list";
import { DataTable } from "@/components/shared/DataTable";

import { getProjectKeysTableColumns } from "./ProjectKeysTableColumns";
import { PROJECT_KEYS_PAGE_SIZE_OPTIONS } from "./useProjectsUrlState";

interface ProjectKeysTableProps {
  keys: KeyResponse[];
  totalCount: number;
  isLoading: boolean;
  isError?: boolean;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <KeyRound className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">未找到 Keys</div>
      <div className="text-sm text-muted-foreground">在此 Project 中创建的 Keys 会显示在这里。</div>
    </div>
  );
}

export function ProjectKeysTable({
  keys,
  totalCount,
  isLoading,
  isError = false,
  pagination,
  onPaginationChange,
}: ProjectKeysTableProps) {
  const columns = useMemo(() => getProjectKeysTableColumns(), []);

  return (
    <DataTable
      data={keys}
      columns={columns}
      getRowId={(key, index) => key.token || String(index)}
      paginationMode="server"
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowCount={totalCount}
      pageSizeOptions={PROJECT_KEYS_PAGE_SIZE_OPTIONS}
      isLoading={isLoading}
      isError={isError}
      loadingMessage="正在加载密钥…"
      noDataMessage={<EmptyState />}
      size="compact"
    />
  );
}
