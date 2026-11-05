import { Page, PageTabs, PageTabsList, PageTabsTrigger } from "@/components/shared/Page";
import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import useCan from "@/app/(dashboard)/hooks/useCan";
import AvailableTeamsPanel from "@/components/team/AvailableTeamsPanel";
import TeamInfoView from "@/components/team/TeamInfo";
import TeamSSOSettings from "@/components/TeamSSOSettings";
import { isProxyAdminRole } from "@/utils/roles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input as UIInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { labelWithDocsHint, labelWithHint } from "@/components/shared/form/LabelWithHint";
import { useZodForm } from "@/lib/forms/useZodForm";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { TabsContent } from "@/components/ui/tabs";
import { ChevronDown, Plus, Users } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, PageHeaderControls, PageHeaderDescription, PageHeaderTitle } from "@/components/shared/PageHeader";
import { ToolbarSeparator } from "@/components/shared/ToolbarSeparator";
import { Button as UIButton } from "@/components/ui/button";
import { teamsTableKeys } from "@/app/(dashboard)/hooks/teams/useTeams";
import { parseAsString, useQueryState } from "nuqs";
import { TeamsTable } from "./TeamsPage/TeamsTable";
import AccessGroupSelector from "./common_components/AccessGroupSelector";
import MetadataKeyValueFields, {
  metadataPairsSchema,
  metadataPairsToObject,
} from "./common_components/MetadataKeyValueFields";
import { useTeamMetadataSchema } from "@/app/(dashboard)/hooks/teams/useTeamMetadataSchema";
import PassThroughRoutesSelector from "./common_components/PassThroughRoutesSelector";
import AgentSelector from "./agent_management/AgentSelector";
import ModelAliasManager from "./common_components/ModelAliasManager";
import PremiumLoggingSettings from "./common_components/PremiumLoggingSettings";
import RouterSettingsAccordion, { RouterSettingsAccordionValue } from "./common_components/RouterSettingsAccordion";
import { fetchAvailableModelsForTeamOrKey } from "./key_team_helpers/fetch_available_models_team_key";
import type { Team } from "./key_team_helpers/key_list";
import MCPServerSelector from "./mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "./mcp_server_management/MCPToolPermissions";
import { toast } from "@/lib/toast";
import { extractProxyErrorMessage } from "@/lib/http/client";
import BudgetDurationDropdown, {
  getBudgetDurationLabel,
  NEVER_RESETS_BUDGET_DURATION,
} from "./common_components/budget_duration_dropdown";
import { Organization, getDefaultTeamSettings, getGuardrailsList, getPoliciesList, teamDeleteCall } from "./networking";
import NumericalInput from "./shared/numerical_input";
import { ModelMaxBudget, ModelMaxBudgetField } from "./key_team_helpers/ModelMaxBudgetEditor";
import VectorStoreSelector from "./vector_store_management/VectorStoreSelector";
import SearchToolSelector from "./search_tools/SearchToolSelector";
import SkillSelector from "./skills/SkillSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TeamProps {
  accessToken: string | null;
  userID: string | null;
  userRole: string | null;
  premiumUser?: boolean;
}

import DeleteResourceModal from "./common_components/DeleteResourceModal";
import { teamCreateCall } from "./networking";
import { normalizeTeamModelSelection } from "./team/teamModelAccess";
import { ModelSelect } from "./ModelSelect/ModelSelect";

const SUPPRESSED_BY_DESCRIPTION = "";

const numericInputSchema = z.union([z.string(), z.number()]).optional();

const teamCreateFieldsSchema = z.object({
  team_alias: z.string().min(1, "请Type 团队名称"),
  organization_id: z.string().nullish(),
  models: z.array(z.string()).optional(),
  max_budget: numericInputSchema,
  budget_duration: z.string().nullish(),
  tpm_limit: numericInputSchema,
  rpm_limit: numericInputSchema,
  tpd_limit: numericInputSchema,
  metadata: metadataPairsSchema.optional(),
  team_id: z.string().optional(),
  team_member_budget: z.number().optional(),
  team_member_key_duration: z.string().optional(),
  team_member_rpm_limit: numericInputSchema,
  team_member_tpm_limit: numericInputSchema,
  secret_manager_settings: z.string().optional(),
  guardrails: z.array(z.string()).optional(),
  disable_global_guardrails: z.boolean().optional(),
  policies: z.array(z.string()).optional(),
  access_group_ids: z.array(z.string()).optional(),
  allowed_vector_store_ids: z.array(z.string()).optional(),
  allowed_passthrough_routes: z.array(z.string()).optional(),
  allowed_mcp_servers_and_groups: z
    .object({
      servers: z.array(z.string()),
      accessGroups: z.array(z.string()),
      toolsets: z.array(z.string()).optional(),
    })
    .optional(),
  mcp_tool_permissions: z.record(z.string(), z.array(z.string())).optional(),
  allowed_agents_and_groups: z.object({ agents: z.array(z.string()), accessGroups: z.array(z.string()) }).optional(),
  object_permission_search_tools: z.array(z.string()).optional(),
  object_permission_skills: z.array(z.string()).optional(),
});

type TeamCreateFormValues = z.infer<typeof teamCreateFieldsSchema>;

