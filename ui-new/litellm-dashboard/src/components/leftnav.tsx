import { canViewProjectsPage, projectReaderRoles } from "@/app/(dashboard)/hooks/projects/projectAccess";
import { useHideSidebarResourceLinks } from "@/app/(dashboard)/hooks/useUiChromeHideFlags";
import { useTeams } from "@/app/(dashboard)/hooks/teams/useTeams";
import SidebarBrand from "@/components/SidebarBrand";
import SidebarResourceLinks from "@/components/SidebarResourceLinks";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useIsOrgAdmin from "@/app/(dashboard)/hooks/useIsOrgAdmin";
import { useHealthReadinessDetails } from "@/app/(dashboard)/hooks/healthReadiness/useHealthReadinessDetails";
import { useLogout } from "@/app/(dashboard)/hooks/useLogout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSeparator,
  sidebarMenuButtonVariants,
} from "@/components/shared/Sidebar";
import {
  Activity,
  Aperture,
  BarChart3,
  Bell,
  Blocks,
  Bot,
  BookOpen,
  Building2,
  Boxes,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  Folder,
  HeartPulse,
  House,
  KeyRound,
  LayoutGrid,
  Network,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  PlayCircle,
  Route,
  ScrollText,
  Search,
  Server,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Tags,
  Terminal,
  Trophy,
  User,
  Users,
  Wallet,
  Wrench,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cva.config";
import { rolesWithCapability } from "../utils/capabilities";
import {
  all_admin_roles,
  internalUserRoles,
  isAdminRole,
  isUserTeamAdminForAnyTeam,
  rolesAllowedToViewWriteScopedPages,
  rolesWithWriteAccess,
  proxyAdminTierRoles,
} from "../utils/roles";
import BetaBadge from "./BetaBadge";
import SidebarAccountMenu from "./SidebarAccountMenu/SidebarAccountMenu";
import SidebarUsageCard from "./SidebarUsageCard";
import { routeSegmentForPathname, uiHref } from "@/utils/uiHref";

const ICON = { strokeWidth: 1.75 } as const;

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  enabledPagesInternalUsers?: string[] | null;
  enableProjectsUI?: boolean;
  disableAgentsForInternalUsers?: boolean;
  allowAgentsForTeamAdmins?: boolean;
  disableVectorStoresForInternalUsers?: boolean;
  allowVectorStoresForTeamAdmins?: boolean;
}

export interface MenuItem {
  key: string;
  page: string;
  route?: string;
  label: string | React.ReactNode;
  roles?: string[];
  children?: MenuItem[];
  icon?: React.ReactNode;
  external_url?: string;
}

export interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
  roles?: string[];
}

export interface MenuVisibilityContext {
  userRole: string;
  isViewOnly: boolean;
  isOrgAdmin: boolean;
  isTeamAdmin: boolean;
  enabledPagesInternalUsers?: string[] | null;
  enableProjectsUI?: boolean;
  disableAgentsForInternalUsers?: boolean;
  allowAgentsForTeamAdmins?: boolean;
  disableVectorStoresForInternalUsers?: boolean;
  allowVectorStoresForTeamAdmins?: boolean;
}

const adminPageVisibility = (item: MenuItem, context: MenuVisibilityContext, isAdmin: boolean): boolean | null => {
  if (item.key !== "organizations" && item.key !== "users") return null;
  const hasRoleAccess = !item.roles || item.roles.includes(context.userRole) || context.isOrgAdmin;
  if (!hasRoleAccess) return false;
  if (!isAdmin && context.enabledPagesInternalUsers != null) {
    return context.enabledPagesInternalUsers.includes(item.page);
  }
  return true;
};

const projectPageIsVisible = (item: MenuItem, context: MenuVisibilityContext): boolean => {
  if (item.key !== "projects") return true;
  if (!context.enableProjectsUI) return false;
  return canViewProjectsPage({
    userRole: context.userRole,
    isOrgAdmin: context.isOrgAdmin,
    isTeamAdmin: context.isTeamAdmin,
  });
};

const pageIsDisabledForInternalUsers = (
  item: MenuItem,
  pageKey: "agents" | "vector-stores",
  isAdmin: boolean,
  context: MenuVisibilityContext,
): boolean => {
  const isDisabled =
    pageKey === "agents" ? context.disableAgentsForInternalUsers : context.disableVectorStoresForInternalUsers;
  const allowedForTeamAdmins =
    pageKey === "agents" ? context.allowAgentsForTeamAdmins : context.allowVectorStoresForTeamAdmins;
  if (item.key !== pageKey || isAdmin || !isDisabled) return false;
  return !(allowedForTeamAdmins && context.isTeamAdmin);
};

