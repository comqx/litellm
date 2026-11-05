import { describe, expect, it } from "vitest";

import type { TeamUserSpendResponse } from "@/components/networking";

import {
  buildTeamUserSpendCsv,
  sortBySpendDesc,
  teamUserSpendCsvFileName,
  teamUserSpendRowId,
  userLabel,
  type TeamUserSpendRow,
} from "./teamUserSpend";

const row = (overrides: Partial<TeamUserSpendRow>): TeamUserSpendRow => ({
  team_id: "team-alpha",
  team_alias: "Team Alpha",
  user_id: "alice@example.com",
  user_email: "alice@example.com",
  user_alias: null,
  spend: 0.5,
  prompt_tokens: 10,
  completion_tokens: 5,
  total_tokens: 15,
  api_requests: 3,
  successful_requests: 2,
  failed_requests: 1,
  ...overrides,
});

const aliceInBeta: Partial<TeamUserSpendRow> = {
  team_id: "team-beta",
  team_alias: "Team Beta",
  spend: 0.1,
  api_requests: 1,
};
const bobInAlpha: Partial<TeamUserSpendRow> = {
  user_id: "bob",
  user_email: null,
  user_alias: "Bob",
  spend: 0.25,
  api_requests: 2,
};

const response: TeamUserSpendResponse = {
  start_date: "2026-09-01",
  end_date: "2026-09-04",
  results: [row(aliceInBeta), row({}), row(bobInAlpha)],
};

describe("teamUserSpend", () => {
  it("keeps the same user as separate rows per team", () => {
    const ids = response.results.map(teamUserSpendRowId);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("labels a user by email, then alias, then id, then a placeholder", () => {
    expect(userLabel(row({}))).toBe("alice@example.com");
    expect(userLabel(row({ user_email: null, user_alias: "Bob", user_id: "u1" }))).toBe("Bob");
    expect(userLabel(row({ user_email: null, user_alias: null, user_id: "u1" }))).toBe("u1");
    expect(userLabel(row({ user_email: null, user_alias: null, user_id: "" }))).toBe("(无用户)");
  });

  it("sorts by spend descending without mutating the input", () => {
    const before = [...response.results];
    expect(sortBySpendDesc(response.results).map((r) => r.spend)).toEqual([0.5, 0.25, 0.1]);
    expect(response.results).toEqual(before);
  });

  it("writes one CSV line per (team, user) with the team kept on every line", () => {
    const lines = buildTeamUserSpendCsv(response).split(/\r?\n/);
    expect(lines[0]).toBe(
      "开始日期,结束日期,Team,Team ID,用户,用户 ID,用户邮箱,消耗 (USD),请求数,成功,失败,输入 Tokens,输出 Tokens,总 Tokens",
    );
    expect(lines.slice(1)).toEqual([
      "2026-09-01,2026-09-04,Team Alpha,team-alpha,alice@example.com,alice@example.com,alice@example.com,0.5,3,2,1,10,5,15",
      "开始日期,结束日期,Team,Team ID,用户,用户 ID,用户邮箱,消耗 (USD),请求数,成功,失败,输入 Tokens,输出 Tokens,总 Tokens",
      "2026-09-01,2026-09-04,Team Beta,team-beta,alice@example.com,alice@example.com,alice@example.com,0.1,1,2,1,10,5,15",
    ]);
  });

  it("neutralises spreadsheet formulas in user-controlled cells", () => {
    const csv = buildTeamUserSpendCsv({
      ...response,
      results: [row({ user_alias: null, user_email: "=HYPERLINK(1)" })],
    });
    expect(csv).toContain("'=HYPERLINK(1)");
  });

  it("names the file after the exported range", () => {
    expect(teamUserSpendCsvFileName(response)).toBe("team_user_spend_2026-09-01_to_2026-09-04.csv");
  });
});