const EMPTY_TEAM_CREATE_VALUES: TeamCreateFormValues = {
  team_alias: "",
  organization_id: null,
  models: [],
  max_budget: undefined,
  budget_duration: undefined,
  tpm_limit: undefined,
  rpm_limit: undefined,
  tpd_limit: undefined,
  metadata: [],
  team_id: undefined,
  team_member_budget: undefined,
  team_member_key_duration: undefined,
  team_member_rpm_limit: undefined,
  team_member_tpm_limit: undefined,
  secret_manager_settings: undefined,
  guardrails: undefined,
  disable_global_guardrails: undefined,
  policies: undefined,
  access_group_ids: undefined,
  allowed_vector_store_ids: undefined,
  allowed_passthrough_routes: undefined,
  allowed_mcp_servers_and_groups: undefined,
  mcp_tool_permissions: {},
  allowed_agents_and_groups: undefined,
  object_permission_search_tools: undefined,
  object_permission_skills: undefined,
};

const ADDITIONAL_SETTINGS_FIELDS = [
  "team_id",
  "team_member_budget",
  "team_member_key_duration",
  "team_member_rpm_limit",
  "team_member_tpm_limit",
  "secret_manager_settings",
  "guardrails",
  "disable_global_guardrails",
  "policies",
  "access_group_ids",
  "allowed_vector_store_ids",
  "allowed_passthrough_routes",
] as const;
const MCP_SETTINGS_FIELDS = ["allowed_mcp_servers_and_groups", "mcp_tool_permissions"] as const;
const AGENT_SETTINGS_FIELDS = ["allowed_agents_and_groups"] as const;
const SEARCH_TOOL_SETTINGS_FIELDS = ["object_permission_search_tools"] as const;
const SKILL_SETTINGS_FIELDS = ["object_permission_skills"] as const;

