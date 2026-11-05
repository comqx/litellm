import React, { useMemo, useState } from "react";
import { PaginatedMultiSelect } from "@/components/shared/PaginatedMultiSelect";
import type { SearchSelectOption } from "@/components/shared/SearchSelect";
import { useInfiniteTeams } from "@/app/(dashboard)/hooks/teams/useTeams";

interface TeamMultiSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  organizationId?: string | null;
  pageSize?: number;
  placeholder?: string;
}

const TeamMultiSelect: React.FC<TeamMultiSelectProps> = ({
  value = [],
  onChange,
  disabled,
  organizationId,
  pageSize = 20,
  placeholder = "按别名搜索 Team…",
}) => {
  const [search, setSearch] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteTeams(
    pageSize,
    search || undefined,
    organizationId,
  );

  const options = useMemo<SearchSelectOption[]>(
    () =>
      Array.from(
        new Map(
          (data?.pages ?? [])
            .flatMap((page) => page.teams)
            .map(
              (team) =>
                [
                  team.team_id,
                  { label: team.team_alias || team.team_id, value: team.team_id, sublabel: team.team_id },
                ] as const,
            ),
        ).values(),
      ),
    [data],
  );

  return (
    <PaginatedMultiSelect
      options={options}
      value={value}
      onValueChange={(next: string[]) => onChange?.(next)}
      onSearchChange={setSearch}
      onLoadMore={fetchNextPage}
      hasNextPage={hasNextPage}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      placeholder={placeholder}
      emptyText="未找到 Team"
      loadingText="加载 Team 中…"
      clearAllLabel="清除所有 Team"
      disabled={disabled}
    />
  );
};

export default TeamMultiSelect;
