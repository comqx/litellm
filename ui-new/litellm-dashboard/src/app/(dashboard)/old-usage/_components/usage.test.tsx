import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/test-utils";
import UsagePage from "./usage";

const networking = vi.hoisted(() => ({
  adminSpendLogsCall: vi.fn(),
  adminTopKeysCall: vi.fn(),
  adminTopModelsCall: vi.fn(),
  adminTopEndUsersCall: vi.fn(),
  teamSpendLogsCall: vi.fn(),
  tagsSpendLogsCall: vi.fn(),
  allTagNamesCall: vi.fn(),
  adminspendByProvider: vi.fn(),
  adminGlobalActivity: vi.fn(),
  adminGlobalActivityPerModel: vi.fn(),
  getProxyUISettings: vi.fn(),
  modelAvailableCall: vi.fn(),
  keyInfoV1Call: vi.fn(),
}));

vi.mock("@/components/networking", () => networking);
vi.mock("../../../../components/networking", () => networking);

vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: () => ({
    accessToken: "sk-test",
    token: "tok",
    userRole: "Admin",
    userId: "u1",
    premiumUser: true,
  }),
}));

const UNLIMITED_SETTINGS = { DISABLE_EXPENSIVE_DB_QUERIES: false, NUM_SPEND_LOGS_ROWS: 10 };

const renderUsage = (overrides: Partial<React.ComponentProps<typeof UsagePage>> = {}) =>
  renderWithProviders(
    <UsagePage
      accessToken="sk-test"
      token="tok"
      userRole="Admin"
      userID="u1"
      keys={null}
      premiumUser={true}
      {...overrides}
    />,
  );

// Width of this window is guarded by "proves the flush window is wide enough".
const flushPendingRequests = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  networking.getProxyUISettings.mockResolvedValue(UNLIMITED_SETTINGS);
  networking.adminSpendLogsCall.mockResolvedValue([{ date: "2026-07-01", spend: 12.5 }]);
  networking.adminTopKeysCall.mockResolvedValue([
    { api_key: "sk-abcdefghijk", key_alias: "prod-key", total_spend: 9.5 },
  ]);
  networking.adminTopModelsCall.mockResolvedValue([{ model: "gpt-5.1", total_spend: 7.25 }]);
  networking.adminTopEndUsersCall.mockResolvedValue([
    { end_user: "customer-alpha", total_spend: 3.5, total_count: 42 },
  ]);
  networking.teamSpendLogsCall.mockResolvedValue({
    daily_spend: [{ date: "2026-07-01", "team-a": 5 }],
    teams: ["team-a"],
    total_spend_per_team: [{ team_id: "team-a", total_spend: 5 }],
  });
  networking.tagsSpendLogsCall.mockResolvedValue({ spend_per_tag: [{ name: "prod", spend: 4 }] });
  networking.allTagNamesCall.mockResolvedValue({ tag_names: ["prod", "staging"] });
  networking.adminspendByProvider.mockResolvedValue([{ provider: "openai", spend: 6.75 }]);
  networking.adminGlobalActivity.mockResolvedValue({
    sum_api_requests: 120,
    sum_total_tokens: 4500,
    daily_data: [{ date: "2026-07-01", api_requests: 120, total_tokens: 4500 }],
  });
  networking.adminGlobalActivityPerModel.mockResolvedValue([]);
  networking.modelAvailableCall.mockResolvedValue({ data: [] });
  networking.keyInfoV1Call.mockResolvedValue({ info: {} });
});

