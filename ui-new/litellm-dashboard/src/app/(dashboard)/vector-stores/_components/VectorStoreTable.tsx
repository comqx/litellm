"use client";

import { SortingState } from "@tanstack/react-table";
import { Inbox } from "lucide-react";
import React, { useMemo, useState } from "react";

import { DataTable } from "@/components/shared/DataTable";
import { VectorStore } from "@/components/vector_store_management/types";

import { getVectorStoreTableColumns } from "./VectorStoreTableColumns";

interface VectorStoreTableProps {
  data: VectorStore[];
  onView: (vectorStoreId: string) => void;
  onEdit: (vectorStoreId: string) => void;
  onDelete: (vectorStoreId: string) => void;
  isLoading?: boolean;
}

const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: true }];

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">暂无 向量库</div>
      <div className="text-sm text-muted-foreground">
        连接 向量库 以启用检索增强生成（RAG）。
      </div>
    </div>
  );
}

const VectorStoreTable: React.FC<VectorStoreTableProps> = ({ data, onView, onEdit, onDelete, isLoading = false }) => {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);

  const columns = useMemo(() => getVectorStoreTableColumns({ onView, onEdit, onDelete }), [onView, onEdit, onDelete]);

  return (
    <DataTable
      data={data}
      paginationMode="client"
      columns={columns}
      getRowId={(vectorStore, index) => vectorStore.vector_store_id || String(index)}
      sortingMode="client"
      sorting={sorting}
      onSortingChange={setSorting}
      isLoading={isLoading}
      loadingMessage="正在加载 Vector Store…"
      noDataMessage={<EmptyState />}
      size="compact"
    />
  );
};

export default VectorStoreTable;
