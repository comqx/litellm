import Papa from "papaparse";

import { TeamListCallOptions, TeamsResponse, teamListCall } from "@/app/(dashboard)/hooks/teams/useTeams";

import { Team } from "../key_team_helpers/key_list";
import { apiClient } from "../networking";

export interface TeamMemberBudget {
  budget_id: string;
  max_budget?: number | null;
  budget_duration?: string | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
}

export const TEAMS_EXPORT_PAGE_SIZE = 100;

type FetchTeamsPage = (page: number, pageSize: number) => Promise<TeamsResponse>;

export const fetchAllTeams = async (fetchPage: FetchTeamsPage): Promise<Team[]> => {
  const firstPage = await fetchPage(1, TEAMS_EXPORT_PAGE_SIZE);
  const totalPages = firstPage.total_pages ?? 1;
  if (totalPages <= 1) return firstPage.teams;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2, TEAMS_EXPORT_PAGE_SIZE)),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.teams);
};

const teamMemberBudgetId = (team: Team): string | null => {
  const id = team.metadata?.team_member_budget_id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

export const collectTeamMemberBudgetIds = (teams: Team[]): string[] =>
  Array.from(new Set(teams.map(teamMemberBudgetId).filter((id): id is string => id !== null)));

const cell = (value: string | number | boolean | null | undefined): string | number | boolean => value ?? "";

export const buildTeamsCsvRows = (
  teams: Team[],
  budgets: TeamMemberBudget[],
): Record<string, string | number | boolean>[] => {
  const budgetsById = new Map(budgets.map((budget) => [budget.budget_id, budget]));
  return teams.map((team) => {
    const budgetId = teamMemberBudgetId(team);
    const memberBudget = budgetId ? budgetsById.get(budgetId) : undefined;
    return {
      "团队别名": cell(team.team_alias),
      "团队 ID": cell(team.team_id),
      "组织 ID": cell(team.organization_id),
      Models: (team.models ?? []).join(", "),
      "最大预算 (USD)": cell(team.max_budget),
      "Budget 周期": cell(team.budget_duration),
      "预算重置时间": cell(team.budget_reset_at),
      "消耗 (USD)": cell(team.spend),
      "TPM 上限": cell(team.tpm_limit),
      "RPM 上限": cell(team.rpm_limit),
      "团队成员 预算 (USD)": cell(memberBudget?.max_budget),
      "团队成员 Budget 周期": cell(memberBudget?.budget_duration),
      "团队成员 TPM 上限": cell(memberBudget?.tpm_limit),
      "团队成员 RPM 上限": cell(memberBudget?.rpm_limit),
      Members: cell(team.members_count ?? team.members_with_roles?.length),
      Keys: cell(team.keys_count ?? team.keys?.length),
      Blocked: cell(team.blocked),
      "Created At": cell(team.created_at),
    };
  });
};

export const buildTeamsCsv = (teams: Team[], budgets: TeamMemberBudget[]): string =>
  Papa.unparse(buildTeamsCsvRows(teams, budgets), { escapeFormulae: true });

const downloadCsv = (csv: string, fileName: string): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportTeamsToCsv = async (accessToken: string, options: TeamListCallOptions): Promise<number> => {
  const teams = await fetchAllTeams((page, pageSize) => teamListCall(accessToken, page, pageSize, options));
  const budgetIds = collectTeamMemberBudgetIds(teams);
  const budgets = budgetIds.length
    ? await apiClient.post<TeamMemberBudget[]>("/budget/info", { accessToken, body: { budgets: budgetIds } })
    : [];
  downloadCsv(buildTeamsCsv(teams, budgets), `teams_export_${new Date().toISOString().split("T")[0]}.csv`);
  return teams.length;
};
