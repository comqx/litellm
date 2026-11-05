import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../tests/test-utils";
import Sidebar, { menuGroups, getBreadcrumb } from "./leftnav";

vi.mock("../utils/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/roles")>();
  return {
    ...actual,
    all_admin_roles: ["admin", "admin_viewer"],
    old_admin_roles: ["admin", "admin_viewer"],
    internalUserRoles: ["internal"],
    rolesWithWriteAccess: ["admin", "internal"],
    rolesAllowedToViewWriteScopedPages: ["admin", "internal", "admin_viewer"],
    isAdminRole: (role: string) => role === "admin" || role === "admin_viewer",
    isUserTeamAdminForAnyTeam: actual.isUserTeamAdminForAnyTeam,
  };
});

const navState = vi.hoisted(() => ({ pathname: "/ui/api-keys" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const { mockUseAuthorized, mockUseOrganizations, mockUseTeams } = vi.hoisted(() => {
  const mockUseAuthorized = vi.fn(() => ({
    userId: "test-user-id",
    accessToken: "test-access-token",
    userRole: "admin",
    isViewOnly: false,
    token: "test-token",
    userEmail: "test@example.com",
    premiumUser: false,
    disabledPersonalKeyCreation: false,
    showSSOBanner: false,
  }));

  const mockUseOrganizations = vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));

  const mockUseTeams = vi.fn(() => ({
    data: [] as Array<{ members_with_roles: Array<{ user_id: string; role: string }> }>,
    isLoading: false,
    error: null,
  }));

  return { mockUseAuthorized, mockUseOrganizations, mockUseTeams };
});

vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: mockUseAuthorized,
}));

vi.mock("@/app/(dashboard)/hooks/organizations/useOrganizations", () => ({
  useOrganizations: mockUseOrganizations,
}));

vi.mock("@/app/(dashboard)/hooks/teams/useTeams", () => ({
  useTeams: mockUseTeams,
}));

vi.mock("@/app/(dashboard)/hooks/uiConfig/useUIConfig", () => {
  return {
    useUIConfig: () => ({
      data: { admin_ui_disabled: false },
      isLoading: false,
    }),
  };
});

// The redesigned sidebar reads the custom logo from ThemeContext; the test tree
// has no ThemeProvider, so stub the hook.
const unbrandedTheme = () => ({
  logoUrl: null as string | null,
  logoUrlDark: null as string | null,
  faviconUrl: null as string | null,
  setLogoUrl: vi.fn(),
  setLogoUrlDark: vi.fn(),
  setFaviconUrl: vi.fn(),
});
let mockUseThemeImpl = unbrandedTheme;
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => mockUseThemeImpl(),
}));

// Version tag + logout target come from network hooks; keep them inert in unit tests.
vi.mock("@/app/(dashboard)/hooks/healthReadiness/useHealthReadinessDetails", () => ({
  useHealthReadinessDetails: () => ({ data: undefined }),
}));
vi.mock("@/app/(dashboard)/hooks/useLogout", () => ({
  useLogout: () => vi.fn(),
}));

const collectNavKeys = (): string[] =>
  menuGroups.flatMap((group) => group.items.flatMap((item) => [item.key, ...(item.children ?? []).map((c) => c.key)]));

// Every place a page id appears in the nav, as "GROUP" for a top-level item or
// "GROUP > parentKey" for a child.
const placementsOf = (page: string): string[] =>
  menuGroups.flatMap((group) => [
    ...group.items.filter((item) => item.page === page).map(() => group.groupLabel),
    ...group.items.flatMap((item) =>
      (item.children ?? []).filter((child) => child.page === page).map(() => `${group.groupLabel} > ${item.key}`),
    ),
  ]);

const teamAdminAuthorization = {
  userId: "team-admin-user-id",
  accessToken: "test-access-token",
  userRole: "internal",
  isViewOnly: false,
  token: "test-token",
  userEmail: "teamadmin@example.com",
  premiumUser: false,
  disabledPersonalKeyCreation: false,
  showSSOBanner: false,
};