const isParsableJson = (value: string | undefined): boolean => {
  if (!value) {
    return true;
  }
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const canCreateOrManageTeams = (
  userRole: string | null,
  userID: string | null,
  organizations: Organization[] | null,
): boolean => {
  // Admin role always has permission
  if (userRole === "Admin") {
    return true;
  }

  // Check if user is an org_admin in any organization
  if (organizations && userID) {
    return organizations.some((org) =>
      org.members?.some((member) => member.user_id === userID && member.user_role === "org_admin"),
    );
  }

  return false;
};

const getAdminOrganizations = (
  userRole: string | null,
  userID: string | null,
  organizations: Organization[] | null,
): Organization[] => {
  // Global Admin can see all organizations
  if (userRole === "Admin") {
    return organizations || [];
  }

  // Org Admin can only see organizations they're an admin for
  if (organizations && userID) {
    return organizations.filter((org) =>
      org.members?.some((member) => member.user_id === userID && member.user_role === "org_admin"),
    );
  }

  return [];
};

// @deprecated
const Teams: React.FC<TeamProps> = ({ accessToken, userID, userRole, premiumUser = false }) => {
  const { data: organizationsData } = useOrganizations();
  const organizations = organizationsData ?? null;
  const { data: teamMetadataSchemaFields = [], isLoading: isTeamMetadataSchemaLoading } = useTeamMetadataSchema();
  const queryClient = useQueryClient();
  const refreshTeams = () => queryClient.invalidateQueries({ queryKey: teamsTableKeys.all });
  const [currentOrg] = useState<Organization | null>(null);

  const isOrgAdmin = userRole !== "Admin";
  const [additionalSettingsOpen, setAdditionalSettingsOpen] = useState(false);
  const [mcpSettingsOpen, setMcpSettingsOpen] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [searchToolSettingsOpen, setSearchToolSettingsOpen] = useState(false);
  const [skillSettingsOpen, setSkillSettingsOpen] = useState(false);

  const adminOrgs = useMemo(
    () => getAdminOrganizations(userRole, userID, organizations),
    [userRole, userID, organizations],
  );

  const teamCreateSchema = useMemo(
    () =>
      teamCreateFieldsSchema.superRefine((values, ctx) => {
        if (isOrgAdmin && !values.organization_id) {
          ctx.addIssue({ code: "custom", message: SUPPRESSED_BY_DESCRIPTION, path: ["organization_id"] });
        }
        const organizationIsStillPickable =
          values.organization_id == null ||
          organizations == null ||
          adminOrgs.some((org) => org.organization_id === values.organization_id);
        if (!organizationIsStillPickable) {
          ctx.addIssue({
            code: "custom",
            message: "你无法再在此 Organization 中创建 Team",
            path: ["organization_id"],
          });
        }
        if (additionalSettingsOpen && !isParsableJson(values.secret_manager_settings)) {
          ctx.addIssue({ code: "custom", message: SUPPRESSED_BY_DESCRIPTION, path: ["secret_manager_settings"] });
        }
      }),
    [isOrgAdmin, additionalSettingsOpen, adminOrgs, organizations],
  );

  const form = useZodForm(teamCreateSchema, { defaultValues: EMPTY_TEAM_CREATE_VALUES });
  const watchedOrganizationId = form.watch("organization_id");
  const watchedMcpSelection = form.watch("allowed_mcp_servers_and_groups");
  const watchedToolPermissions = form.watch("mcp_tool_permissions");

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useQueryState("team", parseAsString.withOptions({ history: "push" }));
  const [editTeam, setEditTeam] = useState<boolean>(false);

  const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
  const [userModels, setUserModels] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isTeamDeleting, setIsTeamDeleting] = useState(false);
  // Add this state near the other useState declarations
  const [guardrailsList, setGuardrailsList] = useState<string[]>([]);
  const canViewPolicies = useCan("viewPolicies");
  const [policiesList, setPoliciesList] = useState<string[]>([]);
  const [loggingSettings, setLoggingSettings] = useState<any[]>([]);
  const [modelAliases, setModelAliases] = useState<{ [key: string]: string }>({});
  const [modelMaxBudget, setModelMaxBudget] = useState<ModelMaxBudget>({});
  const [routerSettings, setRouterSettings] = useState<RouterSettingsAccordionValue | null>(null);
  const [routerSettingsKey, setRouterSettingsKey] = useState<number>(0);

  const { data: defaultTeamSettings } = useQuery({
    queryKey: ["defaultTeamSettings"],
    queryFn: () => getDefaultTeamSettings(accessToken as string),
    enabled: isTeamModalVisible && accessToken != null,
    retry: false,
    staleTime: 60_000,
  });
  const defaultBudgetDuration: string | undefined = defaultTeamSettings?.values?.budget_duration ?? undefined;
  const budgetDurationPlaceholder = defaultBudgetDuration
    ? `默认：${getBudgetDurationLabel(defaultBudgetDuration)}（${defaultBudgetDuration}）`
    : "n/a";

  // Add this useEffect to fetch guardrails
  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        if (accessToken == null) {
          return;
        }

        const response = await getGuardrailsList(accessToken);
        const guardrailNames = response.guardrails.map((g: { guardrail_name: string }) => g.guardrail_name);
        setGuardrailsList(guardrailNames);
      } catch (error) {
        console.error("Failed to fetch guardrails:", error);
      }
    };

    const fetchPolicies = async () => {
      try {
        if (accessToken == null) {
          return;
        }

        const response = await getPoliciesList(accessToken);
        const policyNames = response.policies.map((p: { policy_name: string }) => p.policy_name);
        setPoliciesList(policyNames);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      }
    };

    fetchGuardrails();
    if (canViewPolicies) fetchPolicies();
  }, [accessToken, canViewPolicies]);

  const openCreateTeamModal = () => {
    // Org admins must scope a team to an org, so with exactly one we preselect it.
    // Proxy admins can create org-less teams, so the field stays optional regardless of org count.
    if (isOrgAdmin && adminOrgs.length === 1) {
      form.setValue("organization_id", adminOrgs[0].organization_id);
    }
    setIsTeamModalVisible(true);
  };

  const selectCreateTeamOrganization = (
    next: string | null,
    currentOrganizationId: string | null,
    onChange: (organizationId: string | null) => void,
  ) => {
    const nextOrganizationId = next;
    if (nextOrganizationId === currentOrganizationId) return;
    onChange(nextOrganizationId);
    form.setValue("models", []);
  };

  const resetCreateForm = () => {
    form.reset(EMPTY_TEAM_CREATE_VALUES);
    setAdditionalSettingsOpen(false);
    setMcpSettingsOpen(false);
    setAgentSettingsOpen(false);
    setSearchToolSettingsOpen(false);
    setLoggingSettings([]);
    setModelAliases({});
    setModelMaxBudget({});
    setRouterSettings(null);
    setRouterSettingsKey((prev) => prev + 1);
  };

  const handleCancel = () => {
    setIsTeamModalVisible(false);
    resetCreateForm();
  };

  const handleDelete = async (team: Team) => {
    // Set the team to delete and open the confirmation modal
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (teamToDelete == null || accessToken == null) {
      return;
    }

    try {
      setIsTeamDeleting(true);
      await teamDeleteCall(accessToken, teamToDelete.team_id);
      await refreshTeams();
      toast.success("团队删除成功");
    } catch (error) {
      toast.fromError("删除团队 时出错：" + error);
    } finally {
      setIsTeamDeleting(false);
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setTeamToDelete(null);
  };

  useEffect(() => {
    const fetchUserModels = async () => {
      try {
        if (userID === null || userRole === null || accessToken === null) {
          return;
        }
        const models = await fetchAvailableModelsForTeamOrKey(userID, userRole, accessToken);
        if (models) {
          setUserModels(models);
        }
      } catch (error) {
        console.error("Error fetching user models:", error);
      }
    };

    fetchUserModels();
  }, [accessToken, userID, userRole]);

  const handleCreate = async (formValues: Record<string, any>) => {
    try {
      if (accessToken != null) {
        let organizationId = formValues?.organization_id || currentOrg?.organization_id;
        if (organizationId === "" || typeof organizationId !== "string") {
          formValues.organization_id = null;
        } else {
          formValues.organization_id = organizationId.trim();
        }

        if (formValues.budget_duration === NEVER_RESETS_BUDGET_DURATION) {
          formValues.budget_duration = null;
        }

        toast.info("正在创建团队");

        const metadataObject = {
          ...metadataPairsToObject(formValues.metadata),
          ...(loggingSettings.length > 0 ? { logging: loggingSettings.filter((config) => config.callback_name) } : {}),
        };
        formValues.metadata = Object.keys(metadataObject).length > 0 ? JSON.stringify(metadataObject) : undefined;

        if (formValues.secret_manager_settings) {
          if (typeof formValues.secret_manager_settings === "string") {
            if (formValues.secret_manager_settings.trim() === "") {
              delete formValues.secret_manager_settings;
            } else {
              try {
                formValues.secret_manager_settings = JSON.parse(formValues.secret_manager_settings);
              } catch (e) {
                throw new Error("解析 Secret Manager 设置失败：" + e);
              }
            }
          }
        }

        const hasSearchTools =
          Array.isArray(formValues.object_permission_search_tools) &&
          formValues.object_permission_search_tools.length > 0;

        if (
          (formValues.allowed_vector_store_ids && formValues.allowed_vector_store_ids.length > 0) ||
          (formValues.allowed_mcp_servers_and_groups &&
            (formValues.allowed_mcp_servers_and_groups.servers?.length > 0 ||
              formValues.allowed_mcp_servers_and_groups.accessGroups?.length > 0 ||
              formValues.allowed_mcp_servers_and_groups.toolsets?.length > 0 ||
              formValues.allowed_mcp_servers_and_groups.toolPermissions))
        ) {
          if (!formValues.object_permission) {
            formValues.object_permission = {};
          }
          if (formValues.allowed_vector_store_ids && formValues.allowed_vector_store_ids.length > 0) {
            formValues.object_permission.vector_stores = formValues.allowed_vector_store_ids;
            delete formValues.allowed_vector_store_ids;
          }
          if (formValues.allowed_mcp_servers_and_groups) {
            const { servers, accessGroups, toolsets } = formValues.allowed_mcp_servers_and_groups;
            if (servers && servers.length > 0) {
              formValues.object_permission.mcp_servers = servers;
            }
            if (accessGroups && accessGroups.length > 0) {
              formValues.object_permission.mcp_access_groups = accessGroups;
            }
            if (toolsets && toolsets.length > 0) {
              formValues.object_permission.mcp_toolsets = toolsets;
            }
            delete formValues.allowed_mcp_servers_and_groups;
          }

          if (formValues.mcp_tool_permissions && Object.keys(formValues.mcp_tool_permissions).length > 0) {
            formValues.object_permission.mcp_tool_permissions = formValues.mcp_tool_permissions;
            delete formValues.mcp_tool_permissions;
          }
        }

        // Transform allowed_mcp_access_groups into object_permission
        if (formValues.allowed_mcp_access_groups && formValues.allowed_mcp_access_groups.length > 0) {
          if (!formValues.object_permission) {
            formValues.object_permission = {};
          }
          formValues.object_permission.mcp_access_groups = formValues.allowed_mcp_access_groups;
          delete formValues.allowed_mcp_access_groups;
        }

        // Handle agent permissions
        if (formValues.allowed_agents_and_groups) {
          const { agents, accessGroups } = formValues.allowed_agents_and_groups;
          if (!formValues.object_permission) {
            formValues.object_permission = {};
          }
          if (agents && agents.length > 0) {
            formValues.object_permission.agents = agents;
          }
          if (accessGroups && accessGroups.length > 0) {
            formValues.object_permission.agent_access_groups = accessGroups;
          }
          delete formValues.allowed_agents_and_groups;
        }

        if (hasSearchTools) {
          if (!formValues.object_permission) {
            formValues.object_permission = {};
          }
          formValues.object_permission.search_tools = formValues.object_permission_search_tools;
          delete formValues.object_permission_search_tools;
        }

        if (Array.isArray(formValues.object_permission_skills) && formValues.object_permission_skills.length > 0) {
          if (!formValues.object_permission) {
            formValues.object_permission = {};
          }
          formValues.object_permission.skills = formValues.object_permission_skills;
        }
        delete formValues.object_permission_skills;

        // Add model_aliases if any are defined
        if (Object.keys(modelAliases).length > 0) {
          formValues.model_aliases = modelAliases;
        }

        if (Object.keys(modelMaxBudget).length > 0) {
          formValues.model_max_budget = modelMaxBudget;
        }

        // Add router_settings if any are defined
        if (routerSettings?.router_settings) {
          // Only include router_settings if it has at least one non-null value
          const hasValues = Object.values(routerSettings.router_settings).some(
            (value) => value !== null && value !== undefined && value !== "",
          );
          if (hasValues) {
            formValues.router_settings = routerSettings.router_settings;
          }
        }

        await teamCreateCall(accessToken, { ...formValues, models: normalizeTeamModelSelection(formValues.models) });
        toast.success("团队已创建");
        await refreshTeams();
        resetCreateForm();
        setIsTeamModalVisible(false);
      }
    } catch (error) {
      console.error("Error creating the team:", error);
      toast.fromError("创建团队时出错：" + extractProxyErrorMessage(error));
    }
  };

  const mountedCreateValues = (values: TeamCreateFormValues): Record<string, unknown> => {
    const unmounted = new Set<string>([
      ...(additionalSettingsOpen ? [] : ADDITIONAL_SETTINGS_FIELDS),
      ...(additionalSettingsOpen && canViewPolicies ? [] : ["policies"]),
      ...(mcpSettingsOpen ? [] : MCP_SETTINGS_FIELDS),
      ...(agentSettingsOpen ? [] : AGENT_SETTINGS_FIELDS),
      ...(searchToolSettingsOpen ? [] : SEARCH_TOOL_SETTINGS_FIELDS),
      ...(skillSettingsOpen ? [] : SKILL_SETTINGS_FIELDS),
    ]);
    return Object.fromEntries(Object.entries(values).filter(([key]) => !unmounted.has(key)));
  };

  const onCreateSubmit = (values: TeamCreateFormValues) => handleCreate(mountedCreateValues(values));

  const is_team_admin = (team: any) => {
    if (team == null || team.members_with_roles == null) {
      return false;
    }
    for (let i = 0; i < team.members_with_roles.length; i++) {
      let member = team.members_with_roles[i];
      if (member.user_id == userID && member.role == "admin") {
        return true;
      }
    }
    return false;
  };

  const tabItems = [
    {
      key: "your-teams",
      label: "我的团队",
      className: "flex min-h-0 flex-1 flex-col",
      children: (
        <>
          <TeamsTable
            userRole={userRole}
            userID={userID}
            onSelectTeam={(team) => {
              setSelectedTeam(team);
              void setSelectedTeamId(team.team_id);
              setEditTeam(false);
            }}
            onEditTeam={(team) => {
              setSelectedTeam(team);
              void setSelectedTeamId(team.team_id);
              setEditTeam(true);
            }}
            onDeleteTeam={handleDelete}
          />

          <DeleteResourceModal
            isOpen={isDeleteModalOpen}
            title="删除团队？"
            alertMessage={(() => {
              const deleteKeyCount = teamToDelete?.keys_count ?? teamToDelete?.keys?.length ?? 0;
              return deleteKeyCount === 0
                ? undefined
                : `警告：此团队关联了 ${deleteKeyCount} 个密钥。删除该 Team 将同时删除所有关联的 Key，以及为此团队创建的所有模型。此操作不可撤销。`;
            })()}
            message="确定要删除此团队、其所有密钥 以及为它创建的所有模型 吗？This action cannot be undone。"
            resourceInformationTitle="团队信息"
            resourceInformation={[
              { label: "团队 ID", value: teamToDelete?.team_id, code: true },
              { label: "团队名称", value: teamToDelete?.team_alias },
              {
                label: "密钥",
                value: teamToDelete?.keys_count ?? teamToDelete?.keys?.length ?? 0,
              },
              { label: "成员", value: teamToDelete?.members_with_roles?.length },
            ]}
            requiredConfirmation={teamToDelete?.team_alias}
            onCancel={cancelDelete}
            onOk={confirmDelete}
            confirmLoading={isTeamDeleting}
          />
        </>
      ),
    },
    {
      key: "available-teams",
      label: "可加入的团队",
      className: "min-h-0 flex-1 overflow-y-auto",
      children: <AvailableTeamsPanel accessToken={accessToken} userID={userID} />,
    },
    ...(isProxyAdminRole(userRole || "")
      ? [
          {
            key: "default-settings",
            label: "默认团队设置",
            className: "min-h-0 flex-1 overflow-y-auto",
            children: <TeamSSOSettings accessToken={accessToken} userID={userID || ""} userRole={userRole || ""} />,
          },
        ]
      : []),
  ];

  return (
    <Page className={selectedTeamId ? undefined : "h-full"}>
      {selectedTeamId ? (
        <TeamInfoView
          teamId={selectedTeamId}
          onUpdate={() => {
            refreshTeams();
          }}
          onClose={() => {
            setSelectedTeam(null);
            void setSelectedTeamId(null);
            setEditTeam(false);
          }}
          accessToken={accessToken}
          is_team_admin={is_team_admin(selectedTeam?.team_id === selectedTeamId ? selectedTeam : null)}
          is_proxy_admin={userRole == "Admin"}
          userModels={userModels}
          editTeam={editTeam}
          premiumUser={premiumUser}
        />
      ) : (
        <PageTabs defaultValue={tabItems[0].key}>
          <PageHeader>
            <PageHeaderTitle>
              <Users />
              团队
            </PageHeaderTitle>
            <PageHeaderDescription>管理团队、成员及其对模型和预算的访问权限</PageHeaderDescription>
            <PageHeaderControls>
              <PageTabsList>
                {canCreateOrManageTeams(userRole, userID, organizations) && (
                  <>
                    <UIButton onClick={openCreateTeamModal} data-testid="create-team-button">
                      <Plus className="size-4" />
                      创建团队
                    </UIButton>
                    <ToolbarSeparator className="mx-0 h-6" />
                  </>
                )}
                {tabItems.map((item) => (
                  <PageTabsTrigger key={item.key} value={item.key}>
                    {item.label}
                  </PageTabsTrigger>
                ))}
              </PageTabsList>
            </PageHeaderControls>
          </PageHeader>
          {tabItems.map((item) => (
            <TabsContent key={item.key} value={item.key} className={item.className}>
              {item.children}
            </TabsContent>
          ))}
        </PageTabs>
      )}

      {canCreateOrManageTeams(userRole, userID, organizations) && (
        <Dialog open={isTeamModalVisible} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[1000px]">
            <DialogHeader>
              <DialogTitle>新建团队</DialogTitle>
            </DialogHeader>
            <TooltipProvider>
              <form onSubmit={form.handleSubmit(onCreateSubmit)}>
                <FieldGroup>
                  <FormField control={form.control} name="team_alias" label="团队名称">
                    {({ ref, value, ...field }) => (
                      <UIInput {...field} ref={ref} value={value ?? ""} data-testid="team-name-input" />
                    )}
                  </FormField>
                  {(() => {
                    const isSingleOrg = adminOrgs.length === 1;
                    const hasNoOrgs = adminOrgs.length === 0;
                    const soleOrganizationId = isSingleOrg ? adminOrgs[0].organization_id ?? null : null;

                    return (
                      <>
                        <FormField
                          control={form.control}
                          name="organization_id"
                          className="mt-8"
                          label={labelWithDocsHint(
                            "组织",
                            "组织可以包含多个团队。进一步了解用户管理层级",
                            "https://docs.litellm.ai/docs/proxy/user_management_heirarchy",
                          )}
                          description={
                            isOrgAdmin && isSingleOrg
                              ? "你只能在此组织中创建团队"
                              : isOrgAdmin
                                ? "required"
                                : undefined
                          }
                        >
                          {({ id, value, onChange }) => (
                            <SearchSelect
                              inputId={id}
                              value={value ?? ""}
                              options={adminOrgs.map((org) => ({
                                value: org.organization_id ?? "",
                                label: org.organization_alias ?? "",
                                sublabel: org.organization_id ?? "",
                              }))}
                              disabled={isOrgAdmin && soleOrganizationId !== null && value === soleOrganizationId}
                              allowClear={!isOrgAdmin}
                              placeholder={
                                hasNoOrgs ? "暂无可用组织" : "搜索或选择组织"
                              }
                              emptyText="暂无可用的组织"
                              onValueChange={(next) => selectCreateTeamOrganization(next, value ?? null, onChange)}
                            />
                          )}
                        </FormField>

                        {isOrgAdmin && !isSingleOrg && adminOrgs.length > 1 && (
                          <div className="mb-8 rounded-md border border-info/20 bg-info/10 p-4">
                            <span className="text-sm text-info">
                              Please select an organization to create a team for. You can only create teams within
                              organizations where you are an admin.
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <FormField
                    control={form.control}
                    name="models"
                    label={labelWithHint(
                      "模型",
                      "这些是所选团队可访问的模型。留空则不直接授予任何模型，例如当团队的模型来自访问组时",
                    )}
                  >
                    {({ id, value, onChange }) => (
                      <ModelSelect
                        id={id}
                        value={value ?? []}
                        onChange={onChange}
                        organizationID={watchedOrganizationId ?? undefined}
                        options={{
                          includeSpecialOptions: true,
                          showAllProxyModelsOverride: !watchedOrganizationId,
                        }}
                        context="team"
                        dataTestId="create-team-models-select"
                      />
                    )}
                  </FormField>

                  <FormField control={form.control} name="max_budget" label="最大预算 (USD)">
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={0.01} precision={2} width={200} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="budget_duration" className="mt-8" label="重置预算">
                    {({ id, value, onChange }) => (
                      <BudgetDurationDropdown
                        id={id}
                        showNeverResets
                        placeholder={budgetDurationPlaceholder}
                        value={value}
                        onChange={(next) => onChange(next ?? undefined)}
                      />
                    )}
                  </FormField>
                  <ModelMaxBudgetField
                    key={`model-max-budget-${routerSettingsKey}`}
                    premiumUser={premiumUser}
                    value={modelMaxBudget}
                    onChange={setModelMaxBudget}
                    availableModels={userModels}
                    hint="限制此团队在单个模型上的消耗，每个模型有独立的重置窗口。团队下的每个密钥共享该上限，除非密钥自己设置了该模型的预算。"
                  />
                  <FormField control={form.control} name="tpm_limit" label="每分钟 Token 数上限 (TPM)">
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} width={400} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="rpm_limit" label="每分钟请求数上限 (RPM)">
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} width={400} />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="tpd_limit"
                    label={labelWithHint(
                      "每日 Token 上限 (TPD)",
                      "批量提交（/v1/batches）的每日 Token 预算。设置后，批量输入文件计入此 24 小时窗口，而非团队的 TPM/RPM 限制。在线请求仍使用 TPM/RPM。",
                    )}
                  >
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} width={400} />
                    )}
                  </FormField>
                  <Field>
                    <FieldLabel>元数据</FieldLabel>
                    <MetadataKeyValueFields
                      control={form.control}
                      getValues={form.getValues}
                      name="metadata"
                      schemaFields={teamMetadataSchemaFields}
                      schemaLoading={isTeamMetadataSchemaLoading}
                    />
                    <FieldDescription>
                      值以文本保存。带类型的值可输入 JSON，例如 3、true 或 {'{"region": "us"}'}。
                    </FieldDescription>
                  </Field>

                  <Collapsible
                    open={additionalSettingsOpen}
                    onOpenChange={setAdditionalSettingsOpen}
                    className="mt-20 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>其他设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FieldGroup>
                        <FormField
                          control={form.control}
                          name="team_id"
                          label="团队 ID"
                          description="要创建的 Team 的 ID。如果不提供，将自动生成。"
                        >
                          {({ ref, value, ...field }) => <UIInput {...field} ref={ref} value={value ?? ""} />}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_budget"
                          label={labelWithHint(
                            "团队成员 预算 (USD)",
                            "这是 Team 中单个用户的 Budget。",
                          )}
                        >
                          {({ ref, value, onChange, ...field }) => (
                            <NumericalInput
                              {...field}
                              ref={ref}
                              value={value ?? ""}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange(event.target.value ? Number(event.target.value) : undefined)
                              }
                              step={0.01}
                              precision={2}
                              width={200}
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_key_duration"
                          label={labelWithHint(
                            "团队成员 Key 时长（例如：1d、1mo）",
                            "限制 团队成员 Key 的有效时长。格式：30s（秒）、30m（分钟）、30h（小时）、30d（天）、1mo（月）",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <UIInput {...field} ref={ref} value={value ?? ""} placeholder="e.g., 30d" />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_rpm_limit"
                          label={labelWithHint(
                            "团队成员 RPM 上限",
                            "单个 团队成员的 RPM（每分钟请求数）上限",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} width={400} />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_tpm_limit"
                          label={labelWithHint(
                            "团队成员 TPM 上限",
                            "单个团队成员的 TPM（每分钟 Token 数）上限",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} width={400} />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="secret_manager_settings"
                          label="Secret Manager 设置"
                          description={
                            premiumUser
                              ? "以 JSON 对象形式Type Secret Manager 配置。"
                              : "Premium 功能 - 升级后可管理 Secret Manager 设置。"
                          }
                        >
                          {({ ref, value, ...field }) => (
                            <Textarea
                              {...field}
                              ref={ref}
                              value={value ?? ""}
                              rows={4}
                              placeholder='{"namespace": "admin", "mount": "secret", "path_prefix": "litellm"}'
                              disabled={!premiumUser}
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="guardrails"
                          className="mt-8"
                          label={labelWithDocsHint(
                            "Guardrails",
                            "创建你的第一个 Guardrail",
                            "https://docs.litellm.ai/docs/proxy/guardrails/quick_start",
                          )}
                          description="选择已有 Guardrails 或输入新的"
                        >
                          {({ id, value, onChange }) => (
                            <TagsInput
                              id={id}
                              value={value ?? []}
                              onValueChange={onChange}
                              options={guardrailsList.map((name) => ({ value: name, label: name }))}
                              placeholder="选择或Type Guardrails"
                            />
                          )}
                        </FormField>
                        {isProxyAdminRole(userRole || "") && (
                          <FormField
                            control={form.control}
                            name="disable_global_guardrails"
                            className="mt-4"
                            label={labelWithHint(
                              "禁用全局 Guardrails",
                              "启用后，此 Team 将绕过配置为对每个请求运行的所有 Guardrails（全局 Guardrails）",
                            )}
                            description={
                              premiumUser
                                ? "为此 Team 绕过全局 Guardrails"
                                : "Premium 功能 - 升级后可按 Team 禁用全局 Guardrails"
                            }
                          >
                            {({ id, value, onChange }) => (
                              <Switch
                                id={id}
                                disabled={!premiumUser}
                                checked={value === true}
                                onCheckedChange={onChange}
                              />
                            )}
                          </FormField>
                        )}
                        {canViewPolicies && (
                          <FormField
                            control={form.control}
                            name="policies"
                            className="mt-8"
                            label={labelWithDocsHint(
                              "Policies",
                              "将 Policies 应用于此 Team，以控制 Guardrails 和其他设置",
                              "https://docs.litellm.ai/docs/proxy/guardrails/guardrail_policies",
                            )}
                            description="选择已有 Policies 或输入新的"
                          >
                            {({ id, value, onChange }) => (
                              <TagsInput
                                id={id}
                                value={value ?? []}
                                onValueChange={onChange}
                                options={policiesList.map((name) => ({ value: name, label: name }))}
                                placeholder="选择或Type Policies"
                              />
                            )}
                          </FormField>
                        )}
                        <FormField
                          control={form.control}
                          name="access_group_ids"
                          className="mt-8"
                          label={labelWithHint(
                            "访问组",
                            "为此 Team 分配 访问组。访问组 控制此 Team 可以使用哪些 Models、MCP Server 和 Agent",
                          )}
                          description="选择要分配给此 Team 的 访问组"
                        >
                          {({ value, onChange }) => (
                            <AccessGroupSelector
                              value={value}
                              onChange={onChange}
                              placeholder="选择 访问组（可选）"
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="allowed_vector_store_ids"
                          className="mt-8"
                          label={labelWithHint(
                            "允许的向量库",
                            "选择此 Team 默认可以访问的向量库。留空则可访问所有向量库",
                          )}
                          description="选择此 Team 可以访问的向量库。留空则可访问所有向量库"
                        >
                          {({ value, onChange }) => (
                            <VectorStoreSelector
                              onChange={onChange}
                              value={value}
                              accessToken={accessToken || ""}
                              placeholder="选择向量库（可选）"
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="allowed_passthrough_routes"
                          className="mt-8"
                          label={
                            !premiumUser
                              ? labelWithHint(
                                  "允许的透传路由",
                                  "Premium 功能 - 升级后可设置允许的透传路由",
                                )
                              : !isProxyAdminRole(userRole || "")
                                ? labelWithHint(
                                    "允许的透传路由",
                                    "只有 Proxy Admin 可以设置允许的透传路由",
                                  )
                                : "允许的透传路由"
                          }
                        >
                          {({ value, onChange }) => (
                            <PassThroughRoutesSelector
                              value={value}
                              onChange={onChange}
                              accessToken={accessToken || ""}
                              placeholder="选择透传路由（可选）"
                              disabled={!premiumUser || !isProxyAdminRole(userRole || "")}
                            />
                          )}
                        </FormField>
                      </FieldGroup>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={mcpSettingsOpen}
                    onOpenChange={setMcpSettingsOpen}
                    className="mt-8 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>MCP 设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FormField
                        control={form.control}
                        name="allowed_mcp_servers_and_groups"
                        className="mt-4"
                        label={labelWithHint(
                          "允许的 MCP Server",
                          "选择此 Team 可以访问的 MCP Server 或 访问组",
                        )}
                        description="选择此 Team 可以访问的 MCP Server 或 访问组"
                      >
                        {({ value, onChange }) => (
                          <MCPServerSelector
                            onChange={onChange}
                            value={value}
                            accessToken={accessToken || ""}
                            placeholder="选择 MCP Server 或 访问组（可选）"
                            allowAllProxyMcpServers={isProxyAdminRole(userRole || "")}
                          />
                        )}
                      </FormField>

                      <div className="mt-6">
                        <MCPToolPermissions
                          accessToken={accessToken || ""}
                          selectedServers={watchedMcpSelection?.servers || []}
                          selectedAccessGroups={watchedMcpSelection?.accessGroups || []}
                          selectedToolsets={watchedMcpSelection?.toolsets || []}
                          toolPermissions={watchedToolPermissions || {}}
                          onChange={(toolPerms) => form.setValue("mcp_tool_permissions", toolPerms)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={agentSettingsOpen}
                    onOpenChange={setAgentSettingsOpen}
                    className="mt-8 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>Agent 设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FormField
                        control={form.control}
                        name="allowed_agents_and_groups"
                        className="mt-4"
                        label={labelWithHint(
                          "允许的 Agent",
                          "选择此 Team 可以访问的 Agent 或 访问组",
                        )}
                        description="选择此 Team 可以访问的 Agent 或 访问组"
                      >
                        {({ value, onChange }) => (
                          <AgentSelector
                            onChange={onChange}
                            value={value}
                            accessToken={accessToken || ""}
                            placeholder="选择 Agent 或 访问组（可选）"
                          />
                        )}
                      </FormField>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={searchToolSettingsOpen}
                    onOpenChange={setSearchToolSettingsOpen}
                    className="mt-8 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>搜索工具设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FormField
                        control={form.control}
                        name="object_permission_search_tools"
                        className="mt-4"
                        label={labelWithHint(
                          "允许的搜索工具",
                          "选择此 Team 可以访问的搜索工具。留空则允许所有搜索工具。",
                        )}
                        description="限制此 Team 下的 Key 可以调用哪些已配置的搜索工具。"
                      >
                        {({ value, onChange }) => (
                          <SearchToolSelector
                            onChange={onChange}
                            value={value}
                            accessToken={accessToken || ""}
                            placeholder="选择搜索工具（可选，留空表示全部允许）"
                          />
                        )}
                      </FormField>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={skillSettingsOpen}
                    onOpenChange={setSkillSettingsOpen}
                    className="mt-8 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>技能设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FormField
                        control={form.control}
                        name="object_permission_skills"
                        className="mt-4"
                        label={labelWithHint(
                          "允许的技能",
                          "已启用的技能对所有 Team 可见。在此将已禁用（私有）的 Claude Code 插件授予此 Team。",
                        )}
                        description="此 Team 下的 Key 在 Claude Code 市场中可见的私有技能。"
                      >
                        {({ value, onChange }) => (
                          <SkillSelector
                            onChange={onChange}
                            value={value}
                            accessToken={accessToken || ""}
                            placeholder="选择技能（可选）"
                          />
                        )}
                      </FormField>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible className="mt-8 mb-8 overflow-hidden rounded-lg border">
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>日志设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <div className="mt-4">
                        <PremiumLoggingSettings
                          value={loggingSettings}
                          onChange={setLoggingSettings}
                          premiumUser={premiumUser}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    key={`router-settings-accordion-${routerSettingsKey}`}
                    className="mt-8 mb-8 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>Router 设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <div className="mt-4 w-full">
                        <RouterSettingsAccordion
                          key={routerSettingsKey}
                          accessToken={accessToken || ""}
                          value={routerSettings || undefined}
                          onChange={setRouterSettings}
                          modelData={
                            userModels.length > 0
                              ? { data: userModels.map((model) => ({ model_name: model })) }
                              : undefined
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible className="mt-8 mb-8 overflow-hidden rounded-lg border">
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>Model 别名</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <div className="mt-4">
                        <p className="mb-4 block text-sm text-muted-foreground">
                          为 Models 创建自定义别名，供 团队成员在 API 调用中使用。这样可以为特定 Model
                          创建快捷方式。
                        </p>
                        <ModelAliasManager
                          accessToken={accessToken || ""}
                          initialModelAliases={modelAliases}
                          onAliasUpdate={setModelAliases}
                          showExampleConfig={false}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </FieldGroup>
                <div className="mt-[10px] text-right">
                  <UIButton type="submit" data-testid="create-team-submit">
                    新建团队
                  </UIButton>
                </div>
              </form>
            </TooltipProvider>
          </DialogContent>
        </Dialog>
      )}
    </Page>
  );
};

export default Teams;
