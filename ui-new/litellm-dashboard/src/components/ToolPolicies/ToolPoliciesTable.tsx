"use client";

import { ColumnFiltersState } from "@tanstack/react-table";
import { Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { ToolRow } from "@/components/networking";
import {
  DataTable,
  DataTableFilterDrawer,
  DataTableFilterField,
  DataTableToolbar,
} from "@/components/shared/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { INPUT_POLICY_OPTIONS, OUTPUT_POLICY_OPTIONS } from "./PolicySelect";
import { getToolPoliciesTableColumns } from "./ToolPoliciesTableColumns";

const ALL_VALUE = "all";

const INPUT_POLICY_FILTER_ITEMS = [
  { value: ALL_VALUE, label: "全部 输入策略" },
  ...INPUT_POLICY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const OUTPUT_POLICY_FILTER_ITEMS = [
  { value: ALL_VALUE, label: "全部 输出策略" },
  ...OUTPUT_POLICY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const toFilterValue = (value: string | null): string | undefined =>
  value === null || value === ALL_VALUE ? undefined : value;

interface ToolPoliciesTableProps {
  data: ToolRow[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectTool: (toolName: string) => void;
  savingInput: ReadonlySet<string>;
  savingOutput: ReadonlySet<string>;
  onInputPolicyChange: (toolName: string, policy: string) => void;
  onOutputPolicyChange: (toolName: string, policy: string) => void;
}

function ToolPoliciesEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <Wrench className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">
        {filtered ? "没有匹配的工具" : "未发现工具"}
      </div>
      <div className="max-w-xs text-center text-sm text-muted-foreground">
        {filtered ? "没有工具匹配你的搜索或筛选条件。" : "发起一次返回 tool_calls 的聊天补全请求，即可启动自动发现。"}
      </div>
    </div>
  );
}

function uniqueValues(rows: ToolRow[], pick: (row: ToolRow) => string | undefined): string[] {
  return Array.from(new Set(rows.map(pick).filter((value): value is string => Boolean(value))));
}

export function ToolPoliciesTable({
  data,
  isLoading,
  isRefreshing,
  onRefresh,
  onSelectTool,
  savingInput,
  savingOutput,
  onInputPolicyChange,
  onOutputPolicyChange,
}: ToolPoliciesTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const columns = useMemo(() => {
    const deps = { onSelectTool, savingInput, savingOutput, onInputPolicyChange, onOutputPolicyChange };
    return getToolPoliciesTableColumns(deps);
  }, [onSelectTool, savingInput, savingOutput, onInputPolicyChange, onOutputPolicyChange]);

  const teamOptions = useMemo(() => uniqueValues(data, (row) => row.team_id), [data]);
  const keyAliasOptions = useMemo(() => uniqueValues(data, (row) => row.key_alias), [data]);
  const teamFilterItems = useMemo(
    () => [
      { value: ALL_VALUE, label: "全部 Team" },
      ...teamOptions.map((option) => ({ value: option, label: option })),
    ],
    [teamOptions],
  );
  const keyAliasFilterItems = useMemo(
    () => [
      { value: ALL_VALUE, label: "全部 Key" },
      ...keyAliasOptions.map((option) => ({ value: option, label: option })),
    ],
    [keyAliasOptions],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.tool_id}
      sortingMode="client"
      defaultSorting={[{ id: "created_at", desc: true }]}
      paginationMode="client"
      pageSizeOptions={[50, 100]}
      filterMode="client"
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      isLoading={isLoading}
      loadingMessage="正在加载 Tool…"
      noDataMessage={<ToolPoliciesEmptyState filtered={columnFilters.length > 0 || globalFilter !== ""} />}
      size="compact"
      toolbar={(table) => (
        <>
          <DataTableToolbar
            table={table}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            searchPlaceholder="按 Tool 名称搜索"
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onOpenFilters={() => setFiltersOpen(true)}
            showViewOptions={false}
          />
          <DataTableFilterDrawer
            table={table}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            title="筛选"
            description="缩小已Found Tool 的范围"
          >
            {({ get, set }) => (
              <>
                <DataTableFilterField label="输入策略">
                  <Select
                    items={INPUT_POLICY_FILTER_ITEMS}
                    value={(get("input_policy") as string) ?? ALL_VALUE}
                    onValueChange={(value) => set("input_policy", toFilterValue(value))}
                  >
                    <SelectTrigger className="w-full" data-testid="filter-input-policy">
                      <SelectValue placeholder="全部 输入策略" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>全部 输入策略</SelectItem>
                      {INPUT_POLICY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DataTableFilterField>
                <DataTableFilterField label="输出策略">
                  <Select
                    items={OUTPUT_POLICY_FILTER_ITEMS}
                    value={(get("output_policy") as string) ?? ALL_VALUE}
                    onValueChange={(value) => set("output_policy", toFilterValue(value))}
                  >
                    <SelectTrigger className="w-full" data-testid="filter-output-policy">
                      <SelectValue placeholder="全部 输出策略" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>全部 输出策略</SelectItem>
                      {OUTPUT_POLICY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DataTableFilterField>
                <DataTableFilterField label="团队名称">
                  <Select
                    items={teamFilterItems}
                    value={(get("team_id") as string) ?? ALL_VALUE}
                    onValueChange={(value) => set("team_id", toFilterValue(value))}
                  >
                    <SelectTrigger className="w-full" data-testid="filter-team">
                      <SelectValue placeholder="全部团队" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>全部团队</SelectItem>
                      {teamOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DataTableFilterField>
                <DataTableFilterField label="密钥名称">
                  <Select
                    items={keyAliasFilterItems}
                    value={(get("key_alias") as string) ?? ALL_VALUE}
                    onValueChange={(value) => set("key_alias", toFilterValue(value))}
                  >
                    <SelectTrigger className="w-full" data-testid="filter-key-alias">
                      <SelectValue placeholder="全部密钥" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>全部密钥</SelectItem>
                      {keyAliasOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DataTableFilterField>
              </>
            )}
          </DataTableFilterDrawer>
        </>
      )}
    />
  );
}