describe("old usage page", () => {
  describe("when the proxy has disabled expensive DB queries", () => {
    beforeEach(() => {
      networking.getProxyUISettings.mockResolvedValue({
        DISABLE_EXPENSIVE_DB_QUERIES: true,
        NUM_SPEND_LOGS_ROWS: 2500000,
      });
    });

    it("shows the database query limit warning instead of the usage dashboard", async () => {
      renderUsage();

      expect(await screen.findByText("已达数据库查询上限")).toBeInTheDocument();
      expect(screen.getByText(/SpendLogs in DB has/)).toHaveTextContent("2500000");
      expect(screen.getByText(/Please follow our guide to view usage when SpendLogs has more than 1M rows/i));
      expect(screen.queryByRole("tab", { name: "总览" })).not.toBeInTheDocument();
    });

    it("links to the cost tracking guide in a new tab", async () => {
      renderUsage();

      const link = await screen.findByRole("link", { name: "查看用量指南" });
      expect(link).toHaveAttribute("href", "https://docs.litellm.ai/docs/proxy/cost_tracking");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("skips every expensive usage query", async () => {
      renderUsage();

      await screen.findByText("已达数据库查询上限");
      await waitFor(() => expect(networking.getProxyUISettings).toHaveBeenCalled());

      expect(networking.adminSpendLogsCall).not.toHaveBeenCalled();
      expect(networking.adminspendByProvider).not.toHaveBeenCalled();
      expect(networking.adminTopKeysCall).not.toHaveBeenCalled();
      expect(networking.adminTopModelsCall).not.toHaveBeenCalled();
      expect(networking.adminGlobalActivity).not.toHaveBeenCalled();
      expect(networking.adminGlobalActivityPerModel).not.toHaveBeenCalled();
      expect(networking.teamSpendLogsCall).not.toHaveBeenCalled();
      expect(networking.adminTopEndUsersCall).not.toHaveBeenCalled();
      expect(networking.tagsSpendLogsCall).not.toHaveBeenCalled();
    });
  });

  describe("as an admin", () => {
    it("renders the admin tabs", async () => {
      renderUsage();

      expect(await screen.findByRole("tab", { name: "总览" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "按 Team 统计的用量" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "客户用量" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "按 Tag 统计的用量" })).toBeInTheDocument();
    });

    it("renders the cost panel cards", async () => {
      renderUsage();

      expect(await screen.findByText("每月 Spend")).toBeInTheDocument();
      expect(screen.getByText("Spend 最高的 Virtual Key")).toBeInTheDocument();
      expect(screen.getByText("Top Model（按 Spend）")).toBeInTheDocument();
      expect(screen.getByText("按 Provider 统计的 Spend")).toBeInTheDocument();
    });

    it("lists spend by provider in a table", async () => {
      renderUsage();

      const providerCell = await screen.findByText("openai");
      const row = providerCell.closest("tr");
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText("$6.75")).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "总事件数" })).toBeInTheDocument();
    });

    it("shows the customer usage table when its tab is selected", async () => {
      const user = userEvent.setup();
      renderUsage();

      await user.click(await screen.findByRole("tab", { name: "客户用量" }));

      const customerCell = await screen.findByText("customer-alpha");
      const row = customerCell.closest("tr");
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText("$3.50")).toBeInTheDocument();
      expect(within(row as HTMLElement).getByText("42")).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "总事件数" })).toBeInTheDocument();
    });

    it("shows the tag spend panel when its tab is selected", async () => {
      const user = userEvent.setup();
      renderUsage();

      await user.click(await screen.findByRole("tab", { name: "按 Tag 统计的用量" }));

      expect(await screen.findByText("每个 Tag 的 Spend")).toBeInTheDocument();
    });

    it("shows the team spend panel when its tab is selected", async () => {
      const user = userEvent.setup();
      renderUsage();

      await user.click(await screen.findByRole("tab", { name: "按 Team 统计的用量" }));

      expect(await screen.findByText("各 Team 总 Spend")).toBeInTheDocument();
      expect(screen.getByText("各 Team 每日 Spend")).toBeInTheDocument();
    });
  });

  // org_admin is an organization membership role; those users reach the UI as "内部用户".
  describe.each(["内部用户", "内部查看者", "internal_user", "internal_user_viewer", "Org Admin"])(
    "as %s",
    (userRole) => {
      it("shows the admin-only notice instead of the usage dashboard", async () => {
        renderUsage({ userRole });

        expect(await screen.findByText(/Proxy-wide usage is only available to admin users/i)).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: "总览" })).not.toBeInTheDocument();
      });

      it("fires no /global/spend or /global/activity request", async () => {
        renderUsage({ userRole });

        await screen.findByText(/Proxy-wide usage is only available to admin users/i);
        await flushPendingRequests();

        expect(networking.getProxyUISettings).not.toHaveBeenCalled();
        expect(networking.adminSpendLogsCall).not.toHaveBeenCalled();
        expect(networking.adminTopKeysCall).not.toHaveBeenCalled();
        expect(networking.adminTopModelsCall).not.toHaveBeenCalled();
        expect(networking.adminTopEndUsersCall).not.toHaveBeenCalled();
        expect(networking.teamSpendLogsCall).not.toHaveBeenCalled();
        expect(networking.tagsSpendLogsCall).not.toHaveBeenCalled();
        expect(networking.allTagNamesCall).not.toHaveBeenCalled();
        expect(networking.adminspendByProvider).not.toHaveBeenCalled();
        expect(networking.adminGlobalActivity).not.toHaveBeenCalled();
        expect(networking.adminGlobalActivityPerModel).not.toHaveBeenCalled();
      });
    },
  );

  describe("the admin-only gate", () => {
    it("proves the flush window is wide enough to catch a leaked request", async () => {
      renderUsage({ userRole: "Admin" });

      await flushPendingRequests();

      expect(networking.getProxyUISettings).toHaveBeenCalled();
      expect(networking.adminSpendLogsCall).toHaveBeenCalled();
      expect(networking.tagsSpendLogsCall).toHaveBeenCalled();
      expect(networking.adminGlobalActivity).toHaveBeenCalled();
    });

    it("still lets an admin through, so the notice is a real gate and not a dead branch", async () => {
      renderUsage({ userRole: "Admin" });

      expect(await screen.findByRole("tab", { name: "总览" })).toBeInTheDocument();
      expect(screen.queryByText(/Proxy-wide usage is only available to admin users/i)).not.toBeInTheDocument();
      await waitFor(() => expect(networking.adminSpendLogsCall).toHaveBeenCalled());
    });

    it("does not put the session token in the provider spend query", async () => {
      renderUsage({ userRole: "Admin", token: "session-jwt-value" });

      await waitFor(() => expect(networking.adminspendByProvider).toHaveBeenCalled());
      const callArgs = networking.adminspendByProvider.mock.calls[0];
      expect(callArgs).not.toContain("session-jwt-value");
      expect(callArgs[0]).toBe("sk-test");
    });
  });
});
