import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import type { components } from "@/lib/http/schema";
import useCan from "@/app/(dashboard)/hooks/useCan";
import { organizationKeys, useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import { invalidateTeamQueries } from "@/app/(dashboard)/hooks/teams/useTeams";
import { useQueryClient } from "@tanstack/react-query";
import UserSearchModal from "@/components/common_components/user_search_modal";
import {
  getPoliciesList,
  getPolicyInfoWithGuardrails,
  Member,
  Organization,
  organizationInfoCall,
  teamInfoCall,
  teamMemberAddCall,
  teamMemberDeleteCall,
  teamMemberUpdateCall,
  teamUpdateCall,
} from "@/components/networking";
import { useGuardrails, GuardrailListItem } from "@/app/(dashboard)/hooks/guardrails/useGuardrails";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import { numberOrNull } from "@/lib/forms/numberOrNull";
import type { ObjectPermission } from "@/components/object_permission_types";
import { isProxyAdminRole } from "@/utils/roles";
import { ArrowLeftIcon } from "@heroicons/react/outline";
import { StatusBadge, type StatusTone } from "@/components/shared/table_cells/status_badge";
import { BadgeLink } from "@/components/shared/BadgeLink";
import { Badge } from "@/components/ui/badge";
import { modelGroupHref, modelOrAccessGroupHref } from "@/utils/entityLinks";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input as UIInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleTooltip, TooltipProvider } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { labelWithDocsHint, labelWithHint } from "@/components/shared/form/LabelWithHint";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { useZodForm } from "@/lib/forms/useZodForm";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisitedTabs } from "@/hooks/useVisitedTabs";
import { toast } from "@/lib/toast";
import { CheckIcon, ChevronDown, CircleMinus, CopyIcon, Info, Pencil, Plus, Save } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import GuardrailsSelect from "./GuardrailsSelect";
import {
  type CallerEditAccess,
  parseTeamEditAccess,
  TEAM_ADMIN_EDITING_DISABLED_DESCRIPTION,
  TEAM_ADMIN_EDITING_DISABLED_TITLE,
  type TeamAdminSettingsChanges,
} from "./teamAdminEditAccess";
import TeamAdminSettingsForm from "./TeamAdminSettingsForm";
import { copyToClipboard as utilCopyToClipboard } from "../../utils/dataUtils";
import AccessGroupSelector from "../common_components/AccessGroupSelector";
import BudgetDurationDropdown, { NEVER_RESETS_BUDGET_DURATION } from "../common_components/budget_duration_dropdown";
import {
  ModelBudgetUsage,
  ModelMaxBudget,
  ModelMaxBudgetField,
  modelMaxBudgetToEntries,
} from "../key_team_helpers/ModelMaxBudgetEditor";
import { modelMaxBudgetUpdate, StoredModelMaxBudget } from "../key_team_helpers/modelMaxBudgetPayload";
import {
  computeTeamModelBadges,
  normalizeTeamModelSelection,
  TeamAccessGroupModelGrant,
  TeamModelBadge,
  TeamModelBadgeKind,
} from "./teamModelAccess";
import { computeInheritedGrants } from "../permissions/inheritedGrants";
import MetadataKeyValueFields, {
  metadataObjectToPairs,
  metadataPairsSchema,
  metadataPairsToObject,
} from "../common_components/MetadataKeyValueFields";
import { useTeamMetadataSchema } from "@/app/(dashboard)/hooks/teams/useTeamMetadataSchema";
import ModelAliasManager from "../common_components/ModelAliasManager";
import AgentSelector from "../agent_management/AgentSelector";
import DeleteResourceModal from "../common_components/DeleteResourceModal";
import PassThroughRoutesSelector from "../common_components/PassThroughRoutesSelector";
import { unfurlWildcardModelsInList } from "../key_team_helpers/fetch_available_models_team_key";
import GuardrailSettingsView from "../GuardrailSettingsView";
import LoggingSettingsView from "../logging_settings_view";
import MCPServerSelector from "../mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "../mcp_server_management/MCPToolPermissions";
import {
  mcpServersForIdentifier,
  resolveEffectiveMcpServers,
  type EffectiveMcpServer,
} from "../mcp_server_management/effectiveMcpServers";
import type { MCPServer } from "../mcp_tools/types";
import { useMCPServers } from "@/app/(dashboard)/hooks/mcpServers/useMCPServers";
import { useMCPToolsets } from "@/app/(dashboard)/hooks/mcpServers/useMCPToolsets";
import { useAccessGroups, type AccessGroupResponse } from "@/app/(dashboard)/hooks/accessGroups/useAccessGroups";
import { ModelSelect } from "../ModelSelect/ModelSelect";
import { estimateChecks, estimateTooltips } from "../templates/estimatedOutputTokens";
import ObjectPermissionsView from "../object_permissions_view";
import NumericalInput from "../shared/numerical_input";
import VectorStoreSelector from "../vector_store_management/VectorStoreSelector";
import SearchToolSelector from "../search_tools/SearchToolSelector";
import SkillSelector from "../skills/SkillSelector";
import EditLoggingSettings from "./EditLoggingSettings";
import RouterSettingsAccordion, { RouterSettingsAccordionRef } from "../common_components/RouterSettingsAccordion";
import MemberModal from "./EditMembership";
import MemberPermissions from "./member_permissions";
import MyUserTab from "./MyUserTab";
import {
  getTeamInfoDefaultTab,
  getTeamInfoVisibleTabs,
  TEAM_INFO_TAB_KEYS,
  TEAM_INFO_TAB_LABELS,
} from "./tabVisibilityUtils";
import TeamMembersComponent from "./TeamMemberTab";
import { useModelAccessGroupNames } from "@/app/(dashboard)/hooks/models/useModels";
import {
  isValidThreshold,
  TEAM_MEMBER_MAX_BUDGET_ALERT_EMAILS_KEY,
  teamMemberBudgetAlertEmailsFromRows,
  teamMemberBudgetAlertRowsFromMetadata,
  teamMemberBudgetAlertSummary,
} from "./teamMemberBudgetAlertEmails";
import { TeamVirtualKeysTable } from "./TeamVirtualKeysTable";
import ResetMemberBudgetsDialog from "./ResetMemberBudgetsDialog";
import { customBudgetMemberUserIds, shouldPromptMemberBudgetReset } from "./memberBudgetReset";
import { useMemberBudgetReset } from "./useMemberBudgetReset";
import { fetchClient } from "@/lib/http/api";

const UI_MANAGED_METADATA_KEYS: ReadonlySet<string> = new Set([
  "logging",
  "secret_manager_settings",
  "soft_budget_alerting_emails",
  TEAM_MEMBER_MAX_BUDGET_ALERT_EMAILS_KEY,
  "model_tpm_limit",
  "model_rpm_limit",
  "default_estimated_output_tokens",
  "default_estimated_output_tokens_per_model",
  "allowed_passthrough_routes",
  "guardrails",
  "opted_out_global_guardrails",
  "disable_global_guardrails",
]);

const TEAM_MODEL_BADGE_TONES: Record<TeamModelBadgeKind, StatusTone> = {
  "all-proxy": "error",
  "no-default": "neutral",
  direct: "info",
  "access-group": "success",
};

const teamModelBadgeHref = (
  badge: TeamModelBadge,
  accessGroupNames: ReadonlySet<string> | undefined,
): string | undefined => {
  if (badge.kind === "direct") return modelOrAccessGroupHref(badge.label, accessGroupNames);
  if (badge.kind === "access-group") return modelGroupHref(badge.label);
  return undefined;
};

export type McpGrantResolution =
  | { readonly kind: "resolved"; readonly serverIds: ReadonlySet<string> }
  | { readonly kind: "unresolvable"; readonly reason: string };

export type TeamAccessGroupGrants = {
  readonly ids: readonly string[];
  readonly serverIds: readonly string[];
};

const sameIdSelection = (a: readonly string[], b: readonly string[]): boolean => {
  const aSet = new Set(a);
  const bSet = new Set(b);
  return aSet.size === bSet.size && [...aSet].every((id) => bSet.has(id));
};

export const standingToolPermissionServerIds = (
  loadedEffectiveServers: readonly EffectiveMcpServer[],
  loadedAccessGroupIds: readonly string[],
  accessGroups: readonly Pick<AccessGroupResponse, "access_group_id" | "access_mcp_server_ids">[],
  loadedTeamGroupServerIds: readonly string[],
): ReadonlySet<string> => {
  const loadedUnifiedServerIds = new Set([
    ...accessGroups
      .filter((group) => loadedAccessGroupIds.includes(group.access_group_id))
      .flatMap((group) => group.access_mcp_server_ids),
    ...loadedTeamGroupServerIds,
  ]);
  return new Set(
    loadedEffectiveServers
      .filter(({ source, server }) => source.kind === "toolPermission" && !loadedUnifiedServerIds.has(server.server_id))
      .map(({ server }) => server.server_id),
  );
};

export type McpGrantInput = {
  readonly effectiveServers: readonly EffectiveMcpServer[];
  readonly selectedAccessGroupIds: readonly string[];
  readonly accessGroups: readonly Pick<AccessGroupResponse, "access_group_id" | "access_mcp_server_ids">[];
  readonly standingServerIds: ReadonlySet<string>;
  readonly loadTeamGroups: () => Promise<TeamAccessGroupGrants>;
};

export const grantedMcpServerIds = async ({
  effectiveServers,
  selectedAccessGroupIds,
  accessGroups,
  standingServerIds,
  loadTeamGroups,
}: McpGrantInput): Promise<McpGrantResolution> => {
  const selectedGroups = accessGroups.filter((group) => selectedAccessGroupIds.includes(group.access_group_id));
  const direct = effectiveServers
    .filter(({ source }) => source.kind !== "toolPermission")
    .map(({ server }) => server.server_id);
  if (selectedAccessGroupIds.every((id) => selectedGroups.some((group) => group.access_group_id === id))) {
    return {
      kind: "resolved",
      serverIds: new Set([
        ...direct,
        ...selectedGroups.flatMap((group) => group.access_mcp_server_ids),
        ...standingServerIds,
      ]),
    };
  }
  const loadedTeamGroups = await loadTeamGroups().catch(() => null);
  if (loadedTeamGroups === null) {
    return { kind: "unresolvable", reason: "无法重新加载该 Team 的 访问组" };
  }
  if (sameIdSelection(selectedAccessGroupIds, loadedTeamGroups.ids)) {
    return {
      kind: "resolved",
      serverIds: new Set([...direct, ...loadedTeamGroups.serverIds, ...standingServerIds]),
    };
  }
  return { kind: "unresolvable", reason: "无法加载该 Team 的 访问组" };
};