const pageIsEnabledForInternalUser = (item: MenuItem, context: MenuVisibilityContext): boolean => {
  const enabledPages = context.enabledPagesInternalUsers;
  if (enabledPages == null) return true;
  if (item.children?.some((child) => enabledPages.includes(child.page))) return true;
  return enabledPages.includes(item.page);
};

const menuItemIsVisible = (item: MenuItem, context: MenuVisibilityContext, isAdmin: boolean): boolean => {
  if (item.children && item.children.length === 0) return false;
  if (item.key === "llm-playground" && context.isViewOnly) return false;
  const adminVisibility = adminPageVisibility(item, context, isAdmin);
  if (adminVisibility !== null) return adminVisibility;
  if (!projectPageIsVisible(item, context)) return false;
  if (pageIsDisabledForInternalUsers(item, "agents", isAdmin, context)) return false;
  if (pageIsDisabledForInternalUsers(item, "vector-stores", isAdmin, context)) return false;
  if (item.roles && !item.roles.includes(context.userRole)) return false;
  if (!isAdmin && context.enabledPagesInternalUsers != null) return pageIsEnabledForInternalUser(item, context);
  return true;
};

export const visibleMenuGroups = (groups: readonly MenuGroup[], context: MenuVisibilityContext): MenuGroup[] => {
  const isAdmin = isAdminRole(context.userRole);
  const filterItems = (items: MenuItem[]): MenuItem[] =>
    items
      .map((item) => ({ ...item, children: item.children ? filterItems(item.children) : undefined }))
      .filter((item) => menuItemIsVisible(item, context, isAdmin));

  return groups
    .filter((group) => !group.roles || group.roles.includes(context.userRole))
    .map((group) => ({ groupLabel: group.groupLabel, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
};

// Menu groups organized by category - defined outside component for export.
// Shape (key/page/label/roles/children) is consumed by page_utils.ts; only the
// icons changed to lucide as part of the sidebar redesign.
const menuGroups: MenuGroup[] = [
  {
    groupLabel: "算力访问",
    items: [
      { key: "home", page: "home", label: "首页", icon: <House {...ICON} /> },
      { key: "api-keys", page: "api-keys", label: "密钥", icon: <KeyRound {...ICON} /> },
      {
        key: "llm-playground",
        page: "llm-playground",
        route: "playground",
        label: "调试台",
        icon: <PlayCircle {...ICON} />,
        roles: rolesWithWriteAccess,
      },
      {
        key: "models",
        page: "models",
        route: "models-and-endpoints",
        label: "模型与端点",
        icon: <Network {...ICON} />,
        roles: rolesAllowedToViewWriteScopedPages,
      },
      {
        key: "agentic",
        page: "agentic",
        label: "智能体",
        icon: <Bot {...ICON} />,
        children: [
          {
            key: "agents",
            page: "agents",
            label: "智能体",
            icon: <Bot {...ICON} />,
            roles: rolesAllowedToViewWriteScopedPages,
          },
          {
            key: "workflows",
            page: "workflows",
            label: "工作流运行",
            icon: <Workflow {...ICON} />,
            roles: rolesWithCapability("viewWorkflowRuns"),
          },
          {
            key: "memory",
            page: "memory",
            label: "记忆",
            icon: <Database {...ICON} />,
            roles: rolesWithCapability("viewMemory"),
          },
        ],
      },
      { key: "mcp-servers", page: "mcp-servers", label: "MCP 服务器", icon: <Server {...ICON} /> },
      { key: "skills", page: "skills", label: "技能", icon: <Blocks {...ICON} />, roles: all_admin_roles },
      { key: "guardrails", page: "guardrails", label: "护栏", icon: <Shield {...ICON} /> },
      {
        key: "policies",
        page: "policies",
        label: "策略",
        icon: <ScrollText {...ICON} />,
        roles: rolesWithCapability("viewPolicies"),
      },
      {
        key: "tools",
        page: "tools",
        label: "工具",
        icon: <Wrench {...ICON} />,
        children: [
          { key: "search-tools", page: "search-tools", label: "搜索工具", icon: <Search {...ICON} /> },
          { key: "vector-stores", page: "vector-stores", label: "向量库", icon: <Database {...ICON} /> },
          {
            key: "tool-policies",
            page: "tool-policies",
            label: "工具策略",
            icon: <ShieldCheck {...ICON} />,
            roles: rolesWithCapability("viewToolPolicies"),
          },
        ],
      },
    ],
  },
  {
    groupLabel: "可观测性",
    items: [
      {
        key: "new_usage",
        page: "new_usage",
        route: "usage",
        icon: <BarChart3 {...ICON} />,
        roles: [...all_admin_roles, ...internalUserRoles],
        label: "用量",
      },
      {
        key: "alerts",
        page: "alerts",
        label: "告警",
        icon: <Bell {...ICON} />,
        roles: rolesWithCapability("viewGlobalSpend"),
      },
      {
        key: "model-insights",
        page: "model-insights",
        icon: <Trophy {...ICON} />,
        roles: all_admin_roles,
        label: (
          <span className="flex items-center gap-2">
            模型排行榜 <BetaBadge />
          </span>
        ),
      },
      {
        key: "cost-optimization",
        page: "cost-optimization",
        icon: <PiggyBank {...ICON} />,
        roles: [...all_admin_roles, ...internalUserRoles],
        label: "成本优化",
      },
      { key: "logs", page: "logs", label: "日志", icon: <Activity {...ICON} /> },
      {
        key: "lens",
        page: "lens",
        label: (
          <span className="flex items-center gap-2">
            Lens <BetaBadge />
          </span>
        ),
        icon: <Aperture {...ICON} />,
      },
      {
        key: "guardrails-monitor",
        page: "guardrails-monitor",
        label: "护栏监控",
        icon: <HeartPulse {...ICON} />,
        roles: rolesWithCapability("viewGuardrailUsage"),
      },
    ],
  },
  {
    groupLabel: "访问控制",
    items: [
      { key: "teams", page: "teams", label: "团队", icon: <Users {...ICON} /> },
      {
        key: "projects",
        page: "projects",
        label: (
          <span className="flex items-center gap-2">
            项目 <BetaBadge />
          </span>
        ),
        icon: <Folder {...ICON} />,
        roles: [...projectReaderRoles],
      },
      { key: "users", page: "users", label: "内部用户", icon: <User {...ICON} />, roles: all_admin_roles },
      {
        key: "organizations",
        page: "organizations",
        label: "组织",
        icon: <Building2 {...ICON} />,
        roles: all_admin_roles,
      },
      {
        key: "access-groups",
        page: "access-groups",
        label: "访问组",
        icon: <Boxes {...ICON} />,
        roles: all_admin_roles,
      },
      { key: "budgets", page: "budgets", label: "预算", icon: <Wallet {...ICON} />, roles: all_admin_roles },
    ],
  },
  {
    groupLabel: "开发者工具",
    items: [
      { key: "api_ref", page: "api_ref", route: "api-reference", label: "API 文档", icon: <Code2 {...ICON} /> },
      { key: "model-hub-table", page: "model-hub-table", label: "AI 中心", icon: <LayoutGrid {...ICON} /> },
      {
        key: "learning-resources",
        page: "learning-resources",
        label: "学习资源",
        icon: <BookOpen {...ICON} />,
        external_url: "https://models.litellm.ai/cookbook",
      },
      {
        key: "caching",
        page: "caching",
        label: "响应缓存",
        icon: <Database {...ICON} />,
        roles: all_admin_roles,
      },
      {
        key: "experimental",
        page: "experimental",
        label: "实验性功能",
        icon: <FlaskConical {...ICON} />,
        children: [
          {
            key: "prompts",
            page: "prompts",
            label: "提示词",
            icon: <FileText {...ICON} />,
            roles: rolesWithCapability("viewPrompts"),
          },
          {
            key: "transform-request",
            page: "transform-request",
            label: "API 调试台",
            icon: <Terminal {...ICON} />,
            roles: [...all_admin_roles, ...internalUserRoles],
          },
          {
            key: "tag-management",
            page: "tag-management",
            label: "标签管理",
            icon: <Tags {...ICON} />,
            roles: all_admin_roles,
          },
          {
            key: "4",
            page: "usage",
            route: "old-usage",
            label: "旧版用量",
            icon: <BarChart3 {...ICON} />,
            roles: rolesWithCapability("viewGlobalSpend"),
          },
        ],
      },
    ],
  },
  {
    groupLabel: "设置",
    roles: all_admin_roles,
    items: [
      {
        key: "settings",
        page: "settings",
        label: "设置",
        icon: <SettingsIcon {...ICON} />,
        roles: all_admin_roles,
        children: [
          {
            key: "router-settings",
            page: "router-settings",
            label: "路由设置",
            icon: <Route {...ICON} />,
            roles: all_admin_roles,
          },
          {
            key: "logging-and-alerts",
            page: "logging-and-alerts",
            label: "日志与告警",
            icon: <Bell {...ICON} />,
            roles: all_admin_roles,
          },
          {
            key: "admin-panel",
            page: "admin-panel",
            label: "管理员设置",
            icon: <SettingsIcon {...ICON} />,
            roles: all_admin_roles,
          },
          {
            key: "cost-tracking",
            page: "cost-tracking",
            label: "成本追踪",
            icon: <BarChart3 {...ICON} />,
            roles: all_admin_roles,
          },
          { key: "ui-theme", page: "ui-theme", label: "UI 主题", icon: <Palette {...ICON} />, roles: all_admin_roles },
          {
            key: "telemetry",
            page: "telemetry",
            label: "遥测",
            icon: <Activity {...ICON} />,
            roles: proxyAdminTierRoles,
          },
        ],
      },
    ],
  },
];

const HOME_ROUTE = "home";

export const routeOf = (item: MenuItem): string => item.route ?? item.page;

const routeForPathname = (pathname: string): string => routeSegmentForPathname(pathname) || HOME_ROUTE;

const findParentKey = (route: string): string | null => {
  for (const group of menuGroups) {
    for (const item of group.items) {
      if (item.children?.some((c) => routeOf(c) === route)) return item.key;
    }
  }
  return null;
};

const findMenuItemKey = (route: string): string => {
  for (const group of menuGroups) {
    for (const item of group.items) {
      if (routeOf(item) === route) return item.key;
      const child = item.children?.find((c) => routeOf(c) === route);
      if (child) return child.key;
    }
  }
  return HOME_ROUTE;
};

const SECTION_DISPLAY: Record<string, string> = {
  "AI GATEWAY": "算力访问",
  算力访问: "算力访问",
  OBSERVABILITY: "可观测性",
  可观测性: "可观测性",
  "ACCESS CONTROL": "访问控制",
  访问控制: "访问控制",
  "DEVELOPER TOOLS": "开发者工具",
  开发者工具: "开发者工具",
  SETTINGS: "设置",
  设置: "设置",
};

export const sectionText = (groupLabel: string): string => SECTION_DISPLAY[groupLabel] ?? groupLabel;

const prettify = (key: string): string =>
  key
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const labelText = (item: MenuItem): string => {
  if (typeof item.label === "string") return item.label;
  const text = textOf(item.label)
    .replace(/\bBeta\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || prettify(item.key);
};

const textOf = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { children?: React.ReactNode };
    return textOf(props.children);
  }
  return "";
};

// Breadcrumb ("Section" / "Page") for the top bar, derived from the same nav config.
export const getBreadcrumb = (pathname: string): { section: string | null; title: string } => {
  const route = routeForPathname(pathname);
  if (route === "aria") return { section: null, title: "Aria 智能体" };
  for (const group of menuGroups) {
    for (const item of group.items) {
      const section = sectionText(group.groupLabel);
      if (routeOf(item) === route) return { section, title: labelText(item) };
      const child = item.children?.find((c) => routeOf(c) === route);
      if (child) return { section, title: labelText(child) };
    }
  }
  return { section: null, title: prettify(route) };
};

const Sidebar_: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapsed,
  enabledPagesInternalUsers,
  enableProjectsUI,
  disableAgentsForInternalUsers,
  allowAgentsForTeamAdmins,
  disableVectorStoresForInternalUsers,
  allowVectorStoresForTeamAdmins,
}) => {
  const { userId, accessToken, userRole, isViewOnly } = useAuthorized();
  const hideSidebarResourceLinks = useHideSidebarResourceLinks();
  const showSidebarResourceLinks = !hideSidebarResourceLinks;
  const isOrgAdmin = useIsOrgAdmin();
  const { data: teams } = useTeams();
  const { data: healthData } = useHealthReadinessDetails(accessToken);
  const logout = useLogout(accessToken);

  const version = healthData?.litellm_version;
  const currentRoute = routeForPathname(usePathname());
  const selectedKey = findMenuItemKey(currentRoute);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const parent = findParentKey(currentRoute);
    return new Set(parent ? [parent] : []);
  });

  // Keep the active page's parent group expanded as the user navigates, using the
  // "adjust state during render" pattern rather than an effect (avoids a
  // setState-in-effect render cascade).
  const [prevRoute, setPrevRoute] = useState(currentRoute);
  if (currentRoute !== prevRoute) {
    setPrevRoute(currentRoute);
    const parent = findParentKey(currentRoute);
    if (parent && !openGroups.has(parent)) {
      setOpenGroups((prev) => new Set(prev).add(parent));
    }
  }

  const isTeamAdmin = useMemo(() => isUserTeamAdminForAnyTeam(teams ?? null, userId ?? ""), [teams, userId]);

  const visibleGroups = useMemo(() => {
    const context: MenuVisibilityContext = {
      userRole,
      isViewOnly,
      isOrgAdmin,
      isTeamAdmin,
      enabledPagesInternalUsers,
      enableProjectsUI,
      disableAgentsForInternalUsers,
      allowAgentsForTeamAdmins,
      disableVectorStoresForInternalUsers,
      allowVectorStoresForTeamAdmins,
    };
    return visibleMenuGroups(menuGroups, context);
  }, [
    allowAgentsForTeamAdmins,
    allowVectorStoresForTeamAdmins,
    disableAgentsForInternalUsers,
    disableVectorStoresForInternalUsers,
    enableProjectsUI,
    enabledPagesInternalUsers,
    isOrgAdmin,
    isTeamAdmin,
    isViewOnly,
    userRole,
  ]);

  const toggleGroup = (key: string) => {
    if (collapsed) {
      onToggleCollapsed?.();
      setOpenGroups((prev) => new Set(prev).add(key));
      return;
    }
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderLeaf = (item: MenuItem, isChild: boolean) => {
    const active = selectedKey === item.key;
    const size = isChild ? "sub" : "default";
    const label = <span className="flex-1 truncate group-data-[collapsed=true]/sidebar:hidden">{item.label}</span>;

    if (item.external_url) {
      return (
        <a
          key={item.key}
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? labelText(item) : undefined}
          data-active={active || undefined}
          className={cn(sidebarMenuButtonVariants({ isActive: active, size }))}
        >
          {item.icon}
          {label}
          <ExternalLink className="size-3.5 shrink-0 opacity-70 group-data-[collapsed=true]/sidebar:hidden" />
        </a>
      );
    }

    return (
      <Link
        key={item.key}
        href={uiHref(routeOf(item))}
        title={collapsed ? labelText(item) : undefined}
        data-active={active || undefined}
        className={cn(sidebarMenuButtonVariants({ isActive: active, size }))}
      >
        {item.icon}
        {label}
      </Link>
    );
  };

  const renderItem = (item: MenuItem) => {
    const isGroup = !!item.children && item.children.length > 0;
    if (!isGroup) {
      return <SidebarMenuItem key={item.key}>{renderLeaf(item, false)}</SidebarMenuItem>;
    }

    const active = selectedKey === item.key;
    const open = openGroups.has(item.key);
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          isActive={active}
          aria-expanded={open}
          onClick={() => toggleGroup(item.key)}
          title={collapsed ? labelText(item) : undefined}
        >
          {item.icon}
          <span className="flex-1 truncate group-data-[collapsed=true]/sidebar:hidden">{item.label}</span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 transition-transform group-data-[collapsed=true]/sidebar:hidden",
              open && "rotate-90",
            )}
          />
        </SidebarMenuButton>
        {open && (
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuItem key={child.key}>{renderLeaf(child, true)}</SidebarMenuItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsed={collapsed}>
      <SidebarHeader className="h-14 border-b border-sidebar-border group-data-[collapsed=true]/sidebar:h-auto">
        <div className="flex items-center justify-between gap-2 group-data-[collapsed=true]/sidebar:flex-col">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarBrand collapsed={collapsed} />
            {version && (
              <Badge
                variant="outline"
                render={<a href="https://docs.litellm.ai/release_notes" target="_blank" rel="noopener noreferrer" />}
                className="border-sidebar-border/35 px-1.5 py-0 font-mono text-[10px] font-medium text-sidebar-foreground/65 group-data-[collapsed=true]/sidebar:hidden"
              >
                v{version}
              </Badge>
            )}
          </div>
          {onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "收起侧边栏"}
              className="flex-none text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          )}
        </div>
      </SidebarHeader>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 px-3 pb-3">
          {visibleGroups.map((group, gi) => (
            <SidebarGroup key={group.groupLabel}>
              {gi > 0 && <SidebarSeparator className="hidden group-data-[collapsed=true]/sidebar:block" />}
              <SidebarGroupLabel>{group.groupLabel}</SidebarGroupLabel>
              <SidebarMenu>{group.items.map((item) => renderItem(item))}</SidebarMenu>
            </SidebarGroup>
          ))}
        </nav>
      </ScrollArea>

      <SidebarFooter>
        {showSidebarResourceLinks ? <SidebarResourceLinks collapsed={collapsed} /> : null}
        {isAdminRole(userRole) && (
          <SidebarUsageCard
            accessToken={accessToken}
            collapsed={collapsed}
            onExpandRail={() => onToggleCollapsed?.()}
          />
        )}
        <SidebarAccountMenu onLogout={logout} collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default Sidebar_;

export { menuGroups };