const teamMemberAuthorization = {
  userId: "team-member-user-id",
  accessToken: "test-access-token",
  userRole: "internal",
  isViewOnly: false,
  token: "test-token",
  userEmail: "teamuser@example.com",
  premiumUser: false,
  disabledPersonalKeyCreation: false,
  showSSOBanner: false,
};

describe("Sidebar (leftnav)", () => {
  const defaultProps = {
    collapsed: false,
  };

  afterEach(() => {
    mockUseAuthorized.mockReset();
    mockUseOrganizations.mockReset();
    mockUseTeams.mockReset();
    mockUseTeams.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseThemeImpl = unbrandedTheme;
    navState.pathname = "/ui/api-keys";
  });

  it("should link the logo to the UI home route rather than the proxy origin", () => {
    renderWithProviders(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("link", { name: "算力访问治理平台" })).toHaveAttribute("href", "/ui");
  });

  it("uses the product mark when no custom logo is configured", () => {
    renderWithProviders(<Sidebar {...defaultProps} />);

    const brand = screen.getByRole("link", { name: "算力访问治理平台" });
    expect(brand.querySelector("svg")).not.toBeNull();
    expect(brand.querySelector("img")).toBeNull();
  });

  it("keeps a configured custom logo when collapsed", () => {
    mockUseThemeImpl = () => ({
      ...unbrandedTheme(),
      logoUrl: "https://cdn.example.com/logo.png",
      logoUrlDark: "https://cdn.example.com/logo-dark.png",
    });
    renderWithProviders(<Sidebar collapsed />);

    expect(screen.getByRole("img", { name: "算力访问治理平台" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo-dark.png",
    );
  });

  it("prefers a configured dark logo over the light one", () => {
    mockUseThemeImpl = () => ({
      ...unbrandedTheme(),
      logoUrl: "https://cdn.example.com/logo.png",
      logoUrlDark: "https://cdn.example.com/logo-dark.png",
    });
    renderWithProviders(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("img", { name: "算力访问治理平台" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo-dark.png",
    );
  });

  it("reuses the light custom logo when no dark one is configured", () => {
    mockUseThemeImpl = () => ({ ...unbrandedTheme(), logoUrl: "https://cdn.example.com/logo.png" });
    renderWithProviders(<Sidebar {...defaultProps} />);

    expect(screen.getByRole("img", { name: "算力访问治理平台" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo.png",
    );
  });

  it("falls back to the light logo when a configured dark logo fails to load", () => {
    mockUseThemeImpl = () => ({
      ...unbrandedTheme(),
      logoUrl: "https://cdn.example.com/logo.png",
      logoUrlDark: "https://cdn.example.com/gone.png",
    });
    renderWithProviders(<Sidebar {...defaultProps} />);

    const logo = screen.getByRole("img", { name: "算力访问治理平台" });
    expect(logo).toHaveAttribute("src", "https://cdn.example.com/gone.png");

    fireEvent.error(logo);

    expect(logo).toHaveAttribute("src", "https://cdn.example.com/logo.png");
  });

  it("renders all top-level (non-nested) tabs for admin", () => {
    renderWithProviders(<Sidebar {...defaultProps} />);

    const topLevelLabels = [
      "首页",
      "密钥",
      "调试台",
      "模型与端点",
      "智能体",
      "MCP 服务器",
      "护栏",
      "策略",
      "工具",
      "用量",
      "日志",
      "护栏监控",
      "团队",
      "内部用户",
      "组织",
      "访问组",
      "预算",
      "API 文档",
      "AI 中心",
      "学习资源",
      "实验性功能",
      "设置",
    ];

    topLevelLabels.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it("expands a nested tab to reveal its children (Tools > Search Tools)", async () => {
    renderWithProviders(<Sidebar {...defaultProps} />);

    expect(screen.queryByText("搜索工具")).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByText("工具"));
    });
    await waitFor(() => {
      expect(screen.getByText("搜索工具")).toBeInTheDocument();
    });
  });
  it("reports whether a nested tab is expanded", async () => {
    renderWithProviders(<Sidebar {...defaultProps} />);

    const toggle = screen.getByText("工具").closest("button")!;
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    act(() => {
      fireEvent.click(toggle);
    });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("keeps Router Settings as a single Settings child", () => {
    // Router Settings is admin-only, so getAvailablePages() filters it out entirely and the
    // page_utils duplicate-key guard cannot see it. Walk menuGroups directly, otherwise a
    // stray duplicate placement ships silently.
    expect(placementsOf("router-settings")).toEqual(["设置 > settings"]);
  });

  it("has no duplicate keys among all menu items and their children", () => {
    // React keys must be unique across the whole nav config, otherwise the
    // active-item highlight and group expansion collide.
    const keys = collectNavKeys();
    const duplicates = keys.filter((key, i) => keys.indexOf(key) !== i);
    expect(duplicates).toEqual([]);
  });

  describe("Admin Viewer parity", () => {
    // Admin Viewer follows a "read parity with Proxy Admin, no writes, no
    // cost-incurring actions" rule. The session hook presents the viewer as
    // an admin (`userRole: "admin"`) with `isViewOnly: true`; Playground
    // stays hidden (incurs LLM cost) via the isViewOnly flag, while every
    // admin page (Models + Endpoints, Agents, Logs, ...) is visible read-only.
    const adminViewerAuth = {
      userId: "admin-viewer-user-id",
      accessToken: "test-access-token",
      userRole: "admin",
      isViewOnly: true,
      token: "test-token",
      userEmail: "viewer@example.com",
      premiumUser: false,
      disabledPersonalKeyCreation: false,
      showSSOBanner: false,
    };

    it("hides Playground from Admin Viewer (cost-incurring action)", () => {
      mockUseAuthorized.mockReturnValue(adminViewerAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);
      expect(screen.queryByText("调试台")).not.toBeInTheDocument();
    });

    it("shows Models + Endpoints to Admin Viewer (read-only)", () => {
      mockUseAuthorized.mockReturnValue(adminViewerAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);
      expect(screen.getByText("模型与端点")).toBeInTheDocument();
    });

    it("shows Agents (under Agentic) to Admin Viewer (read-only)", async () => {
      mockUseAuthorized.mockReturnValue(adminViewerAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);
      // Agents is now nested under the "Agentic" submenu — expand parent
      // first to render the children, then assert Agents is visible.
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "智能体" }));
      });
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "智能体" })).toBeInTheDocument();
      });
    });

    it("shows Logs to Admin Viewer", () => {
      mockUseAuthorized.mockReturnValue(adminViewerAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);
      expect(screen.getByText("日志")).toBeInTheDocument();
    });
  });

  describe("capability-gated Tools children", () => {
    const internalAuth = {
      userId: "internal-user-id",
      accessToken: "test-access-token",
      userRole: "internal",
      isViewOnly: false,
      token: "test-token",
      userEmail: "internal@example.com",
      premiumUser: false,
      disabledPersonalKeyCreation: false,
      showSSOBanner: false,
    };

    afterEach(() => {
      mockUseAuthorized.mockReset();
    });

    it("should hide Tool Policies from internal users while keeping other Tools children", async () => {
      mockUseAuthorized.mockReturnValue(internalAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByText("工具"));
      });
      await waitFor(() => {
        expect(screen.getByText("搜索工具")).toBeInTheDocument();
      });
      expect(screen.queryByText("工具策略")).not.toBeInTheDocument();
    });

    it("should show Tool Policies to admins", async () => {
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByText("工具"));
      });
      await waitFor(() => {
        expect(screen.getByText("工具策略")).toBeInTheDocument();
      });
    });

    it("should hide the Policies entry from internal users while keeping Guardrails", () => {
      mockUseAuthorized.mockReturnValue(internalAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);

      expect(screen.getByText("护栏")).toBeInTheDocument();
      expect(screen.queryByText("策略")).not.toBeInTheDocument();
    });

    it("should hide the Prompts entry from internal users while keeping other Experimental children", async () => {
      mockUseAuthorized.mockReturnValue(internalAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByText("实验性功能"));
      });
      await waitFor(() => {
        expect(screen.getByText("API 调试台")).toBeInTheDocument();
      });
      expect(screen.queryByText("提示词")).not.toBeInTheDocument();
    });

    it("should hide Old Usage from internal users while keeping other Experimental children", async () => {
      mockUseAuthorized.mockReturnValue(internalAuth);
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByText("实验性功能"));
      });
      await waitFor(() => {
        expect(screen.getByText("API 调试台")).toBeInTheDocument();
      });
      expect(screen.queryByText("旧版用量")).not.toBeInTheDocument();
    });

    it("should show Old Usage to admins", async () => {
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByText("实验性功能"));
      });
      await waitFor(() => {
        expect(screen.getByText("旧版用量")).toBeInTheDocument();
      });
    });
  });

  // Workflow Runs, Memory and Guardrails Monitor render a shell and then 401
  // for every non-proxy-admin role, because their page-load routes sit outside
  // internal_user_routes / self_managed_routes. Cost Optimization does not:
  // its primary call is /user/daily/activity, which every role may make, so
  // the entry stays and only its proxy-wide tabs are gated inside the page.
  describe("capability-gated pages whose data is proxy-admin-only", () => {
    const authFor = (userRole: string) => ({
      userId: "some-user-id",
      accessToken: "test-access-token",
      userRole,
      isViewOnly: false,
      token: "test-token",
      userEmail: "someone@example.com",
      premiumUser: false,
      disabledPersonalKeyCreation: false,
      showSSOBanner: false,
    });

    afterEach(() => {
      mockUseAuthorized.mockReset();
    });

    it("hides Workflow Runs and Memory from an internal user under Agentic", async () => {
      mockUseAuthorized.mockReturnValue(authFor("internal"));
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "智能体" }));
      });
      // Liveness gate: the sibling Agents child stays visible to this role, so
      // the absences below mean the gate fired, not that the group never opened.
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "智能体" })).toBeInTheDocument();
      });
      expect(screen.queryByText("工作流运行")).not.toBeInTheDocument();
      expect(screen.queryByText("记忆")).not.toBeInTheDocument();
    });

    // An org admin's session role is "Org Admin", which no capability list
    // carries, and the proxy denies these routes to org admins too because
    // `_user_is_org_admin` needs an organization_id the page-load GET never sends.
    // Agents is already out of reach for this role, so gating the other two
    // empties the Agentic group entirely and the parent must go with it rather
    // than degrade into a leaf link to the non-route `?page=agentic`.
    it("drops the whole Agentic group for an org admin once its last child is gated", () => {
      mockUseAuthorized.mockReturnValue(authFor("org_admin"));
      renderWithProviders(<Sidebar {...defaultProps} />);

      // Liveness gate: Logs carries no role list, so it proves the sidebar rendered.
      expect(screen.getByText("日志")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "智能体" })).not.toBeInTheDocument();
      expect(screen.queryByText("Workflow Runs")).not.toBeInTheDocument();
      expect(screen.queryByText("Memory")).not.toBeInTheDocument();
    });

    it("keeps the Agentic group for an internal user, who can still see Agents", () => {
      mockUseAuthorized.mockReturnValue(authFor("internal"));
      renderWithProviders(<Sidebar {...defaultProps} />);

      expect(screen.getByRole("button", { name: "智能体" })).toBeInTheDocument();
    });

    it("shows Workflow Runs and Memory to admins", async () => {
      renderWithProviders(<Sidebar {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "智能体" }));
      });
      await waitFor(() => {
        expect(screen.getByText("工作流运行")).toBeInTheDocument();
      });
      expect(screen.getByText("记忆")).toBeInTheDocument();
    });

    it("hides Guardrails Monitor from an internal user while keeping Usage and Cost Optimization", () => {
      mockUseAuthorized.mockReturnValue(authFor("internal"));
      renderWithProviders(<Sidebar {...defaultProps} />);

      expect(screen.queryByText("护栏监控")).not.toBeInTheDocument();
      expect(screen.getByText("用量")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Lens Beta" })).toHaveAttribute("href", "/ui/lens");
      expect(screen.getByText("成本优化")).toBeInTheDocument();
    });

    it("shows Guardrails Monitor to admins", () => {
      renderWithProviders(<Sidebar {...defaultProps} />);

      expect(screen.getByText("护栏监控")).toBeInTheDocument();
    });
  });

  it("should show Organizations tab for organization admins", () => {
    mockUseAuthorized.mockReturnValue({
      userId: "org-admin-user-id",
      accessToken: "test-access-token",
      userRole: "viewer",
      isViewOnly: false,
      token: "test-token",
      userEmail: "orgadmin@example.com",
      premiumUser: false,
      disabledPersonalKeyCreation: false,
      showSSOBanner: false,
    });

    mockUseOrganizations.mockReturnValue({
      data: [
        {
          organization_id: "org-1",
          organization_name: "Test Organization",
          spend: 0,
          max_budget: null,
          models: [],
          tpm_limit: null,
          rpm_limit: null,
          members: [
            {
              user_id: "org-admin-user-id",
              user_role: "org_admin",
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<Sidebar {...defaultProps} />);

    expect(screen.getByText("组织")).toBeInTheDocument();
  });

  it("shows Projects to an internal user who administers a team", () => {
    mockUseAuthorized.mockReturnValue(teamAdminAuthorization);
    mockUseTeams.mockReturnValue({
      data: [
        {
          members_with_roles: [{ user_id: "team-admin-user-id", role: "admin" }],
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI />);

    expect(screen.getByRole("link", { name: /项目/ })).toBeInTheDocument();
  });

  it("hides Projects when the feature flag is disabled for a team admin", () => {
    mockUseAuthorized.mockReturnValue(teamAdminAuthorization);
    mockUseTeams.mockReturnValue({
      data: [
        {
          members_with_roles: [{ user_id: "team-admin-user-id", role: "admin" }],
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI={false} />);

    expect(screen.queryByRole("link", { name: /Projects/ })).not.toBeInTheDocument();
  });

  it("hides Projects from an internal user who is not a team admin", () => {
    mockUseAuthorized.mockReturnValue(teamMemberAuthorization);

    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI />);

    expect(screen.queryByRole("link", { name: /Projects/ })).not.toBeInTheDocument();
  });

  it.each([
    { allowlist: ["teams"], visible: false },
    { allowlist: ["teams", "projects"], visible: true },
  ])("applies the internal-user page allowlist $allowlist to Projects for team admins", ({ allowlist, visible }) => {
    mockUseAuthorized.mockReturnValue(teamAdminAuthorization);
    mockUseTeams.mockReturnValue({
      data: [
        {
          members_with_roles: [{ user_id: "team-admin-user-id", role: "admin" }],
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI enabledPagesInternalUsers={allowlist} />);

    expect(screen.queryByRole("link", { name: /项目/ }) !== null).toBe(visible);
  });

  it("shows Projects to a user whose global role is org admin", () => {
    mockUseAuthorized.mockReturnValue({ ...teamMemberAuthorization, userRole: "Org Admin" });

    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI />);

    expect(screen.getByRole("link", { name: /项目/ })).toHaveAttribute("href", "/ui/projects");
  });

  it("marks the nav item for the current route active", () => {
    navState.pathname = "/ui/logs";
    renderWithProviders(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("link", { name: "日志" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "密钥" })).not.toHaveAttribute("data-active");
  });

  it("marks Home active at the dashboard root", () => {
    navState.pathname = "/ui/";
    renderWithProviders(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("data-active", "true");
  });

  it("expands the parent group of the current nested route and marks the child active", () => {
    navState.pathname = "/ui/search-tools";
    renderWithProviders(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("link", { name: "搜索工具" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "工具" })).toHaveAttribute("aria-expanded", "true");
  });

  it("links every leaf to its path route, including the ids that differ from their route", () => {
    renderWithProviders(<Sidebar {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByText("实验性功能"));
    });

    const expectHref = (label: string, href: string) =>
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    expectHref("密钥", "/ui/api-keys");
    expectHref("调试台", "/ui/playground");
    expectHref("模型与端点", "/ui/models-and-endpoints");
    expectHref("用量", "/ui/usage");
    expectHref("API 文档", "/ui/api-reference");
    expectHref("旧版用量", "/ui/old-usage");
  });

  it("never links a leaf to the legacy ?page= switch", () => {
    renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI />);
    for (const group of ["智能体", "工具", "实验性功能", "设置"]) {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: group }));
      });
    }
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.filter((href) => href.includes("page="))).toHaveLength(0);
    expect(hrefs.filter((href) => href.startsWith("/ui/")).length).toBeGreaterThan(30);
  });

  it("hides labels but keeps items reachable (icon + link) when collapsed to the rail", () => {
    const { container } = renderWithProviders(<Sidebar {...defaultProps} collapsed />);
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-collapsed", "true");
    // The item stays navigable in the icon-only rail: its link still renders with
    // an icon (asserting the <a> + svg, not the text, so a removed icon would
    // fail here), while the label is present but CSS-hidden.
    const label = screen.getByText("密钥");
    const link = label.closest("a");
    expect(link).not.toBeNull();
    expect(link!.querySelector("svg")).not.toBeNull();
    expect(label).toHaveClass("group-data-[collapsed=true]/sidebar:hidden");
  });

  it("shows Cost Optimization without a Beta badge and no feature-flag gate", () => {
    const { container } = renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI={false} />);

    const costOptimization = container.querySelector('a[href*="cost-optimization"]');
    expect(costOptimization).not.toBeNull();
    expect(costOptimization!).toHaveTextContent("成本优化");
    expect(costOptimization!).not.toHaveTextContent("Beta");

    expect(container.querySelector('a[href*="projects"]')).toBeNull();
  });

  it("keeps a readable collapsed-rail tooltip for items whose label carries a badge", () => {
    const { container } = renderWithProviders(<Sidebar {...defaultProps} enableProjectsUI collapsed />);

    expect(container.querySelector('a[href*="cost-optimization"]')).toHaveAttribute("title", "成本优化");
    expect(container.querySelector('a[href*="projects"]')).toHaveAttribute("title", "项目");
  });
});

describe("getBreadcrumb", () => {
  it("resolves a top-level route to its section + title", () => {
    expect(getBreadcrumb("/ui/api-keys")).toEqual({ section: "算力访问", title: "密钥" });
    expect(getBreadcrumb("/ui/logs")).toEqual({ section: "可观测性", title: "日志" });
  });

  it("resolves routes whose segment differs from the sidebar page id", () => {
    expect(getBreadcrumb("/ui/models-and-endpoints")).toEqual({ section: "算力访问", title: "模型与端点" });
    expect(getBreadcrumb("/ui/usage")).toEqual({ section: "可观测性", title: "用量" });
    expect(getBreadcrumb("/ui/old-usage")).toEqual({ section: "开发者工具", title: "旧版用量" });
  });

  it("titles the dashboard root as Home", () => {
    expect(getBreadcrumb("/ui/")).toEqual({ section: "算力访问", title: "首页" });
  });

  it("resolves a nested child route to its parent section", () => {
    expect(getBreadcrumb("/ui/search-tools/")).toEqual({ section: "算力访问", title: "搜索工具" });
  });

  it("resolves router-settings under the Settings section", () => {
    expect(getBreadcrumb("/ui/router-settings")).toEqual({ section: "设置", title: "路由设置" });
  });

  it("falls back to a prettified title with no section for unknown routes", () => {
    expect(getBreadcrumb("/ui/some-unknown-page")).toEqual({ section: null, title: "Some Unknown Page" });
  });
});