export const retainedMcpToolPermissions = (
  toolPermissions: Record<string, string[]>,
  grantedServerIds: ReadonlySet<string>,
  knownServers: readonly MCPServer[],
): Record<string, string[]> => {
  const entries = Object.entries(toolPermissions).flatMap(([key, tools]) => {
    const named = mcpServersForIdentifier(knownServers, key);
    const granted = named.filter((server) => grantedServerIds.has(server.server_id));
    if (named.length === 0 || granted.length === named.length) {
      return [[key, tools] as const];
    }
    if (granted.length === 0) {
      return [];
    }
    return granted.map(({ server_id }) => [server_id, [...(toolPermissions[server_id] ?? []), ...tools]] as const);
  });
  return entries.reduce<Record<string, string[]>>(
    (retained, [key, tools]) => ({
      ...retained,
      [key]: [...new Set([...(retained[key] ?? []), ...tools])],
    }),
    {},
  );
};

export const mcpUnresolvableSaveError = (reason: string): string =>
  `无法保存 MCP 工具权限：${reason}。请等待页面加载完成后重试`;

export type TeamMemberBudgetSource = components["schemas"]["TeamMemberResetBudgetResponse"]["budget_source"];

export interface TeamMembership {
  user_id: string;
  team_id: string;
  budget_id: string | null;
  budget_source: TeamMemberBudgetSource;
  spend: number;
  total_spend: number | null;
  litellm_budget_table: {
    budget_id: string;
    soft_budget: number | null;
    max_budget: number | null;
    max_parallel_requests: number | null;
    tpm_limit: number | null;
    rpm_limit: number | null;
    model_max_budget: Record<string, number> | null;
    budget_duration: string | null;
    budget_reset_at: string | null;
    allowed_models?: string[] | null;
    temp_budget_increase?: number | null;
    temp_budget_expiry?: string | null;
  };
}

export interface TeamData {
  team_id: string;
  team_info: {
    team_alias: string;
    team_id: string;
    organization_id: string | null;
    admins: string[];
    members: string[];
    members_with_roles: Member[];
    metadata: Record<string, any>;
    tpm_limit: number | null;
    rpm_limit: number | null;
    tpd_limit?: number | null;
    max_budget: number | null;
    soft_budget?: number | null;
    budget_duration: string | null;
    model_max_budget?: StoredModelMaxBudget | null;
    model_max_budget_usage?: Record<string, ModelBudgetUsage> | null;
    models: string[];
    blocked: boolean;
    spend: number;
    max_parallel_requests: number | null;
    budget_reset_at: string | null;
    model_id: string | null;
    litellm_model_table: {
      model_aliases: Record<string, string> | null;
    } | null;
    created_at: string;
    access_group_ids?: string[];
    default_team_member_models?: string[];
    access_group_models?: string[];
    access_group_mcp_server_ids?: string[];
    access_group_agent_ids?: string[];
    access_group_details?: TeamAccessGroupModelGrant[];
    router_settings?: Record<string, any>;
    guardrails?: string[];
    policies?: string[];
    object_permission?: ObjectPermission | null;
    caller_edit_access?: CallerEditAccess;
    team_member_budget_table: {
      max_budget: number | null;
      budget_duration: string | null;
      tpm_limit: number | null;
      rpm_limit: number | null;
    } | null;
  };
  keys: any[];
  team_memberships: TeamMembership[];
}

export interface TeamInfoProps {
  teamId: string;
  onUpdate: (data: any) => void;
  onClose: () => void;
  accessToken: string | null;
  is_team_admin: boolean;
  is_proxy_admin: boolean;
  userModels: string[];
  editTeam: boolean;
  premiumUser?: boolean;
}

const SUPPRESSED_BY_DESCRIPTION = "";

const numericInputSchema = z.union([z.string(), z.number()]).nullish();

const teamUpdateFieldsSchema = z.object({
  team_alias: z.string().min(1, "请Type 团队名称"),
  models: z.array(z.string()).optional(),
  max_budget: numericInputSchema,
  soft_budget: numericInputSchema,
  soft_budget_alerting_emails: z.union([z.string(), z.array(z.string())]).optional(),
  default_team_member_models: z.array(z.string()).optional(),
  team_member_budget: numericInputSchema,
  team_member_budget_duration: z.string().nullish(),
  team_member_key_duration: z.string().optional(),
  team_member_tpm_limit: numericInputSchema,
  team_member_rpm_limit: numericInputSchema,
  team_member_max_budget_alert_emails: z
    .array(z.object({ threshold: z.number().nullable(), emails: z.string() }))
    .superRefine((rows, ctx) => {
      rows.forEach((row, index) => {
        if (!isValidThreshold(row.threshold)) {
          ctx.addIssue({ code: "custom", message: "请Type 1 至 100 的整数", path: [index, "threshold"] });
        } else if (rows.filter((other) => other.threshold === row.threshold).length > 1) {
          ctx.addIssue({ code: "custom", message: "阈值重复", path: [index, "threshold"] });
        }
      });
    })
    .optional(),
  budget_duration: z.string().nullish(),
  tpm_limit: numericInputSchema,
  rpm_limit: numericInputSchema,
  tpd_limit: numericInputSchema,
  modelLimits: z
    .array(
      z.object({
        model: z
          .string()
          .nullable()
          .refine((model) => Boolean(model), "缺少 Model"),
        tpm: z.number().nullish(),
        rpm: z.number().nullish(),
      }),
    )
    .superRefine((rows, ctx) => {
      rows.forEach((row, index) => {
        if (row.model && rows.filter((other) => other.model === row.model).length > 1) {
          ctx.addIssue({ code: "custom", message: "Model 重复", path: [index, "model"] });
        }
        if (row.model && row.tpm == null && row.rpm == null) {
          ctx.addIssue({ code: "custom", message: "TPM 和 RPM 至少设置一项", path: [index, "tpm"] });
        }
      });
    }),
  default_estimated_output_tokens: numericInputSchema.refine(
    estimateChecks.positive.isValid,
    estimateChecks.positive.message,
  ),
  default_estimated_output_tokens_per_model: z
    .string()
    .optional()
    .refine(estimateChecks.perModel.isValid, estimateChecks.perModel.message),
  guardrails: z.array(z.string()).optional(),
  disable_global_guardrails: z.boolean().optional(),
  policies: z.array(z.string()).optional(),
  access_group_ids: z.array(z.string()).optional(),
  vector_stores: z.array(z.string()).optional(),
  allowed_passthrough_routes: z.array(z.string()).optional(),
  mcp_servers_and_groups: z
    .object({
      servers: z.array(z.string()),
      accessGroups: z.array(z.string()),
      toolsets: z.array(z.string()).optional(),
    })
    .optional(),
  mcp_tool_permissions: z.record(z.string(), z.array(z.string())).optional(),
  agents_and_groups: z.object({ agents: z.array(z.string()), accessGroups: z.array(z.string()) }).optional(),
  object_permission_search_tools: z.array(z.string()).optional(),
  object_permission_skills: z.array(z.string()).optional(),
  organization_id: z.string().nullish(),
  logging_settings: z.array(z.unknown()).optional(),
  secret_manager_settings: z.string().optional(),
  metadata: metadataPairsSchema.optional(),
});

type TeamUpdateFormValues = z.infer<typeof teamUpdateFieldsSchema>;

type TeamInfoRecord = TeamData["team_info"] & { team_member_key_duration?: string };

const TEAM_MEMBER_SETTINGS_FIELDS = [
  "default_team_member_models",
  "team_member_budget",
  "team_member_budget_duration",
  "team_member_key_duration",
  "team_member_tpm_limit",
  "team_member_rpm_limit",
  "team_member_max_budget_alert_emails",
] as const;
const SEARCH_TOOL_SETTINGS_FIELDS = ["object_permission_search_tools"] as const;

const EMPTY_TEAM_UPDATE_VALUES: TeamUpdateFormValues = {
  team_alias: "",
  models: [],
  max_budget: undefined,
  soft_budget: undefined,
  soft_budget_alerting_emails: "",
  default_team_member_models: [],
  team_member_budget: undefined,
  team_member_budget_duration: undefined,
  team_member_key_duration: undefined,
  team_member_tpm_limit: undefined,
  team_member_rpm_limit: undefined,
  team_member_max_budget_alert_emails: [],
  budget_duration: undefined,
  tpm_limit: undefined,
  rpm_limit: undefined,
  tpd_limit: undefined,
  modelLimits: [],
  default_estimated_output_tokens: undefined,
  default_estimated_output_tokens_per_model: "",
  guardrails: [],
  disable_global_guardrails: false,
  policies: [],
  access_group_ids: [],
  vector_stores: [],
  allowed_passthrough_routes: [],
  mcp_servers_and_groups: { servers: [], accessGroups: [], toolsets: [] },
  mcp_tool_permissions: {},
  agents_and_groups: { agents: [], accessGroups: [] },
  object_permission_search_tools: [],
  object_permission_skills: [],
  organization_id: null,
  logging_settings: [],
  secret_manager_settings: "",
  metadata: [],
};

const computeEffectiveGuardrails = (info: TeamInfoRecord, globalGuardrailNames: ReadonlySet<string>): string[] => {
  const optedOutGlobals = new Set<string>(
    Array.isArray(info.metadata?.opted_out_global_guardrails) ? info.metadata.opted_out_global_guardrails : [],
  );
  const nonGlobalOptIns: string[] = (Array.isArray(info.metadata?.guardrails) ? info.metadata.guardrails : []).filter(
    (name: string) => !globalGuardrailNames.has(name),
  );
  return info.metadata?.disable_global_guardrails === true
    ? nonGlobalOptIns
    : [...Array.from(globalGuardrailNames).filter((name) => !optedOutGlobals.has(name)), ...nonGlobalOptIns];
};

const toTeamFormValues = (info: TeamInfoRecord, effectiveGuardrails: string[]): TeamUpdateFormValues => ({
  team_alias: info.team_alias,
  models: info.models,
  max_budget: info.max_budget,
  soft_budget: info.soft_budget,
  soft_budget_alerting_emails: Array.isArray(info.metadata?.soft_budget_alerting_emails)
    ? info.metadata.soft_budget_alerting_emails.join(", ")
    : "",
  default_team_member_models: info.default_team_member_models || [],
  team_member_budget: info.team_member_budget_table?.max_budget,
  team_member_budget_duration: info.team_member_budget_table?.budget_duration,
  team_member_key_duration: info.metadata?.team_member_key_duration,
  team_member_tpm_limit: info.team_member_budget_table?.tpm_limit,
  team_member_rpm_limit: info.team_member_budget_table?.rpm_limit,
  team_member_max_budget_alert_emails: [...teamMemberBudgetAlertRowsFromMetadata(info.metadata)],
  budget_duration: info.budget_duration,
  tpm_limit: info.tpm_limit,
  rpm_limit: info.rpm_limit,
  tpd_limit: info.tpd_limit,
  modelLimits: Array.from(
    new Set([
      ...Object.keys(info.metadata?.model_tpm_limit ?? {}),
      ...Object.keys(info.metadata?.model_rpm_limit ?? {}),
    ]),
  ).map((model) => ({
    model,
    tpm: info.metadata?.model_tpm_limit?.[model],
    rpm: info.metadata?.model_rpm_limit?.[model],
  })),
  default_estimated_output_tokens: info.metadata?.default_estimated_output_tokens,
  default_estimated_output_tokens_per_model: info.metadata?.default_estimated_output_tokens_per_model
    ? JSON.stringify(info.metadata.default_estimated_output_tokens_per_model)
    : "",
  guardrails: effectiveGuardrails,
  disable_global_guardrails: info.metadata?.disable_global_guardrails || false,
  policies: info.policies || [],
  access_group_ids: info.access_group_ids || [],
  vector_stores: info.object_permission?.vector_stores || [],
  allowed_passthrough_routes: info.metadata?.allowed_passthrough_routes || [],
  mcp_servers_and_groups: {
    servers: info.object_permission?.mcp_servers || [],
    accessGroups: info.object_permission?.mcp_access_groups || [],
    toolsets: info.object_permission?.mcp_toolsets || [],
  },
  mcp_tool_permissions: info.object_permission?.mcp_tool_permissions || {},
  agents_and_groups: {
    agents: info.object_permission?.agents || [],
    accessGroups: info.object_permission?.agent_access_groups || [],
  },
  object_permission_search_tools: info.object_permission?.search_tools || [],
  object_permission_skills: info.object_permission?.skills || [],
  organization_id: info.organization_id,
  logging_settings: info.metadata?.logging || [],
  secret_manager_settings: info.metadata?.secret_manager_settings
    ? JSON.stringify(info.metadata.secret_manager_settings, null, 2)
    : "",
  metadata: metadataObjectToPairs(info.metadata, UI_MANAGED_METADATA_KEYS),
});

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

const TeamInfoView: React.FC<TeamInfoProps> = ({
  teamId,
  onClose,
  accessToken,
  is_team_admin,
  is_proxy_admin,
  userModels,
  editTeam,
  premiumUser = false,
  onUpdate,
}) => {
  const teamUpdateSchema = useMemo(
    () =>
      teamUpdateFieldsSchema.superRefine((values, ctx) => {
        if (!isParsableJson(values.secret_manager_settings)) {
          ctx.addIssue({ code: "custom", message: SUPPRESSED_BY_DESCRIPTION, path: ["secret_manager_settings"] });
        }
      }),
    [],
  );
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const form = useZodForm(teamUpdateSchema, { defaultValues: EMPTY_TEAM_UPDATE_VALUES });
  const {
    fields: modelLimitRows,
    append: appendModelLimit,
    remove: removeModelLimit,
  } = useFieldArray({ control: form.control, name: "modelLimits" });
  const {
    fields: memberBudgetAlertRows,
    append: appendMemberBudgetAlertRow,
    remove: removeMemberBudgetAlertRow,
  } = useFieldArray({ control: form.control, name: "team_member_max_budget_alert_emails" });
  const [teamMemberSettingsOpen, setTeamMemberSettingsOpen] = useState(false);
  const [searchToolSettingsOpen, setSearchToolSettingsOpen] = useState(false);
  const [isEditMemberModalVisible, setIsEditMemberModalVisible] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { data: guardrailsData, isLoading: isGuardrailsLoading } = useGuardrails();
  const globalGuardrailNames = guardrailsData?.globalGuardrailNames ?? new Set<string>();
  const canViewPolicies = useCan("viewPolicies");
  const [policiesList, setPoliciesList] = useState<string[]>([]);
  const [policyGuardrails, setPolicyGuardrails] = useState<Record<string, string[]>>({});
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTeamSaving, setIsTeamSaving] = useState(false);
  const [teamModelAliases, setTeamModelAliases] = useState<Record<string, string>>({});
  const [teamModelMaxBudget, setTeamModelMaxBudget] = useState<ModelMaxBudget>({});
  const routerSettingsRef = React.useRef<RouterSettingsAccordionRef>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const { userRole } = useAuthorized();
  const accessGroupNames = useModelAccessGroupNames();
  const { data: allMcpServers = [], isError: mcpServersFailed, isLoading: mcpServersLoading } = useMCPServers();
  const { data: allMcpToolsets = [], isError: mcpToolsetsFailed, isLoading: mcpToolsetsLoading } = useMCPToolsets();
  const { data: allAccessGroups = [], isError: accessGroupsFailed, isLoading: accessGroupsLoading } = useAccessGroups();
  const canEditTeamEstimates = isProxyAdminRole(userRole);
  const teamEstimateTooltip = estimateTooltips(canEditTeamEstimates, "team");
  const { data: userOrganizations = [] } = useOrganizations();
  const { data: teamMetadataSchemaFields = [], isLoading: isTeamMetadataSchemaLoading } = useTeamMetadataSchema();
  const queryClient = useQueryClient();

  // Models currently selected in the team edit form, used to scope the per-model
  // rate limit dropdown to models this team actually has access to.
  const watchedModels = form.watch("models");
  const killSwitchOn = form.watch("disable_global_guardrails");
  const watchedMcpSelection = form.watch("mcp_servers_and_groups");
  const watchedToolPermissions = form.watch("mcp_tool_permissions");
  const mcpLookupFailure =
    (
      [
        [mcpServersFailed, "MCP 服务器列表加载失败"],
        [mcpToolsetsFailed, "MCP 工具集列表加载失败"],
        [accessGroupsFailed, "访问组 列表加载失败"],
        [mcpServersLoading || mcpToolsetsLoading || accessGroupsLoading, "MCP 服务器清单仍在加载中"],
      ] as const
    ).find(([failed]) => failed)?.[1] ?? null;
  const availableRateLimitModels = useMemo(() => {
    const selected = watchedModels ?? teamData?.team_info?.models ?? [];
    if (selected.includes("all-proxy-models") || selected.includes("all-team-models")) {
      return userModels;
    }
    return unfurlWildcardModelsInList(selected, userModels);
  }, [watchedModels, teamData, userModels]);

  const teamEditAccess = useMemo(() => parseTeamEditAccess(teamData?.team_info?.caller_edit_access), [teamData]);
  const canEditTeam = is_team_admin || is_proxy_admin || teamEditAccess.kind !== "none";
  const visibleTabs = useMemo(() => getTeamInfoVisibleTabs(canEditTeam), [canEditTeam]);
  const defaultTabKey = useMemo(() => getTeamInfoDefaultTab(editTeam, canEditTeam), [editTeam, canEditTeam]);
  const { onTabChange, hasVisited } = useVisitedTabs(defaultTabKey);

  const teamFormValues = (): TeamUpdateFormValues => {
    const info = teamData?.team_info;
    return info
      ? toTeamFormValues(info, computeEffectiveGuardrails(info, globalGuardrailNames))
      : EMPTY_TEAM_UPDATE_VALUES;
  };

  const startEditing = () => {
    form.reset(teamFormValues());
    setTeamModelMaxBudget((teamData?.team_info?.model_max_budget ?? {}) as ModelMaxBudget);
    setTeamMemberSettingsOpen(false);
    setSearchToolSettingsOpen(false);
    setIsEditing(true);
  };

  const openSettingsEditor = (modelAliases: Record<string, string>) => {
    if (teamEditAccess.kind === "team_admin_disabled") {
      toast.error(TEAM_ADMIN_EDITING_DISABLED_TITLE, { description: TEAM_ADMIN_EDITING_DISABLED_DESCRIPTION });
      return;
    }
    setTeamModelAliases(modelAliases);
    startEditing();
  };

  const applyKillSwitchToGuardrails = (checked: boolean) => {
    const current = form.getValues("guardrails") ?? [];
    const nonGlobals = current.filter((name) => !globalGuardrailNames.has(name));
    form.setValue("guardrails", checked ? nonGlobals : [...Array.from(globalGuardrailNames), ...nonGlobals]);
  };

  const mountedUpdateValues = (values: TeamUpdateFormValues): Record<string, unknown> => {
    const unmounted = new Set<string>([
      ...(teamMemberSettingsOpen ? [] : TEAM_MEMBER_SETTINGS_FIELDS),
      ...(canViewPolicies ? [] : ["policies"]),
      ...(searchToolSettingsOpen ? [] : SEARCH_TOOL_SETTINGS_FIELDS),
    ]);
    return Object.fromEntries(Object.entries(values).filter(([key]) => !unmounted.has(key)));
  };

  const onTeamUpdateSubmit = (values: TeamUpdateFormValues) => handleTeamUpdate(mountedUpdateValues(values));

  const fetchTeamInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) return;
      const response = await teamInfoCall(accessToken, teamId);
      setTeamData(response);
    } catch (error) {
      toast.fromError("加载 团队信息失败");
      console.error("Error fetching team info:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTeamData = async () => {
    if (!accessToken) return;
    try {
      setTeamData(await teamInfoCall(accessToken, teamId));
    } catch {
      toast.fromError("加载 团队信息失败");
    }
  };

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId, accessToken]);

  // Fetch organization data when team has organization_id
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!accessToken || !teamData?.team_info?.organization_id) {
        setOrganization(null);
        return;
      }

      try {
        const orgData = await organizationInfoCall(accessToken, teamData.team_info.organization_id);
        setOrganization(orgData);
      } catch (error) {
        console.error("Error fetching organization info:", error);
        setOrganization(null);
      }
    };

    fetchOrganization();
  }, [accessToken, teamData?.team_info?.organization_id]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        if (!accessToken) return;
        const response = await getPoliciesList(accessToken);
        const policyNames = response.policies.map((p: { policy_name: string }) => p.policy_name);
        setPoliciesList(policyNames);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      }
    };

    if (canViewPolicies) fetchPolicies();
  }, [accessToken, canViewPolicies]);

  // Fetch resolved guardrails for all policies
  useEffect(() => {
    const fetchPolicyGuardrails = async () => {
      if (!accessToken || !teamData?.team_info?.policies || teamData.team_info.policies.length === 0) {
        return;
      }

      setLoadingPolicies(true);
      const guardrailsMap: Record<string, string[]> = {};

      try {
        await Promise.all(
          teamData.team_info.policies.map(async (policyName: string) => {
            try {
              const policyInfo = await getPolicyInfoWithGuardrails(accessToken, policyName);
              guardrailsMap[policyName] = policyInfo.resolved_guardrails || [];
            } catch (error) {
              console.error(`Failed to fetch guardrails for policy ${policyName}:`, error);
              guardrailsMap[policyName] = [];
            }
          }),
        );
        setPolicyGuardrails(guardrailsMap);
      } catch (error) {
        console.error("Failed to fetch policy guardrails:", error);
      } finally {
        setLoadingPolicies(false);
      }
    };

    fetchPolicyGuardrails();
  }, [accessToken, teamData?.team_info?.policies]);

  const handleMemberCreate = async (values: any) => {
    try {
      if (accessToken == null) return;

      const member: Member = {
        user_email: values.user_email,
        user_id: values.user_id,
        role: values.role,
      };

      await teamMemberAddCall(accessToken, teamId, member);

      toast.success("团队成员添加成功");
      setIsAddMemberModalVisible(false);
      form.reset(teamFormValues());

      // Fetch updated team info
      const updatedTeamData = await teamInfoCall(accessToken, teamId);
      setTeamData(updatedTeamData);

      // Notify parent component of the update
      onUpdate(updatedTeamData);
    } catch (error: any) {
      let errMsg = "添加 团队成员失败";

      if (error?.raw?.detail?.error?.includes("Assigning team admins is a premium feature")) {
        errMsg = "分配 Admin 是企业版专属功能。请升级你的 LiteLLM 套餐以启用此功能。";
      } else if (error?.message) {
        errMsg = error.message;
      }

      toast.fromError(errMsg);
      console.error("Error adding team member:", error);
    }
  };

  const handleMemberUpdate = async (values: any) => {
    try {
      if (accessToken == null) {
        return;
      }

      const member: Member = {
        user_email: values.user_email,
        user_id: values.user_id,
        role: values.role,
        max_budget_in_team: values.max_budget_in_team,
        tpm_limit: values.tpm_limit,
        rpm_limit: values.rpm_limit,
        budget_duration: values.budget_duration,
        allowed_models: values.allowed_models,
        temp_budget_increase: values.temp_budget_increase,
        temp_budget_expiry: values.temp_budget_expiry,
      };
      toast.dismiss(); // Remove all existing toasts

      await teamMemberUpdateCall(accessToken, teamId, member);

      toast.success("团队成员更新成功");
      setIsEditMemberModalVisible(false);

      // Fetch updated team info
      const updatedTeamData = await teamInfoCall(accessToken, teamId);
      setTeamData(updatedTeamData);

      // Notify parent component of the update
      onUpdate(updatedTeamData);
    } catch (error: any) {
      let errMsg = "更新 团队成员失败";
      if (error?.raw?.detail?.includes("Assigning team admins is a premium feature")) {
        errMsg = "分配 Admin 是企业版专属功能。请升级你的 LiteLLM 套餐以启用此功能。";
      } else if (error?.message) {
        errMsg = error.message;
      }
      setIsEditMemberModalVisible(false);

      toast.dismiss(); // Remove all existing toasts

      toast.fromError(errMsg);
      console.error("Error updating team member:", error);
    }
  };

  const handleMemberDelete = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete || !accessToken) return;

    setIsDeleting(true);
    try {
      await teamMemberDeleteCall(accessToken, teamId, memberToDelete);

      toast.success("团队成员移除成功");

      // Fetch updated team info
      const updatedTeamData = await teamInfoCall(accessToken, teamId);
      setTeamData(updatedTeamData);

      // Notify parent component of the update
      onUpdate(updatedTeamData);
    } catch (error) {
      toast.fromError("移除 团队成员失败");
      console.error("Error removing team member:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const persistTeamUpdate = async (token: string, updateData: Record<string, unknown>) => {
    await teamUpdateCall(token, updateData);
    void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    void invalidateTeamQueries(queryClient);
    setIsEditing(false);
  };

  const memberBudgetReset = useMemberBudgetReset({
    saveTeam: async (updateData) => {
      if (!accessToken) return;
      setIsTeamSaving(true);
      try {
        await persistTeamUpdate(accessToken, updateData);
      } finally {
        setIsTeamSaving(false);
      }
    },
    resetMember预算: async (bulkTeamId, userIds) => {
      const { data } = await fetchClient.POST("/management/v1/teams/{team_id}/members/bulk_update", {
        params: { path: { team_id: bulkTeamId } },
        body: { members: userIds.map((user_id) => ({ user_id, max_budget_in_team: null })) },
      });
      return data?.data ?? [];
    },
    refreshTeamData,
  });

  const { dismiss: dismissMemberBudgetReset } = memberBudgetReset;
  useEffect(() => {
    dismissMemberBudgetReset();
  }, [teamId, dismissMemberBudgetReset]);

  const saveTeamAdminSettings = async (changes: TeamAdminSettingsChanges) => {
    if (!accessToken) return;
    setIsTeamSaving(true);
    try {
      await persistTeamUpdate(accessToken, { team_id: teamId, ...changes });
      toast.success("团队设置已更新");
      await fetchTeamInfo();
    } catch (error) {
      console.error("Error updating team:", error);
    } finally {
      setIsTeamSaving(false);
    }
  };

  const handleTeamUpdate = async (values: any) => {
    try {
      if (!accessToken) return;
      setIsTeamSaving(true);

      const parsedMetadata = metadataPairsToObject(values.metadata);

      let secretManagerSettings: Record<string, any> | undefined;
      if (typeof values.secret_manager_settings === "string") {
        const trimmedSecretConfig = values.secret_manager_settings.trim();
        if (trimmedSecretConfig.length > 0) {
          try {
            secretManagerSettings = JSON.parse(values.secret_manager_settings);
          } catch (e) {
            toast.fromError("Secret Manager 设置中的 JSON 无效");
            return;
          }
        }
      }

      const estimatedOutputTokens = numberOrNull(values.default_estimated_output_tokens);

      let estimatedOutputTokensPerModel: Record<string, number> | undefined;
      if (typeof values.default_estimated_output_tokens_per_model === "string") {
        const trimmedEstimates = values.default_estimated_output_tokens_per_model.trim();
        if (trimmedEstimates.length > 0) {
          try {
            estimatedOutputTokensPerModel = JSON.parse(trimmedEstimates);
          } catch (e) {
            toast.fromError("按 Model 预估输出 Token 中的 JSON 无效");
            return;
          }
        }
      }

      const modelTpmLimit: Record<string, number> = {};
      const modelRpmLimit: Record<string, number> = {};
      for (const entry of (values.modelLimits ?? []) as { model?: string; tpm?: number; rpm?: number }[]) {
        if (entry?.model) {
          if (entry.tpm != null) modelTpmLimit[entry.model] = entry.tpm;
          if (entry.rpm != null) modelRpmLimit[entry.model] = entry.rpm;
        }
      }

      const killSwitchOnAtSave = values.disable_global_guardrails === true;
      const optedOutGlobalGuardrails = killSwitchOnAtSave
        ? Array.from(globalGuardrailNames)
        : Array.from(globalGuardrailNames).filter((n) => !(values.guardrails || []).includes(n));

      // Non-proxy-admins can't set allowed_passthrough_routes; preserve the
      // stored value so an unrelated save can't wipe it.
      const passthroughRoutesMetadata = is_proxy_admin
        ? { allowed_passthrough_routes: values.allowed_passthrough_routes || [] }
        : info.metadata?.allowed_passthrough_routes
          ? { allowed_passthrough_routes: info.metadata.allowed_passthrough_routes }
          : {};

      const memberBudgetAlertEmails =
        values.team_member_max_budget_alert_emails !== undefined
          ? teamMemberBudgetAlertEmailsFromRows(values.team_member_max_budget_alert_emails)
          : info.metadata?.[TEAM_MEMBER_MAX_BUDGET_ALERT_EMAILS_KEY];
      const memberBudgetAlertEmailsMetadata =
        memberBudgetAlertEmails !== undefined && Object.keys(memberBudgetAlertEmails).length > 0
          ? { [TEAM_MEMBER_MAX_BUDGET_ALERT_EMAILS_KEY]: memberBudgetAlertEmails }
          : {};

      const updateData: any = {
        team_id: teamId,
        team_alias: values.team_alias,
        models: normalizeTeamModelSelection(values.models),
        tpm_limit: numberOrNull(values.tpm_limit),
        rpm_limit: numberOrNull(values.rpm_limit),
        tpd_limit: numberOrNull(values.tpd_limit),
        model_tpm_limit: modelTpmLimit,
        model_rpm_limit: modelRpmLimit,
        max_budget: numberOrNull(values.max_budget),
        soft_budget: numberOrNull(values.soft_budget),
        budget_duration: values.budget_duration ?? null,
        metadata: {
          ...parsedMetadata,
          ...passthroughRoutesMetadata,
          guardrails: (values.guardrails || []).filter((n: string) => !globalGuardrailNames.has(n)),
          opted_out_global_guardrails: optedOutGlobalGuardrails,
          ...(values.logging_settings?.length > 0 ? { logging: values.logging_settings } : {}),
          disable_global_guardrails: killSwitchOnAtSave,
          ...(estimatedOutputTokens !== null ? { default_estimated_output_tokens: estimatedOutputTokens } : {}),
          ...(estimatedOutputTokensPerModel !== undefined
            ? { default_estimated_output_tokens_per_model: estimatedOutputTokensPerModel }
            : {}),
          soft_budget_alerting_emails:
            typeof values.soft_budget_alerting_emails === "string"
              ? values.soft_budget_alerting_emails
                  .split(",")
                  .map((email: string) => email.trim())
                  .filter((email: string) => email.length > 0)
              : values.soft_budget_alerting_emails || [],
          ...(secretManagerSettings !== undefined ? { secret_manager_settings: secretManagerSettings } : {}),
          ...memberBudgetAlertEmailsMetadata,
        },
        ...(values.policies?.length > 0 ? { policies: values.policies } : {}),
        ...(values.organization_id !== info.organization_id ? { organization_id: values.organization_id ?? null } : {}),
      };

      updateData.team_member_budget_duration = values.team_member_budget_duration;

      const newTeamMemberBudget =
        values.team_member_budget !== undefined ? numberOrNull(values.team_member_budget) : undefined;
      if (newTeamMemberBudget !== undefined) {
        updateData.team_member_budget = newTeamMemberBudget;
      }

      if (values.team_member_key_duration !== undefined) {
        updateData.team_member_key_duration = values.team_member_key_duration;
      }

      if (values.team_member_tpm_limit !== undefined || values.team_member_rpm_limit !== undefined) {
        updateData.team_member_tpm_limit = numberOrNull(values.team_member_tpm_limit);
        updateData.team_member_rpm_limit = numberOrNull(values.team_member_rpm_limit);
      }

      // Handle object_permission updates
      const { servers, accessGroups, toolsets } = values.mcp_servers_and_groups || {
        servers: [],
        accessGroups: [],
        toolsets: [],
      };
      const submittedToolPermissions: Record<string, string[]> = values.mcp_tool_permissions || {};
      const effectiveMcpInput = {
        allServers: allMcpServers,
        selectedServers: servers || [],
        selectedAccessGroups: accessGroups || [],
        selectedToolsets: toolsets || [],
        toolsets: allMcpToolsets,
        toolPermissions: submittedToolPermissions,
      };
      const loadedObjectPermission = info.object_permission ?? {};
      const loadedMcpInput = {
        allServers: allMcpServers,
        selectedServers: loadedObjectPermission.mcp_servers ?? [],
        selectedAccessGroups: loadedObjectPermission.mcp_access_groups ?? [],
        selectedToolsets: loadedObjectPermission.mcp_toolsets ?? [],
        toolsets: allMcpToolsets,
        toolPermissions: loadedObjectPermission.mcp_tool_permissions ?? {},
      };
      const loadedEffectiveMcpServers = resolveEffectiveMcpServers(loadedMcpInput);
      const standingServerIds = standingToolPermissionServerIds(
        loadedEffectiveMcpServers,
        info.access_group_ids ?? [],
        allAccessGroups,
        info.access_group_mcp_server_ids ?? [],
      );
      const mcpGrantInput: McpGrantInput = {
        effectiveServers: resolveEffectiveMcpServers(effectiveMcpInput),
        selectedAccessGroupIds: values.access_group_ids || [],
        accessGroups: allAccessGroups,
        standingServerIds,
        loadTeamGroups: async () => {
          const teamInfo = await teamInfoCall(accessToken, teamId);
          return {
            ids: teamInfo.team_info.access_group_ids ?? [],
            serverIds: teamInfo.team_info.access_group_mcp_server_ids ?? [],
          };
        },
      };
      const mcpResolution: McpGrantResolution =
        mcpLookupFailure !== null
          ? { kind: "unresolvable", reason: mcpLookupFailure }
          : await grantedMcpServerIds(mcpGrantInput);
      if (mcpResolution.kind === "unresolvable" && Object.keys(submittedToolPermissions).length > 0) {
        toast.fromError(mcpUnresolvableSaveError(mcpResolution.reason));
        return;
      }
      const mcpToolPermissions =
        mcpResolution.kind === "resolved"
          ? retainedMcpToolPermissions(submittedToolPermissions, mcpResolution.serverIds, allMcpServers)
          : submittedToolPermissions;

      updateData.object_permission = {};
      if (servers) {
        updateData.object_permission.mcp_servers = servers;
      }
      if (accessGroups) {
        updateData.object_permission.mcp_access_groups = accessGroups;
      }
      if (mcpToolPermissions) {
        updateData.object_permission.mcp_tool_permissions = mcpToolPermissions;
      }
      if (toolsets) {
        updateData.object_permission.mcp_toolsets = toolsets;
      }
      delete values.mcp_servers_and_groups;
      delete values.mcp_tool_permissions;

      // Handle agent permissions
      const { agents, accessGroups: agentAccessGroups } = values.agents_and_groups || {
        agents: [],
        accessGroups: [],
      };
      updateData.object_permission.agents = agents;
      updateData.object_permission.agent_access_groups = agentAccessGroups;
      delete values.agents_and_groups;

      // Handle vector stores permissions
      if (values.vector_stores) {
        updateData.object_permission.vector_stores = values.vector_stores;
      }

      if (Array.isArray(values.object_permission_search_tools)) {
        updateData.object_permission.search_tools = values.object_permission_search_tools;
      }

      if (Array.isArray(values.object_permission_skills)) {
        updateData.object_permission.skills = values.object_permission_skills;
      }

      // Pass access_group_ids to the update request
      if (values.access_group_ids !== undefined) {
        updateData.access_group_ids = values.access_group_ids;
      }

      // Pass default_team_member_models to the update request
      if (values.default_team_member_models !== undefined) {
        updateData.default_team_member_models = values.default_team_member_models;
      }

      const previousModelAliases = info.litellm_model_table?.model_aliases ?? {};
      if (Object.keys(teamModelAliases).length > 0 || Object.keys(previousModelAliases).length > 0) {
        updateData.model_aliases = teamModelAliases;
      }

      const model预算 = modelMaxBudgetUpdate(teamModelMaxBudget, info.model_max_budget);
      if (model预算 !== undefined) {
        updateData.model_max_budget = model预算;
      }

      // Handle router_settings - read fresh values from DOM at save time.
      const currentRouterSettings = routerSettingsRef.current?.getValue();
      if (currentRouterSettings?.router_settings) {
        const isMeaningfulValue = (value: unknown) =>
          value !== null &&
          value !== undefined &&
          value !== "" &&
          value !== false &&
          !(Array.isArray(value) && value.length === 0);

        const hasNewValues = Object.values(currentRouterSettings.router_settings).some(isMeaningfulValue);
        const hadExistingSettings = info.router_settings && Object.values(info.router_settings).some(isMeaningfulValue);

        // Send if there are new values OR if the user is clearing existing ones
        if (hasNewValues || hadExistingSettings) {
          updateData.router_settings = currentRouterSettings.router_settings;
        }
      }

      const customBudgetUserIds = customBudgetMemberUserIds(teamData?.team_memberships ?? []);
      if (
        typeof newTeamMemberBudget === "number" &&
        shouldPromptMemberBudgetReset(
          newTeamMemberBudget,
          info.team_member_budget_table?.max_budget,
          customBudgetUserIds,
        )
      ) {
        const pendingReset = {
          teamId,
          updateData,
          userIds: customBudgetUserIds,
          newBudget: newTeamMemberBudget,
        };
        memberBudgetReset.prompt(pendingReset);
        return;
      }

      await persistTeamUpdate(accessToken, updateData);
      toast.success("团队设置已更新");
      await fetchTeamInfo();
    } catch (error) {
      console.error("Error updating team:", error);
    } finally {
      setIsTeamSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">加载中…</div>;
  }

  if (!teamData?.team_info) {
    return <div className="p-4">未找到团队</div>;
  }

  const { team_info: info } = teamData;

  const teamAdminSettingsEditor =
    teamEditAccess.kind === "team_admin" ? (
      <TeamAdminSettingsForm
        initialValues={{ tpm_limit: info.tpm_limit, rpm_limit: info.rpm_limit, max_budget: info.max_budget }}
        editableFields={teamEditAccess.editableFields}
        isSaving={isTeamSaving}
        onCancel={() => setIsEditing(false)}
        onSave={saveTeamAdminSettings}
      />
    ) : null;

  const inheritedMcpServers = computeInheritedGrants(
    info.access_group_mcp_server_ids,
    info.access_group_details,
    (grant) => grant.mcp_server_ids,
  );
  const inheritedAgents = computeInheritedGrants(
    info.access_group_agent_ids,
    info.access_group_details,
    (grant) => grant.agent_ids,
  );

  const initialKillSwitchOn = info.metadata?.disable_global_guardrails === true;

  const allGuardrails: GuardrailListItem[] = guardrailsData?.guardrails ?? [];
  const globalGuardrails = allGuardrails.filter((g) => g.litellm_params?.default_on);
  const otherGuardrails = allGuardrails.filter((g) => !g.litellm_params?.default_on);

  const copyToClipboard = async (text: string, key: string) => {
    const success = await utilCopyToClipboard(text);
    if (success) {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  const tabItems = [
    {
      key: TEAM_INFO_TAB_KEYS.OVERVIEW,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.OVERVIEW],
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="block p-6">
            <p>预算状态</p>
            <div className="mt-2">
              <h3 className="text-lg font-medium">${formatNumberWithCommas(info.spend, 2)}</h3>
              <p>/ {info.max_budget === null ? "无限制" : `$${formatNumberWithCommas(info.max_budget, 2)}`}</p>
              {info.budget_duration && <p className="text-muted-foreground">重置周期：{info.budget_duration}</p>}
              <br />
              {info.team_member_budget_table && (
                <p className="text-muted-foreground">
                  团队成员预算：${formatNumberWithCommas(info.team_member_budget_table.max_budget, 2)}
                </p>
              )}
            </div>
          </Card>

          <Card className="block p-6">
            <p>速率限制</p>
            <div className="mt-2">
              <p>TPM: {info.tpm_limit ?? "无限制"}</p>
              <p>RPM: {info.rpm_limit ?? "无限制"}</p>
              <p>TPD (batch): {info.tpd_limit ?? "无限制"}</p>
              {info.max_parallel_requests && <p>最大并行请求数：{info.max_parallel_requests}</p>}
              {(() => {
                const modelTpm = (info.metadata?.model_tpm_limit ?? {}) as Record<string, number>;
                const modelRpm = (info.metadata?.model_rpm_limit ?? {}) as Record<string, number>;
                const models = Array.from(new Set([...Object.keys(modelTpm), ...Object.keys(modelRpm)]));
                if (models.length === 0) return null;
                return (
                  <div className="mt-3">
                    <p className="text-muted-foreground">按 Model 限制：</p>
                    {models.map((m) => (
                      <p key={m} className="text-xs">
                        {m}: TPM {modelTpm[m] ?? "—"}, RPM {modelRpm[m] ?? "—"}
                      </p>
                    ))}
                  </div>
                );
              })()}
              <p>预估输出 Token：{info.metadata?.default_estimated_output_tokens ?? "默认"}</p>
              <p>
                按模型预估输出 Token：
                {info.metadata?.default_estimated_output_tokens_per_model
                  ? JSON.stringify(info.metadata.default_estimated_output_tokens_per_model)
                  : "默认"}
              </p>
            </div>
          </Card>

          <Card className="block p-6">
            <p>模型</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {computeTeamModelBadges(info.models, info.access_group_models || [], info.access_group_details).map(
                (badge, index) => (
                  <SimpleTooltip key={`${badge.kind}-${badge.label}-${index}`} content={badge.tooltip}>
                    <span>
                      <StatusBadge
                        tone={TEAM_MODEL_BADGE_TONES[badge.kind]}
                        label={badge.label}
                        href={teamModelBadgeHref(badge, accessGroupNames)}
                      />
                    </span>
                  </SimpleTooltip>
                ),
              )}
            </div>
          </Card>

          <Card className="block p-6">
            <p className="font-semibold text-foreground">虚拟密钥</p>
            <div className="mt-2">
              <p>User Keys: {teamData.keys.filter((key) => key.user_id).length}</p>
              <p>Service Account Keys: {teamData.keys.filter((key) => !key.user_id).length}</p>
              <p className="text-muted-foreground">Total: {teamData.keys.length}</p>
            </div>
          </Card>

          <ObjectPermissionsView
            objectPermission={info.object_permission}
            inheritedMcpServers={inheritedMcpServers}
            inheritedAgents={inheritedAgents}
            variant="card"
            accessToken={accessToken}
          />

          <Card className="block p-6">
            <GuardrailSettingsView
              globalGuardrailNames={globalGuardrailNames}
              teamGuardrails={Array.isArray(info.metadata?.guardrails) ? info.metadata.guardrails : []}
              optedOutGlobalGuardrails={
                Array.isArray(info.metadata?.opted_out_global_guardrails)
                  ? info.metadata.opted_out_global_guardrails
                  : []
              }
              killSwitchOn={initialKillSwitchOn}
              variant="inline"
            />
          </Card>

          <Card className="block p-6">
            <p className="font-semibold text-foreground mb-3">虚拟密钥</p>
            {info.policies && info.policies.length > 0 ? (
              <div className="space-y-4">
                {info.policies.map((policy: string, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{policy}</Badge>
                      {loadingPolicies && <p className="text-xs text-muted-foreground">加载护栏…</p>}
                    </div>
                    {!loadingPolicies && policyGuardrails[policy] && policyGuardrails[policy].length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-border">
                        <p className="text-xs text-muted-foreground mb-1">解析出的护栏：</p>
                        <div className="flex flex-wrap gap-1">
                          {policyGuardrails[policy].map((guardrail: string, gIndex: number) => (
                            <Badge key={gIndex} variant="secondary">
                              {guardrail}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">未配置策略</p>
            )}
          </Card>

          <LoggingSettingsView loggingConfigs={info.metadata?.logging || []} disabledCallbacks={[]} variant="card" />
        </div>
      ),
    },
    {
      key: TEAM_INFO_TAB_KEYS.MY_USER,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.MY_USER],
      children: <MyUserTab teamId={teamId} />,
    },
    {
      key: TEAM_INFO_TAB_KEYS.VIRTUAL_KEYS,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.VIRTUAL_KEYS],
      children: <TeamVirtualKeysTable teamId={teamId} teamAlias={info.team_alias} organization={organization} />,
    },
    {
      key: TEAM_INFO_TAB_KEYS.MEMBERS,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.MEMBERS],
      children: (
        <TeamMembersComponent
          teamData={teamData}
          canEditTeam={canEditTeam}
          handleMemberDelete={handleMemberDelete}
          onMemberSpendReset={refreshTeamData}
          onMemberBudgetReset={refreshTeamData}
          setSelectedEditMember={setSelectedEditMember}
          setIsEditMemberModalVisible={setIsEditMemberModalVisible}
          setIsAddMemberModalVisible={setIsAddMemberModalVisible}
        />
      ),
    },
    {
      key: TEAM_INFO_TAB_KEYS.MEMBER_PERMISSIONS,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.MEMBER_PERMISSIONS],
      children: <MemberPermissions teamId={teamId} accessToken={accessToken} canEditTeam={canEditTeam} />,
    },
    {
      key: TEAM_INFO_TAB_KEYS.SETTINGS,
      label: TEAM_INFO_TAB_LABELS[TEAM_INFO_TAB_KEYS.SETTINGS],
      children: (
        <Card className="block p-6 overflow-y-auto max-h-[65vh]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">团队设置</h3>
            {canEditTeam && !isEditing && (
              <Button
                variant="outline"
                onClick={() => openSettingsEditor(info.litellm_model_table?.model_aliases ?? {})}
              >
                <Pencil />
                编辑设置
              </Button>
            )}
          </div>

          {isEditing && (teamAdminSettingsEditor !== null || isGuardrailsLoading) ? (
            teamAdminSettingsEditor ?? <div className="p-4">加载中…</div>
          ) : isEditing ? (
            <TooltipProvider>
              <form onSubmit={(event) => void form.handleSubmit(onTeamUpdateSubmit)(event)}>
                <FieldGroup>
                  <FormField control={form.control} name="team_alias" label="团队名称">
                    {({ ref, value, ...field }) => <UIInput {...field} ref={ref} value={value ?? ""} />}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="models"
                    label="模型"
                    description="留空则不直接授予任何 Model。通过 访问组 授予的 Models 保持不变"
                  >
                    {({ id, value, onChange }) => (
                      <ModelSelect
                        id={id}
                        value={value ?? []}
                        onChange={onChange}
                        teamID={teamId}
                        organizationID={teamData?.team_info?.organization_id || undefined}
                        options={{
                          includeSpecialOptions: true,
                          includeUserModels: !teamData?.team_info?.organization_id,
                          showAllProxyModelsOverride:
                            isProxyAdminRole(userRole) && !teamData?.team_info?.organization_id,
                        }}
                        context="team"
                        dataTestId="models-select"
                      />
                    )}
                  </FormField>

                  <Field>
                    <FieldLabel>
                      {labelWithHint(
                        "模型别名",
                        "将自定义别名映射到底层 Model。团队成员可以在 API 请求中使用别名代替真实 Model 名称。",
                      )}
                    </FieldLabel>
                    <ModelAliasManager
                      accessToken={accessToken || ""}
                      initialModelAliases={teamModelAliases}
                      onAliasUpdate={setTeamModelAliases}
                      showExampleConfig={false}
                    />
                  </Field>

                  <FormField control={form.control} name="max_budget" label="最大预算 (USD)">
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={0.01} precision={2} />
                    )}
                  </FormField>

                  <FormField control={form.control} name="soft_budget" label="软预算 (USD)">
                    {({ ref, value, ...field }) => (
                      <NumericalInput {...field} ref={ref} value={value ?? ""} step={0.01} precision={2} />
                    )}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="soft_budget_alerting_emails"
                    label={labelWithHint(
                      "软 Budget 告警邮箱",
                      "当达到软 Budget 时接收告警的邮箱地址，用英文逗号分隔",
                    )}
                  >
                    {({ ref, value, ...field }) => (
                      <UIInput
                        {...field}
                        ref={ref}
                        value={typeof value === "string" ? value : ""}
                        placeholder="example1@test.com, example2@test.com"
                      />
                    )}
                  </FormField>

                  <Collapsible
                    open={teamMemberSettingsOpen}
                    onOpenChange={setTeamMemberSettingsOpen}
                    className="mt-4 mb-4 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>团队成员设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <p className="mb-4 text-xs text-muted-foreground">
                        成员加入此 Team 时应用的可选默认值。所有字段都可以按成员覆盖。
                      </p>
                      <FieldGroup>
                        <FormField
                          control={form.control}
                          name="default_team_member_models"
                          label={labelWithHint(
                            "默认 Model 访问权限",
                            "可选。设置后，新成员默认只能访问这些 Model。必须是上面 Team Models 的子集。留空则所有成员都可以访问所有团队模型。",
                          )}
                        >
                          {({ id, value, onChange }) => (
                            <MultiSelect
                              id={id}
                              value={value ?? []}
                              onValueChange={onChange}
                              options={(watchedModels ?? info.models ?? []).map((model) => ({
                                label: model,
                                value: model,
                              }))}
                              placeholder="留空 — 所有成员均可访问所有团队模型"
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_budget"
                          label={labelWithHint(
                            "默认 预算 (USD)",
                            "此 Team 中每个成员的默认预算。",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <NumericalInput {...field} ref={ref} value={value ?? ""} step={0.01} precision={2} />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_budget_duration"
                          label="默认预算周期"
                        >
                          {({ id, value, onChange }) => (
                            <BudgetDurationDropdown
                              id={id}
                              showNeverResets
                              placeholder="继承团队重置周期"
                              value={value === null ? NEVER_RESETS_BUDGET_DURATION : value}
                              onChange={(next) =>
                                onChange(next === NEVER_RESETS_BUDGET_DURATION ? null : next ?? undefined)
                              }
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_key_duration"
                          label={labelWithHint(
                            "默认 Key 时长（例如：1d、1mo）",
                            "限制 团队成员 Key 的有效时长。格式：30s（秒）、30m（分钟）、30h（小时）、30d（天）、1mo（月）",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <UIInput {...field} ref={ref} value={value ?? ""} placeholder="例如 30d" />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_tpm_limit"
                          label={labelWithHint(
                            "默认 TPM 上限",
                            "每个成员的默认每分钟 Token 数上限。可按成员覆盖。",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <NumericalInput
                              {...field}
                              ref={ref}
                              value={value ?? ""}
                              step={1}
                              placeholder="e.g., 1000"
                            />
                          )}
                        </FormField>
                        <FormField
                          control={form.control}
                          name="team_member_rpm_limit"
                          label={labelWithHint(
                            "默认 RPM 上限",
                            "每个成员的默认每分钟请求数上限。可按成员覆盖。",
                          )}
                        >
                          {({ ref, value, ...field }) => (
                            <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} placeholder="e.g., 100" />
                          )}
                        </FormField>
                        <Field>
                          <FieldLabel>
                            {labelWithHint(
                              "预算告警阈值",
                              "当成员消耗达到其团队成员预算的某一百分比时，向该成员发送邮件。成员本人始终会收到通知；可添加逗号分隔的邮箱以通知其他人。需要在代理上配置邮件告警。",
                            )}
                          </FieldLabel>
                          {memberBudgetAlertRows.map((row, index) => (
                            <div key={row.id} className="mb-2 flex items-start gap-2">
                              <FormField
                                control={form.control}
                                name={`team_member_max_budget_alert_emails.${index}.threshold`}
                                className="w-32"
                              >
                                {({ ref, value, onChange, ...field }) => (
                                  <NumericalInput
                                    {...field}
                                    ref={ref}
                                    value={value ?? ""}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                      onChange(event.target.value === "" ? null : Number(event.target.value))
                                    }
                                    placeholder="占预算的 %"
                                    min={1}
                                    max={100}
                                    step={1}
                                  />
                                )}
                              </FormField>
                              <FormField
                                control={form.control}
                                name={`team_member_max_budget_alert_emails.${index}.emails`}
                                className="flex-1"
                              >
                                {({ ref, value, ...field }) => (
                                  <UIInput
                                    {...field}
                                    ref={ref}
                                    value={value ?? ""}
                                    placeholder="其他收件人，如 finance@example.com"
                                  />
                                )}
                              </FormField>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="移除预算告警阈值"
                                className="mt-1 text-destructive"
                                onClick={() => removeMemberBudgetAlertRow(index)}
                              >
                                <CircleMinus className="size-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => appendMemberBudgetAlertRow({ threshold: null, emails: "" })}
                          >
                            <Plus className="size-4" />
                            添加预算告警阈值
                          </Button>
                        </Field>
                      </FieldGroup>
                    </CollapsibleContent>
                  </Collapsible>

                  <FormField control={form.control} name="budget_duration" label="重置预算">
                    {({ id, value, onChange }) => (
                      <BudgetDurationDropdown
                        id={id}
                        placeholder="永不重置"
                        value={value}
                        onChange={(next) => onChange(next ?? null)}
                      />
                    )}
                  </FormField>

                  <ModelMaxBudgetField
                    premiumUser={premiumUser}
                    value={teamModelMaxBudget}
                    onChange={setTeamModelMaxBudget}
                    availableModels={availableRateLimitModels}
                    usage={info.model_max_budget_usage}
                    hint="限制此团队在单个模型上的消耗，每个模型有独立的重置窗口。团队下的每个密钥共享该上限，除非密钥自己设置了该模型的预算。"
                  />

                  <FormField control={form.control} name="tpm_limit" label="每分钟 Token 数上限 (TPM)">
                    {({ ref, value, ...field }) => <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} />}
                  </FormField>

                  <FormField control={form.control} name="rpm_limit" label="每分钟请求数上限 (RPM)">
                    {({ ref, value, ...field }) => <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} />}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="tpd_limit"
                    label={labelWithHint(
                      "每日 Token 上限 (TPD)",
                      "批量提交（/v1/batches）的每日 Token 预算。设置后，批量输入文件按此 24 小时窗口计费，而非团队的 TPM/RPM 限制。在线请求仍使用 TPM/RPM。",
                    )}
                  >
                    {({ ref, value, ...field }) => <NumericalInput {...field} ref={ref} value={value ?? ""} step={1} />}
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
                      值以文本保存。如需具体类型，请Type JSON，例如 3、true 或 {'{"region": "us"}'}。
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>
                      {labelWithHint(
                        "按模型的速率限制",
                        "为整个团队设置按模型的 TPM/RPM 上限。",
                      )}
                    </FieldLabel>
                    {modelLimitRows.map((row, index) => (
                      <div key={row.id} className="mb-2 flex items-start gap-2">
                        <FormField control={form.control} name={`modelLimits.${index}.model`} className="min-w-60">
                          {({ id, value, onChange }) => (
                            <SearchSelect
                              inputId={id}
                              value={value ?? ""}
                              onValueChange={onChange}
                              options={availableRateLimitModels.map((model) => ({
                                label: model,
                                value: model,
                              }))}
                              placeholder="选择模型"
                            />
                          )}
                        </FormField>
                        <FormField control={form.control} name={`modelLimits.${index}.tpm`}>
                          {({ ref, value, onChange, ...field }) => (
                            <NumericalInput
                              {...field}
                              ref={ref}
                              value={value ?? ""}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange(event.target.value === "" ? null : Number(event.target.value))
                              }
                              placeholder="TPM 上限"
                              min={0}
                              step={1}
                            />
                          )}
                        </FormField>
                        <FormField control={form.control} name={`modelLimits.${index}.rpm`}>
                          {({ ref, value, onChange, ...field }) => (
                            <NumericalInput
                              {...field}
                              ref={ref}
                              value={value ?? ""}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange(event.target.value === "" ? null : Number(event.target.value))
                              }
                              placeholder="RPM 上限"
                              min={0}
                              step={1}
                            />
                          )}
                        </FormField>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="删除 Model 限制"
                          className="mt-1 text-destructive"
                          onClick={() => removeModelLimit(index)}
                        >
                          <CircleMinus className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => appendModelLimit({ model: "", tpm: null, rpm: null })}
                    >
                      <Plus className="size-4" />
                      添加模型限制
                    </Button>
                  </Field>

                  <FormField
                    control={form.control}
                    name="default_estimated_output_tokens"
                    label={labelWithHint("预估输出 Token 数", teamEstimateTooltip.estimate)}
                  >
                    {({ ref, value, ...field }) => (
                      <NumericalInput
                        {...field}
                        ref={ref}
                        value={value ?? ""}
                        min={1}
                        step={1}
                        disabled={!canEditTeamEstimates}
                      />
                    )}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="default_estimated_output_tokens_per_model"
                    label={labelWithHint("按 Model 预估输出 Token 数", teamEstimateTooltip.perModel)}
                  >
                    {({ ref, value, ...field }) => (
                      <Textarea
                        {...field}
                        ref={ref}
                        value={value ?? ""}
                        rows={4}
                        placeholder='{"gpt-4": 4096}'
                        disabled={!canEditTeamEstimates}
                      />
                    )}
                  </FormField>

                  <Field>
                    <FieldLabel>Router 设置</FieldLabel>
                    <RouterSettingsAccordion
                      ref={routerSettingsRef}
                      accessToken={accessToken || ""}
                      teamId={teamId}
                      value={info.router_settings ? { router_settings: info.router_settings } : undefined}
                    />
                  </Field>

                  <FormField
                    control={form.control}
                    name="guardrails"
                    label={labelWithDocsHint(
                      "护栏",
                      "选择应用于此团队的护栏。全局护栏默认启用，取消勾选即可退出。其他护栏为按需启用。",
                      "https://docs.litellm.ai/docs/proxy/guardrails/quick_start",
                    )}
                  >
                    {({ id, value, onChange }) => (
                      <GuardrailsSelect
                        id={id}
                        value={value ?? []}
                        onValueChange={onChange}
                        globalGuardrails={globalGuardrails.map((g) => ({
                          name: g.guardrail_name,
                          disabled: Boolean(killSwitchOn),
                        }))}
                        otherGuardrails={otherGuardrails.map((g) => ({
                          name: g.guardrail_name,
                          disabled: false,
                        }))}
                        globalGuardrailNames={globalGuardrailNames}
                      />
                    )}
                  </FormField>

                  {is_proxy_admin && (
                    <FormField
                      control={form.control}
                      name="disable_global_guardrails"
                      label={labelWithHint(
                        "禁用所有全局护栏",
                        "总开关：绕过此团队的所有全局护栏，包括未来新增的。如需按单个护栏退出，请使用上方的护栏下拉框。",
                      )}
                    >
                      {({ id, value, onChange }) => (
                        <Switch
                          id={id}
                          checked={value === true}
                          onCheckedChange={(checked) => {
                            onChange(checked);
                            applyKillSwitchToGuardrails(checked);
                          }}
                        />
                      )}
                    </FormField>
                  )}

                  {canViewPolicies && (
                    <FormField
                      control={form.control}
                      name="policies"
                      label={labelWithDocsHint(
                        "策略",
                        "将策略应用于此团队，以控制护栏和其他设置",
                        "https://docs.litellm.ai/docs/proxy/guardrails/guardrail_policies",
                      )}
                    >
                      {({ id, value, onChange }) => (
                        <TagsInput
                          id={id}
                          value={value ?? []}
                          onValueChange={onChange}
                          options={policiesList.map((name) => ({ value: name, label: name }))}
                          placeholder="选择或输入策略"
                        />
                      )}
                    </FormField>
                  )}

                  <FormField
                    control={form.control}
                    name="access_group_ids"
                    label={labelWithHint(
                      "访问组",
                      "为此团队分配访问组。访问组控制该团队可使用的模型、MCP 服务器与智能体。",
                    )}
                  >
                    {({ value, onChange }) => (
                      <AccessGroupSelector
                        value={value}
                        onChange={onChange}
                        placeholder="选择访问组（可选）"
                      />
                    )}
                  </FormField>

                  <FormField control={form.control} name="vector_stores" label="向量库">
                    {({ value, onChange }) => (
                      <VectorStoreSelector
                        onChange={onChange}
                        value={value}
                        accessToken={accessToken || ""}
                        placeholder="选择向量库"
                      />
                    )}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="allowed_passthrough_routes"
                    label={
                      !premiumUser
                        ? labelWithHint(
                            "允许的透传路由",
                            "Premium 功能 - 升级后可设置允许的透传路由",
                          )
                        : !is_proxy_admin
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
                        placeholder="选择透传路由"
                        disabled={!premiumUser || !is_proxy_admin}
                      />
                    )}
                  </FormField>

                  <FormField control={form.control} name="mcp_servers_and_groups" label="MCP 服务器 / 访问组">
                    {({ value, onChange }) => (
                      <MCPServerSelector
                        onChange={onChange}
                        value={value}
                        accessToken={accessToken || ""}
                        placeholder="选择 MCP 服务器或访问组（可选）"
                        allowAllProxyMcpServers={is_proxy_admin}
                      />
                    )}
                  </FormField>

                  <div className="mb-6">
                    <MCPToolPermissions
                      accessToken={accessToken || ""}
                      selectedServers={watchedMcpSelection?.servers || []}
                      selectedAccessGroups={watchedMcpSelection?.accessGroups || []}
                      selectedToolsets={watchedMcpSelection?.toolsets || []}
                      toolPermissions={watchedToolPermissions || {}}
                      onChange={(toolPerms) => form.setValue("mcp_tool_permissions", toolPerms)}
                    />
                  </div>

                  <FormField control={form.control} name="agents_and_groups" label="智能体 / 访问组">
                    {({ value, onChange }) => (
                      <AgentSelector
                        onChange={onChange}
                        value={value}
                        accessToken={accessToken || ""}
                        placeholder="选择智能体或访问组（可选）"
                      />
                    )}
                  </FormField>

                  <Collapsible
                    open={searchToolSettingsOpen}
                    onOpenChange={setSearchToolSettingsOpen}
                    className="mt-4 mb-4 overflow-hidden rounded-lg border"
                  >
                    <CollapsibleTrigger className="group/section flex w-full items-center justify-between px-4 py-3 text-left">
                      <b>搜索工具设置</b>
                      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <FormField
                        control={form.control}
                        name="object_permission_search_tools"
                        label={labelWithHint(
                          "允许的搜索工具",
                          "选择此 Team 可以访问的搜索工具。留空则允许所有搜索工具。",
                        )}
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

                  <FormField
                    control={form.control}
                    name="object_permission_skills"
                    label={labelWithHint(
                      "技能",
                      "已启用的技能对所有 Team 可见。在此将已禁用（私有）的 Claude Code 插件授予此 Team。",
                    )}
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

                  <FormField control={form.control} name="organization_id" label="组织">
                    {({ id, value, onChange }) => (
                      <SearchSelect
                        inputId={id}
                        value={value ?? ""}
                        onValueChange={onChange}
                        options={userOrganizations.map((org) => ({
                          value: org.organization_id ?? "",
                          label: org.organization_alias || org.organization_id || "",
                        }))}
                        placeholder="选择组织"
                        emptyText="没有匹配的组织"
                      />
                    )}
                  </FormField>

                  <FormField control={form.control} name="logging_settings" label="日志设置">
                    {({ value, onChange }) => (
                      <EditLoggingSettings value={(value as unknown[]) ?? []} onChange={onChange} />
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
                        rows={6}
                        placeholder='{"namespace": "admin", "mount": "secret", "path_prefix": "litellm"}'
                        disabled={!premiumUser}
                      />
                    )}
                  </FormField>
                </FieldGroup>

                <div className="sticky z-chrome -inset-x-6 -bottom-6 border-t border-border bg-card p-4 pr-0">
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isTeamSaving}>
                      取消
                    </Button>
                    <Button type="submit" disabled={isTeamSaving}>
                      {isTeamSaving ? <UiLoadingSpinner className="size-4" /> : <Save className="size-4" />}
                      保存更改
                    </Button>
                  </div>
                </div>
              </form>
            </TooltipProvider>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-medium">团队名称</p>
                <div>{info.team_alias}</div>
              </div>
              <div>
                <p className="font-medium">团队 ID</p>
                <div className="font-mono">{info.team_id}</div>
              </div>
              <div>
                <p className="font-medium">创建时间</p>
                <div>{new Date(info.created_at).toLocaleString()}</div>
              </div>
              <div>
                <p className="font-medium">模型</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {info.models.map((model, index) => (
                    <BadgeLink key={index} href={modelOrAccessGroupHref(model, accessGroupNames)}>
                      {model}
                    </BadgeLink>
                  ))}
                </div>
              </div>
              {info.default_team_member_models && info.default_team_member_models.length > 0 && (
                <div>
                  <p className="font-medium">默认成员 Models</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {info.default_team_member_models.map((model, index) => (
                      <BadgeLink key={index} href={modelOrAccessGroupHref(model, accessGroupNames)}>
                        {model}
                      </BadgeLink>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="font-medium">模型别名</p>
                {(() => {
                  const aliasEntries = Object.entries(info.litellm_model_table?.model_aliases ?? {});
                  if (aliasEntries.length === 0) {
                    return <div className="text-muted-foreground">未配置模型别名</div>;
                  }
                  return (
                    <div className="mt-1 space-y-1">
                      {aliasEntries.map(([alias, target]) => (
                        <div key={alias} className="text-sm">
                          <span className="font-mono">{alias}</span>
                          <span className="text-muted-foreground">{" -> "}</span>
                          <span className="font-mono">{target}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <p className="font-medium">速率限制</p>
                <div>TPM: {info.tpm_limit ?? "无限制"}</div>
                <div>RPM: {info.rpm_limit ?? "无限制"}</div>
                <div>TPD (batch): {info.tpd_limit ?? "无限制"}</div>
                {(() => {
                  const modelTpm = (info.metadata?.model_tpm_limit ?? {}) as Record<string, number>;
                  const modelRpm = (info.metadata?.model_rpm_limit ?? {}) as Record<string, number>;
                  const models = Array.from(new Set([...Object.keys(modelTpm), ...Object.keys(modelRpm)]));
                  if (models.length === 0) return null;
                  return (
                    <div className="mt-2">
                      <p className="text-muted-foreground">按 Model 限制：</p>
                      {models.map((m) => (
                        <div key={m} className="text-xs ml-2">
                          {m}: TPM {modelTpm[m] ?? "—"}, RPM {modelRpm[m] ?? "—"}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div>预估输出 Token：{info.metadata?.default_estimated_output_tokens ?? "默认"}</div>
                <div>
                  按模型预估输出 Token：{" "}
                  {info.metadata?.default_estimated_output_tokens_per_model
                    ? JSON.stringify(info.metadata.default_estimated_output_tokens_per_model)
                    : "默认"}
                </div>
              </div>
              <div>
                <p className="font-medium">团队预算</p>
                <div>
                  最大预算：{info.max_budget !== null ? `$${formatNumberWithCommas(info.max_budget, 4)}` : "无限制"}
                </div>
                <div>
                  软预算：{" "}
                  {info.soft_budget !== null && info.soft_budget !== undefined
                    ? `$${formatNumberWithCommas(info.soft_budget, 4)}`
                    : "无限制"}
                </div>
                <div>预算Reset:{info.budget_duration || "永不"}</div>
                {modelMaxBudgetToEntries(info.model_max_budget as ModelMaxBudget | null | undefined).map(
                  ({ model, budgetLimit, timePeriod }) => {
                    const spent = model === null ? undefined : info.model_max_budget_usage?.[model]?.current_spend;
                    return (
                      <div key={model}>
                        单模型预算（{model}）：每 {timePeriod} ${budgetLimit ?? "?"}
                        {spent !== undefined && `，已消耗 $${spent}`}
                      </div>
                    );
                  },
                )}
                {info.metadata?.soft_budget_alerting_emails &&
                  Array.isArray(info.metadata.soft_budget_alerting_emails) &&
                  info.metadata.soft_budget_alerting_emails.length > 0 && (
                    <div>软预算告警邮箱：{info.metadata.soft_budget_alerting_emails.join(", ")}</div>
                  )}
              </div>
              <div>
                <p className="font-medium">
                  团队成员设置{" "}
                  <SimpleTooltip content="这些限制作用于单个 团队成员">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </p>
                <div>最大预算：{info.team_member_budget_table?.max_budget ?? "无限制"}</div>
                <div>预算周期：{info.team_member_budget_table?.budget_duration || "无限制"}</div>
                <div>密钥时长：{info.metadata?.team_member_key_duration || "无限制"}</div>
                <div>TPM 上限：{info.team_member_budget_table?.tpm_limit ?? "无限制"}</div>
                <div>RPM 上限：{info.team_member_budget_table?.rpm_limit ?? "无限制"}</div>
                <div>预算告警阈值：{teamMemberBudgetAlertSummary(info.metadata).join("; ") || "无"}</div>
              </div>
              <div>
                <p className="font-medium">Router 设置</p>
                {info.router_settings &&
                Object.values(info.router_settings).some(
                  (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
                ) ? (
                  <div className="mt-1 space-y-1">
                    {info.router_settings.routing_strategy && (
                      <div>
                        Routing Strategy: <Badge variant="secondary">{info.router_settings.routing_strategy}</Badge>
                      </div>
                    )}
                    {info.router_settings.num_retries != null && (
                      <div>Number of Retries: {info.router_settings.num_retries}</div>
                    )}
                    {info.router_settings.allowed_fails != null && (
                      <div>Allowed Failures: {info.router_settings.allowed_fails}</div>
                    )}
                    {info.router_settings.cooldown_time != null && (
                      <div>Cooldown Time: {info.router_settings.cooldown_time}s</div>
                    )}
                    {info.router_settings.timeout != null && <div>Timeout: {info.router_settings.timeout}s</div>}
                    {info.router_settings.retry_after != null && (
                      <div>重试 After: {info.router_settings.retry_after}s</div>
                    )}
                    {info.router_settings.fallbacks &&
                      Array.isArray(info.router_settings.fallbacks) &&
                      info.router_settings.fallbacks.length > 0 && (
                        <div>Fallbacks: {info.router_settings.fallbacks.length} configured</div>
                      )}
                    {info.router_settings.enable_tag_filtering && <div>Tag 过滤：已启用</div>}
                  </div>
                ) : (
                  <div className="text-muted-foreground">未配置 Router 设置</div>
                )}
              </div>
              <div>
                <p className="font-medium">组织 ID</p>
                <div>{info.organization_id}</div>
              </div>
              <div>
                <p className="font-medium">状态</p>
                <Badge variant={info.blocked ? "destructive" : "secondary"}>
                  {info.blocked ? "已封禁" : "活跃"}
                </Badge>
              </div>

              <ObjectPermissionsView
                objectPermission={info.object_permission}
                inheritedMcpServers={inheritedMcpServers}
                inheritedAgents={inheritedAgents}
                variant="inline"
                className="pt-4 border-t border-border"
                accessToken={accessToken}
              />

              <GuardrailSettingsView
                globalGuardrailNames={globalGuardrailNames}
                teamGuardrails={Array.isArray(info.metadata?.guardrails) ? info.metadata.guardrails : []}
                optedOutGlobalGuardrails={
                  Array.isArray(info.metadata?.opted_out_global_guardrails)
                    ? info.metadata.opted_out_global_guardrails
                    : []
                }
                killSwitchOn={initialKillSwitchOn}
                variant="inline"
                className="pt-4 border-t border-border"
              />

              <LoggingSettingsView
                loggingConfigs={info.metadata?.logging || []}
                disabledCallbacks={[]}
                variant="inline"
                className="pt-4 border-t border-border"
              />

              {info.metadata?.secret_manager_settings && (
                <div className="pt-4 border-t border-border">
                  <p className="font-medium">Secret Manager 设置</p>
                  <pre className="mt-2 bg-muted p-3 rounded-sm text-xs overflow-x-auto">
                    {JSON.stringify(info.metadata.secret_manager_settings, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Card>
      ),
    },
  ].filter((tab) => visibleTabs.includes(tab.key));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="ghost" onClick={onClose} className="mb-4">
            <ArrowLeftIcon className="h-4 w-4" />
            返回团队
          </Button>
          <h1 className="text-2xl font-semibold">{info.team_alias}</h1>
          <div className="flex items-center">
            <p className="text-sm text-muted-foreground font-mono">{info.team_id}</p>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(info.team_id, "team-id")}
              className={`left-2 z-raised transition-all duration-200 ${
                copiedStates["team-id"]
                  ? "text-success bg-success/10 border-success/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {copiedStates["team-id"] ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTabKey} className="mb-4" onValueChange={onTabChange}>
        <TabsList variant="line" className="mb-4 h-auto w-full justify-start rounded-none border-b p-0">
          {tabItems.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="flex-none rounded-none px-4 py-2">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabItems.map(({ key, children }) => (
          <TabsContent key={key} value={key} keepMounted={hasVisited(key)}>
            {children}
          </TabsContent>
        ))}
      </Tabs>

      <MemberModal
        visible={isEditMemberModalVisible}
        onCancel={() => setIsEditMemberModalVisible(false)}
        onSubmit={handleMemberUpdate}
        initialData={selectedEditMember}
        mode="edit"
        config={{
          title: "编辑成员",
          showEmail: true,
          showUserId: true,
          roleOptions: [
            { label: "管理员", value: "admin" },
            { label: "用户", value: "user" },
          ],
          additionalFields: [
            {
              name: "max_budget_in_team",
              label: (
                <span>
                  团队成员预算 (USD){" "}
                  <SimpleTooltip content="该成员在此 Team 内可花费的最大金额（USD）。这与任何全局用户 Budget 限制相互独立">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "numerical" as const,
              step: 0.01,
              min: 0,
              placeholder: "该成员在此 Team 内的 预算上限",
            },
            {
              name: "budget_duration",
              label: (
                <span>
                  预算重置周期{" "}
                  <SimpleTooltip content="该成员在 Team 内的 预算重置频率。不设置则 Budget 永不重置。">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "budget-duration" as const,
            },
            {
              name: "temp_budget_increase",
              label: (
                <span>
                  临时预算增加 (USD){" "}
                  <SimpleTooltip content="在下方到期时间之前，在 团队成员 Budget 之上额外增加的 USD 额度。永久 Budget 保持不变，增加额在到期后停止生效。">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "numerical" as const,
              step: 0.01,
              min: 0,
              placeholder: "到期前该成员的额外 Budget",
            },
            {
              name: "temp_budget_expiry",
              label: (
                <span>
                  临时预算到期 (UTC){" "}
                  <SimpleTooltip content="临时 Budget 增加额停止生效的时间。设置了临时 Budget 增加额时必填。">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "utc-datetime" as const,
            },
            {
              name: "tpm_limit",
              label: (
                <span>
                  团队成员 TPM 上限{" "}
                  <SimpleTooltip content="该成员在此 Team 内每分钟可使用的最大 Token 数。这与任何全局用户 TPM 限制相互独立">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "numerical" as const,
              step: 1,
              min: 0,
              placeholder: "该成员在此 Team 内的每分钟 Token 数上限",
            },
            {
              name: "rpm_limit",
              label: (
                <span>
                  团队成员 RPM 上限{" "}
                  <SimpleTooltip content="该成员在此 Team 内每分钟可发起的最大请求数。这与任何全局用户 RPM 限制相互独立">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "numerical" as const,
              step: 1,
              min: 0,
              placeholder: "该成员在此 Team 内的每分钟请求数上限",
            },
            {
              name: "allowed_models",
              label: (
                <span>
                  允许的模型{" "}
                  <SimpleTooltip content="该成员在此 Team 内可访问的 Models。留空则继承所有团队模型。">
                    <Info className="ml-1 inline size-3.5 align-text-bottom" />
                  </SimpleTooltip>
                </span>
              ),
              type: "multi-select" as const,
              options: (info.models || []).map((m: string) => ({ label: m, value: m })),
              placeholder: "留空则继承所有团队模型",
            },
          ],
        }}
      />

      <UserSearchModal
        isVisible={isAddMemberModalVisible}
        onCancel={() => setIsAddMemberModalVisible(false)}
        onSubmit={handleMemberCreate}
        accessToken={accessToken}
        teamId={teamId}
      />

      {/* Delete Member Confirmation Modal */}
      <DeleteResourceModal
        isOpen={isDeleteModalOpen}
        title="删除团队 成员"
        alertMessage="移除 团队成员时，也会删除由该成员创建或为该成员创建的所有 Key。"
        message="确定要将该成员从团队中移除吗？此操作不可撤销。"
        resourceInformationTitle="团队成员信息"
        resourceInformation={[
          { label: "用户 ID", value: memberToDelete?.user_id, code: true },
          { label: "邮箱", value: memberToDelete?.user_email },
          { label: "角色", value: memberToDelete?.role },
        ]}
        onCancel={handleDeleteCancel}
        onOk={handleDeleteConfirm}
        confirmLoading={isDeleting}
      />

      <ResetMemberBudgetsDialog
        state={memberBudgetReset.state}
        onReset={memberBudgetReset.reset}
        onRetry={memberBudgetReset.retry}
        onKeep={memberBudgetReset.keepCustom}
        onDismiss={memberBudgetReset.dismiss}
      />
    </div>
  );
};

export default TeamInfoView;
