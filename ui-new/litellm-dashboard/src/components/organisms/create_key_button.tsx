"use client";
import { keyKeys } from "@/app/(dashboard)/hooks/keys/useKeys";
import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import { useProjects } from "@/app/(dashboard)/hooks/projects/useProjects";
import { useTags } from "@/app/(dashboard)/hooks/tags/useTags";
import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useCan from "@/app/(dashboard)/hooks/useCan";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect, type MultiSelectOption } from "@/components/shared/MultiSelect";
import { PaginatedSearchSelect } from "@/components/shared/PaginatedSearchSelect";
import { SearchSelect, type SearchSelectOption } from "@/components/shared/SearchSelect";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { ChevronDown, Info } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { type Control, useForm, useWatch, type UseFormSetValue } from "react-hook-form";
import { isProxyAdminRole, rolesWithWriteAccess } from "../../utils/roles";
import AgentSelector from "../agent_management/AgentSelector";
import SkillSelector from "../skills/SkillSelector";
import AccessGroupSelector from "../common_components/AccessGroupSelector";
import BudgetDurationDropdown from "../common_components/budget_duration_dropdown";
import SchemaFormFields from "../common_components/check_openapi_schema";
import KeyLifecycleSettings from "../common_components/KeyLifecycleSettings";
import ModelAliasManager from "../common_components/ModelAliasManager";
import {
  MountedFormField,
  MountedFormProvider,
  projectMountedValues,
  useMountRegistry,
  type MountedFormValues,
} from "../common_components/MountedFormField";
import PassThroughRoutesSelector from "../common_components/PassThroughRoutesSelector";
import PremiumLoggingSettings from "../common_components/PremiumLoggingSettings";
import RateLimitTypeFormItem from "../common_components/RateLimitTypeFormItem";
import RouterSettingsAccordion, {
  RouterSettingsAccordionRef,
  RouterSettingsAccordionValue,
} from "../common_components/RouterSettingsAccordion";
import TeamDropdown from "../common_components/team_dropdown";
import OrganizationDropdown from "../common_components/OrganizationDropdown";
import ProjectDropdown from "../common_components/ProjectDropdown";
import { CreateUserButton } from "../CreateUserButton";
import { BudgetFallbacksEditor } from "../key_team_helpers/BudgetFallbacksEditor";
import { END_USER_BUDGET_HINT, EndUserBudgetSelect } from "../key_team_helpers/EndUserBudgetSelect";
import { BudgetWindowEntry, BudgetWindowsEditor } from "../key_team_helpers/BudgetWindowsEditor";
import { ModelMaxBudget, ModelMaxBudgetEditor } from "../key_team_helpers/ModelMaxBudgetEditor";
import { TagRateLimitEditor, TagRateLimitEntry } from "../key_team_helpers/TagRateLimitEditor";
import {
  excludeProxyWideSentinel,
  getModelDisplayName,
  hasAllModelsSentinel,
} from "../key_team_helpers/fetch_available_models_team_key";
import { Team } from "../key_team_helpers/key_list";
import MCPServerSelector from "../mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "../mcp_server_management/MCPToolPermissions";
import { toast } from "@/lib/toast";
import {
  getAgentsList,
  getGuardrailsList,
  getPoliciesList,
  getPossibleUserRoles,
  getPromptsList,
  keyCreateCall,
  keyCreateServiceAccountCall,
  modelAvailableCall,
  proxyBaseUrl,
  userFilterUICall,
} from "../networking";
import CreatedKeyDisplay from "../shared/CreatedKeyDisplay";
import NumericalInput from "../shared/numerical_input";
import VectorStoreSelector from "../vector_store_management/VectorStoreSelector";
import { buildKeyCreatePayload, type KeyCreateInput } from "./createKeyPayload";
import { simplifyKeyGenerateError } from "./utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY_TYPE_OPTIONS = [
  { value: "llm_api", label: "AI API", hint: "仅可调用 AI API 路由（chat/completions、embeddings 等）" },
  { value: "management", label: "管理", hint: "仅可调用管理路由（用户、团队、密钥管理等）" },
  { value: "default", label: "完全访问", hint: "可调用所有路由（AI API、管理及只读）" },
];

const KEY_OWNER_LABEL_CLASS = "flex items-center gap-2 text-sm font-normal text-foreground";

const SECTION_HEADER_CLASS = "group/section flex w-full items-center justify-between px-4 py-3 text-left";
const SECTION_CHEVRON_CLASS =
  "size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section:rotate-180";

type FieldWrite = (value: unknown) => void;

type McpSelectorValue = { servers: string[]; accessGroups: string[]; toolsets?: string[] };

type AgentSelectorValue = { agents: string[]; accessGroups: string[] };

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "";

const requiredRule = (required: boolean, message: string) => ({
  validate: (value: unknown) => (required && isBlank(value) ? message : true),
});

const ceilingRule = (ceiling: number | null | undefined, message: (limit: number) => string) => ({
  validate: (value: unknown) =>
    value && ceiling !== null && ceiling !== undefined && (value as number) > ceiling ? message(ceiling) : true,
});

interface McpToolPermissionsFieldProps {
  readonly accessToken: string;
  readonly control: Control<MountedFormValues>;
  readonly setValue: UseFormSetValue<MountedFormValues>;
}

const McpToolPermissionsField: React.FC<McpToolPermissionsFieldProps> = ({ accessToken, control, setValue }) => {
  const selection = useWatch({ control, name: "allowed_mcp_servers_and_groups" }) as
    | { servers?: string[]; accessGroups?: string[]; toolsets?: string[] }
    | undefined;
  const toolPermissions = useWatch({ control, name: "mcp_tool_permissions" }) as Record<string, string[]> | undefined;

  return (
    <div className="mt-6">
      <MCPToolPermissions
        accessToken={accessToken}
        selectedServers={selection?.servers || []}
        selectedAccessGroups={selection?.accessGroups || []}
        selectedToolsets={selection?.toolsets || []}
        toolPermissions={toolPermissions || {}}
        onChange={(toolPerms) => setValue("mcp_tool_permissions", toolPerms)}
      />
    </div>
  );
};

/**
 * Interface for pre-filling the create key form from URL parameters
 */
export interface CreateKeyPrefillData {
  owned_by?: "you" | "service_account" | "another_user";
  team_id?: string;
  key_alias?: string;
  models?: string[];
  key_type?: "default" | "llm_api" | "management";
}

interface CreateKeyProps {
  team: Team | null;
  data: any[] | null;
  teams: Team[] | null;
  addKey: (data: any) => void;
  autoOpenCreate?: boolean;
  prefillData?: CreateKeyPrefillData;
}

interface User {
  user_id: string;
  user_email: string | null;
  role?: string;
}

export const fetchTeamModels = async (
  userID: string,
  userRole: string,
  accessToken: string,
  teamID: string | null,
): Promise<string[]> => {
  try {
    if (userID === null || userRole === null) {
      return [];
    }

    if (accessToken !== null) {
      const model_available = await modelAvailableCall(accessToken, userID, userRole, true, teamID, true);
      let available_model_names = model_available["data"].map((element: { id: string }) => element.id);
      return available_model_names;
    }
    return [];
  } catch (error) {
    console.error("Error fetching user models:", error);
    return [];
  }
};

export const fetchUserModels = async (
  userID: string,
  userRole: string,
  accessToken: string,
  setUserModels: (models: string[]) => void,
) => {
  try {
    if (userID === null || userRole === null) {
      return;
    }

    if (accessToken !== null) {
      const model_available = await modelAvailableCall(accessToken, userID, userRole);
      let available_model_names = model_available["data"].map((element: { id: string }) => element.id);
      setUserModels(available_model_names);
    }
  } catch (error) {
    console.error("Error fetching user models:", error);
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * @deprecated
 * This component is being DEPRECATED in favor of src/app/(dashboard)/virtual-keys/components/CreateKey.tsx
 * Please contribute to the new refactor.
 * ─────────────────────────────────────────────────────────────────────────
 */
const CreateKey: React.FC<CreateKeyProps> = ({ team, teams, data, addKey, autoOpenCreate, prefillData }) => {
  const { accessToken, userId: userID, userRole, premiumUser } = useAuthorized();
  const canEditGuardrails = premiumUser || (userRole != null && rolesWithWriteAccess.includes(userRole));
  const canViewPolicies = useCan("viewPolicies");
  const canViewPrompts = useCan("viewPrompts");
  const { data: organizations, isLoading: isOrganizationsLoading } = useOrganizations();
  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const { data: uiSettingsData } = useUISettings();
  const { data: tagsData } = useTags();
  const enableProjectsUI = Boolean(uiSettingsData?.values?.enable_projects_ui);
  const disableCustomApiKeys = Boolean(uiSettingsData?.values?.disable_custom_api_keys);
  const tagOptions = tagsData ? Object.values(tagsData).map((tag) => ({ value: tag.name, label: tag.name })) : [];
  const queryClient = useQueryClient();
  const [formDefaults] = useState<MountedFormValues>(() => ({
    team_id: team ? team.team_id : null,
    key_type: "llm_api",
    tpm_limit_type: null,
    rpm_limit_type: null,
    mcp_tool_permissions: {},
    duration: "",
  }));
  const form = useForm<MountedFormValues>({
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: formDefaults,
  });
  const registry = useMountRegistry();
  const mountedForm = useMemo(() => ({ control: form.control, registry }), [form.control, registry]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [userModels, setUserModels] = useState<string[]>([]);
  const [modelsToPick, setModelsToPick] = useState<string[]>([]);
  const [keyOwner, setKeyOwner] = useState("you");
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [pendingPrefillModels, setPendingPrefillModels] = useState<string[] | null>(null);
  const [guardrailsList, setGuardrailsList] = useState<string[]>([]);
  const [policiesList, setPoliciesList] = useState<string[]>([]);
  const [promptsList, setPromptsList] = useState<string[]>([]);
  const [loggingSettings, setLoggingSettings] = useState<any[]>([]);
  const [selectedCreateKeyTeam, setSelectedCreateKeyTeam] = useState<Team | null>(team);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [possibleUIRoles, setPossibleUIRoles] = useState<Record<string, Record<string, string>>>({});
  const [userOptions, setUserOptions] = useState<SearchSelectOption[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const latestUserSearchRef = useRef(0);
  const [disabledCallbacks, setDisabledCallbacks] = useState<string[]>([]);
  const [keyType, setKeyType] = useState<string>("llm_api");
  const [modelAliases, setModelAliases] = useState<{ [key: string]: string }>({});
  const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(false);
  const [rotationInterval, setRotationInterval] = useState<string>("30d");
  const [routerSettings, setRouterSettings] = useState<RouterSettingsAccordionValue | null>(null);
  const routerSettingsRef = useRef<RouterSettingsAccordionRef>(null);
  const [budgetLimits, setBudgetLimits] = useState<BudgetWindowEntry[]>([]);
  const [modelMaxBudget, setModelMaxBudget] = useState<ModelMaxBudget>({});
  const [tagRateLimits, setTagRateLimits] = useState<TagRateLimitEntry[]>([]);
  const [budgetFallbacks, setBudgetFallbacks] = useState<Record<string, string[]>>({});
  const [budgetFallbacksKey, setBudgetFallbacksKey] = useState<number>(0);
  const [routerSettingsKey, setRouterSettingsKey] = useState<number>(0);
  const [agentsList, setAgentsList] = useState<{ agent_id: string; agent_name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedModels: string[] = (useWatch({ control: form.control, name: "models" }) as string[] | undefined) ?? [];
  const handleCancel = () => {
    setIsModalVisible(false);
    setApiKey(null);
    setSelectedCreateKeyTeam(null);
    form.reset(formDefaults);
    setLoggingSettings([]);
    setDisabledCallbacks([]);
    setKeyType("llm_api");
    setModelAliases({});
    setAutoRotationEnabled(false);
    setRotationInterval("30d");
    setRouterSettings(null);
    setRouterSettingsKey((prev) => prev + 1);
    setSelectedAgentId(null);
    setSelectedOrganizationId(null);
    setSelectedProjectId(null);
    setBudgetLimits([]);
    setTagRateLimits([]);
    setBudgetFallbacks({});
    setBudgetFallbacksKey((k) => k + 1);
  };

  useEffect(() => {
    if (userID && userRole && accessToken) {
      fetchUserModels(userID, userRole, accessToken, setUserModels);
    }
  }, [accessToken, userID, userRole]);

  useEffect(() => {
    if (accessToken) {
      getAgentsList(accessToken)
        .then((res) => setAgentsList(res?.agents || []))
        .catch(() => setAgentsList([]));
    }
  }, [accessToken]);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const response = await getGuardrailsList(accessToken);
        const guardrailNames = response.guardrails.map((g: { guardrail_name: string }) => g.guardrail_name);
        setGuardrailsList(guardrailNames);
      } catch (error) {
        console.error("Failed to fetch guardrails:", error);
      }
    };

    const fetchPolicies = async () => {
      try {
        const response = await getPoliciesList(accessToken);
        const policyNames = response.policies.map((p: { policy_name: string }) => p.policy_name);
        setPoliciesList(policyNames);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      }
    };

    const fetchPrompts = async () => {
      try {
        const response = await getPromptsList(accessToken);
        setPromptsList(Array.from(new Set(response.prompts.map((prompt) => prompt.prompt_id))));
      } catch (error) {
        console.error("Failed to fetch prompts:", error);
      }
    };

    fetchGuardrails();
    if (canViewPolicies) fetchPolicies();
    if (canViewPrompts) fetchPrompts();
  }, [accessToken, canViewPolicies, canViewPrompts]);

  // Fetch possible user roles when component mounts
  useEffect(() => {
    const fetchPossibleRoles = async () => {
      try {
        if (accessToken) {
          // Check if roles are cached in session storage
          const cachedRoles = sessionStorage.getItem("possibleUserRoles");
          if (cachedRoles) {
            setPossibleUIRoles(JSON.parse(cachedRoles));
          } else {
            const availableUserRoles = await getPossibleUserRoles(accessToken);
            sessionStorage.setItem("possibleUserRoles", JSON.stringify(availableUserRoles));
            setPossibleUIRoles(availableUserRoles);
          }
        }
      } catch (error) {
        console.error("Error fetching possible user roles:", error);
      }
    };

    fetchPossibleRoles();
  }, [accessToken]);

  // Auto-open modal and prefill form from URL params (deep link).
  // Guarded by write access so we don't open for read-only users.
  useEffect(() => {
    if (autoOpenCreate && !hasPrefilled && teams && userRole && rolesWithWriteAccess.includes(userRole)) {
      // Open the modal
      setIsModalVisible(true);
      setHasPrefilled(true);

      // Apply prefill data if provided
      if (prefillData) {
        // Set key owner (owned_by) - validate that "another_user" is only allowed for Admin
        if (prefillData.owned_by) {
          if (prefillData.owned_by === "another_user" && userRole !== "Admin") {
            // Ignore invalid owned_by for non-admin users, fall back to default
            setKeyOwner("you");
          } else {
            setKeyOwner(prefillData.owned_by);
          }
        }

        // Set team - find the team by ID and set it (only if team exists in user's teams)
        if (prefillData.team_id) {
          const selectedTeam = teams?.find((t) => t.team_id === prefillData.team_id) || null;
          if (selectedTeam) {
            setSelectedCreateKeyTeam(selectedTeam);
            form.setValue("team_id", prefillData.team_id);
          }
          // Silently ignore invalid team_id - don't prefill with a team user doesn't have access to
        }

        // Set key alias
        if (prefillData.key_alias) {
          form.setValue("key_alias", prefillData.key_alias);
        }

        // Defer model selection until we load the allowed model list.
        if (prefillData.models && prefillData.models.length > 0) {
          setPendingPrefillModels(prefillData.models);
        }

        // Set key type
        if (prefillData.key_type) {
          setKeyType(prefillData.key_type);
          form.setValue("key_type", prefillData.key_type);
        }
      }
    }
  }, [autoOpenCreate, prefillData, teams, hasPrefilled, form, userRole]);

  // Check if team selection is required
  const isTeamSelectionRequired = modelsToPick.includes("no-default-models");
  const isFormDisabled = isTeamSelectionRequired && !selectedCreateKeyTeam;

  const handleCreate = async (formValues: MountedFormValues) => {
    try {
      const input: KeyCreateInput = {
        formValues,
        existingKeys: data,
        keyOwner,
        userID,
        selectedAgentId,
        loggingSettings,
        disabledCallbacks,
        autoRotationEnabled,
        rotationInterval,
        modelAliases,
        routerSettings: routerSettingsRef.current?.getValue() ?? routerSettings,
        budgetLimits,
        modelMaxBudget,
        tagRateLimits,
        budgetFallbacks,
      };
      const built = buildKeyCreatePayload(input);
      if (built.kind === "duplicate_alias") {
        throw new Error(
          `密钥别名 ${built.alias} 在 Team（ID：${built.teamId}）中已存在，请更换 密钥别名`,
        );
      }

      toast.info("正在调用 API");
      setIsModalVisible(true);

      if (built.kind === "agent_not_selected") {
        toast.fromError("请选择 Agent");
        return;
      }
      const { payload, endpoint } = built;

      const response =
        endpoint === "service_account"
          ? await keyCreateServiceAccountCall(accessToken, payload)
          : await keyCreateCall(accessToken, userID, payload);

      // Add the data to the state in the parent component
      // Also directly update the keys list in VirtualKeysTable without an API call
      addKey(response);

      // Invalidate and refetch all keys list queries to update the table
      // This will trigger a refetch of all key list queries regardless of pagination
      queryClient.invalidateQueries({ queryKey: keyKeys.lists() });

      setApiKey(response["key"]);
      toast.success("Virtual Key 已创建");
      form.reset(formDefaults);
      setBudgetLimits([]);
      setTagRateLimits([]);
      setBudgetFallbacks({});
      setBudgetFallbacksKey((k) => k + 1);
      localStorage.removeItem("userData" + userID);
    } catch (error) {
      const simplifiedError = simplifyKeyGenerateError(error);
      toast.fromError(simplifiedError);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    void form.handleSubmit(() => handleCreate(projectMountedValues(registry, form.getValues)))(event);

  // Fetch available models when team or auth changes.
  // Note: Model prefill from URL params is handled by the useEffect below, which
  // watches for pendingPrefillModels + modelsToPick to both be populated.
  useEffect(() => {
    if (selectedProjectId) {
      // When a project is selected, use the project's models
      const project = projects?.find((p) => p.project_id === selectedProjectId);
      const projectModels = project?.models ?? [];
      setModelsToPick(projectModels);
      form.setValue("models", []);
      return;
    }
    if (userID && userRole && accessToken) {
      fetchTeamModels(userID, userRole, accessToken, selectedCreateKeyTeam?.team_id ?? null).then((models) => {
        const allModels = excludeProxyWideSentinel(
          Array.from(new Set([...(selectedCreateKeyTeam?.models ?? []), ...models])),
        );
        setModelsToPick(allModels);
      });
    }
    // Only clear models if we don't have pending prefill models
    if (!pendingPrefillModels) {
      form.setValue("models", []);
    }
    // Clear MCP server selection when team changes (available servers may differ)
    form.setValue("allowed_mcp_servers_and_groups", { servers: [], accessGroups: [] });
  }, [selectedCreateKeyTeam, selectedProjectId, accessToken, userID, userRole, form]);

  // Apply deferred model prefill once the available model list arrives.
  // This handles timing where prefill data arrives before or after models are fetched.
  useEffect(() => {
    if (!pendingPrefillModels || pendingPrefillModels.length === 0) {
      return;
    }
    if (!modelsToPick || modelsToPick.length === 0) {
      return;
    }

    const validModels = pendingPrefillModels.filter((model) => modelsToPick.includes(model));
    if (validModels.length > 0) {
      form.setValue("models", validModels);
    }
    setPendingPrefillModels(null);
  }, [pendingPrefillModels, modelsToPick, form]);

  // Sync team when project is selected but teams loaded later (race condition)
  useEffect(() => {
    if (!selectedProjectId || !teams) return;
    const project = projects?.find((p) => p.project_id === selectedProjectId);
    if (!project?.team_id) return;
    // If team is already set correctly, skip
    if (selectedCreateKeyTeam?.team_id === project.team_id) return;
    const projectTeam = teams.find((t) => t.team_id === project.team_id) || null;
    if (projectTeam) {
      setSelectedCreateKeyTeam(projectTeam);
      form.setValue("team_id", projectTeam.team_id);
    }
  }, [teams, selectedProjectId, projects]);

  // Add a callback function to handle user creation
  const handleUserCreated = (userId: string) => {
    form.setValue("user_id", userId);
    setIsCreateUserModalVisible(false);
  };

  const fetchUsers = async (searchText: string): Promise<void> => {
    const searchId = latestUserSearchRef.current + 1;
    latestUserSearchRef.current = searchId;
    const isLatestSearch = (): boolean => searchId === latestUserSearchRef.current;

    if (!searchText) {
      setUserOptions([]);
      setUserSearchLoading(false);
      return;
    }

    setUserSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("search", searchText);
      if (accessToken == null) {
        return;
      }
      const response = await userFilterUICall(accessToken, params);
      if (!isLatestSearch()) return;

      const data: User[] = response;
      const options: SearchSelectOption[] = data.map((user) => ({
        label: user.user_email ? `${user.user_email} (${user.user_id})` : user.user_id,
        value: user.user_id,
      }));

      setUserOptions(options);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (isLatestSearch()) toast.fromError("搜索用户失败");
    } finally {
      if (isLatestSearch()) setUserSearchLoading(false);
    }
  };

  const changeOrganization = (write: FieldWrite) => (orgId: string | null) => {
    write(orgId);
    setSelectedOrganizationId(orgId);
    // Clear team and project when org changes
    setSelectedCreateKeyTeam(null);
    setSelectedProjectId(null);
    form.setValue("team_id", null);
    form.setValue("project_id", null);
  };

  const selectTeam = (team: Team | null) => {
    setSelectedCreateKeyTeam(team);
    setSelectedProjectId(null);
    form.setValue("project_id", null);
    // Auto-populate org from team for non-admin users
    if (team?.organization_id) {
      setSelectedOrganizationId(team.organization_id);
      form.setValue("organization_id", team.organization_id);
    } else if (!team) {
      setSelectedOrganizationId(null);
      form.setValue("organization_id", null);
    }
  };

  const changeProject = (write: FieldWrite) => (projectId: string | null) => {
    write(projectId);
    if (!projectId) {
      setSelectedProjectId(null);
      setSelectedCreateKeyTeam(null);
      form.setValue("team_id", null);
      return;
    }
    setSelectedProjectId(projectId);
  };

  const modelOptions: MultiSelectOption[] = [
    ...(selectedProjectId === null && selectedCreateKeyTeam
      ? [{ value: "all-team-models", label: "所有团队模型" }]
      : []),
    ...(selectedProjectId === null && !selectedCreateKeyTeam
      ? [{ value: "all-proxy-models", label: "所有代理模型" }]
      : []),
    ...modelsToPick.map((model) => ({
      value: model,
      label: getModelDisplayName(model),
      disabled: hasAllModelsSentinel(selectedModels),
    })),
  ];

  const changeKeyType = (write: FieldWrite) => (value: string) => {
    write(value);
    setKeyType(value);
    // Clear models field and disable if management or read_only
    if (value === "management" || value === "read_only") {
      form.setValue("models", []);
    }
  };

  return (
    <div>
      {userRole && rolesWithWriteAccess.includes(userRole) && (
        <Button className="mx-auto" onClick={() => setIsModalVisible(true)} data-testid="create-key-button">
          + 新建密钥
        </Button>
      )}
      <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">新建密钥</DialogTitle>
          </DialogHeader>
          <MountedFormProvider value={mountedForm}>
            <form onSubmit={handleSubmit}>
              {/* Section 1: Key Ownership */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-foreground mb-4">密钥归属</h3>
                <Field className="mb-4">
                  <FieldLabel>
                    <span>
                      归属方{" "}
                      <SimpleTooltip content="选择此 Virtual Key 的归属方">
                        <Info className="ml-1 inline size-3.5 align-text-bottom" />
                      </SimpleTooltip>
                    </span>
                  </FieldLabel>
                  <RadioGroup
                    className="flex flex-wrap items-center gap-4"
                    value={keyOwner}
                    onValueChange={(value: unknown) => setKeyOwner(String(value))}
                  >
                    <label className={KEY_OWNER_LABEL_CLASS}>
                      <RadioGroupItem value="you" />
                      你
                    </label>
                    <label className={KEY_OWNER_LABEL_CLASS}>
                      <RadioGroupItem value="service_account" />
                      服务账号
                    </label>
                    {userRole === "Admin" && (
                      <label className={KEY_OWNER_LABEL_CLASS}>
                        <RadioGroupItem value="another_user" />
                        其他用户
                      </label>
                    )}
                    <label className={KEY_OWNER_LABEL_CLASS}>
                      <RadioGroupItem value="agent" />
                      Agent <Badge>新</Badge>
                    </label>
                  </RadioGroup>
                </Field>

                {keyOwner === "another_user" && (
                  <MountedFormField
                    label={
                      <span>
                        User ID{" "}
                        <SimpleTooltip content="拥有此 Key 并负责其用量的用户">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="user_id"
                    className="mt-4"
                    required
                    rules={requiredRule(
                      keyOwner === "another_user",
                      `请输入要分配此 Key 的用户 ID`,
                    )}
                  >
                    {(control) => (
                      <div>
                        <div className="mb-2 flex">
                          <PaginatedSearchSelect
                            options={userOptions}
                            value={typeof control.value === "string" ? control.value : undefined}
                            onValueChange={control.onChange}
                            onSearchChange={fetchUsers}
                            isLoading={userSearchLoading}
                            placeholder="输入邮箱或用户 ID 搜索用户"
                            emptyText="未找到用户"
                            loadingText="搜索中…"
                            inputId={control.id}
                            aria-required={control["aria-required"] === "true" ? true : undefined}
                            aria-invalid={control["aria-invalid"] === "true" ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                          <Button variant="outline" className="ml-2" onClick={() => setIsCreateUserModalVisible(true)}>
                            新建用户
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">按邮箱或 User ID 搜索用户</div>
                      </div>
                    )}
                  </MountedFormField>
                )}
                {keyOwner === "agent" && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md dark:bg-purple-950 dark:border-purple-800">
                    <div className="mb-3">
                      <label htmlFor="create-key-agent" className="text-sm font-medium text-foreground">
                        选择 Agent <span className="text-destructive">*</span>
                      </label>
                    </div>
                    <SearchSelect
                      inputId="create-key-agent"
                      placeholder="选择 Agent"
                      emptyText="未找到 Agent"
                      value={selectedAgentId}
                      onValueChange={setSelectedAgentId}
                      options={agentsList.map((a) => ({
                        label: a.agent_name || a.agent_id,
                        value: a.agent_id,
                      }))}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      此 Key 将由所选 Agent 用于向 LiteLLM 发起请求
                    </div>
                  </div>
                )}
                <MountedFormField
                  label={
                    <span>
                      Organization{" "}
                      <SimpleTooltip content="此 Key 所属的 Organization。选择 Organization 后会筛选可用的 Team。">
                        <Info className="ml-1 inline size-3.5 align-text-bottom" />
                      </SimpleTooltip>
                    </span>
                  }
                  name="organization_id"
                  className="mt-4"
                >
                  {(control) => (
                    <OrganizationDropdown
                      id={control.id}
                      value={typeof control.value === "string" ? control.value : null}
                      organizations={organizations}
                      loading={isOrganizationsLoading}
                      disabled={userRole !== "Admin"}
                      onChange={changeOrganization(control.onChange)}
                    />
                  )}
                </MountedFormField>
                <MountedFormField
                  label={
                    <span>
                      Team{" "}
                      <SimpleTooltip content="此 Key 所属的 Team，决定可用的 Models 和 Budget 限制">
                        <Info className="ml-1 inline size-3.5 align-text-bottom" />
                      </SimpleTooltip>
                    </span>
                  }
                  name="team_id"
                  className="mt-4"
                  required={keyOwner === "service_account"}
                  rules={requiredRule(keyOwner === "service_account", "请为服务账号选择 Team")}
                  help={keyOwner === "service_account" ? "required" : ""}
                >
                  {(control) => (
                    <TeamDropdown
                      id={control.id}
                      value={typeof control.value === "string" ? control.value : null}
                      onChange={control.onChange}
                      disabled={selectedProjectId !== null}
                      organizationId={selectedOrganizationId}
                      onTeamSelect={selectTeam}
                    />
                  )}
                </MountedFormField>
                {enableProjectsUI && (
                  <MountedFormField
                    label={
                      <span>
                        Project{" "}
                        <SimpleTooltip content="将此 Key 分配给某个 Project。选择 Project 后，Team 将锁定为该 Project 的 Team。">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="project_id"
                    className="mt-4"
                  >
                    {(control) => (
                      <ProjectDropdown
                        id={control.id}
                        value={typeof control.value === "string" ? control.value : null}
                        projects={projects}
                        teamId={selectedCreateKeyTeam?.team_id}
                        loading={isProjectsLoading || !teams}
                        onChange={changeProject(control.onChange)}
                      />
                    )}
                  </MountedFormField>
                )}
              </div>

              {/* Show message when team selection is required */}
              {isFormDisabled && (
                <div className="mb-8 p-4 bg-info/10 border border-info/20 rounded-md">
                  <p className="text-info text-sm">
                    请先选择 Team 再继续配置 Virtual Key。如果看不到任何 Team，请联系 Proxy Admin 为你开通 Models
                    访问权限或将你加入某个 Team。
                  </p>
                </div>
              )}

              {/* Section 2: Key Details */}
              {!isFormDisabled && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-foreground mb-4">密钥详情</h3>
                  <MountedFormField
                    label={
                      <span>
                        {keyOwner === "you" || keyOwner === "another_user" ? "密钥名称" : "服务账号 ID"}{" "}
                        <SimpleTooltip
                          content={
                            keyOwner === "you" || keyOwner === "another_user"
                              ? "用于识别此 Key 的描述性名称"
                              : "此服务账号的唯一标识"
                          }
                        >
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="key_alias"
                    required
                    rules={requiredRule(
                      true,
                      `请填写${keyOwner === "you" ? "密钥名称" : "服务账号 ID"}`,
                    )}
                    help="required"
                  >
                    {(control) => <Input {...control} value={(control.value as string | undefined) ?? ""} />}
                  </MountedFormField>

                  <MountedFormField
                    label={
                      <span>
                        Models{" "}
                        <SimpleTooltip content="选择此 Key 可访问的 Models。选择“所有 Team Models”可访问该 Team 的全部 Models。留空表示可访问所有 Models。">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="models"
                    help={
                      keyType === "management" || keyType === "read_only"
                        ? "此 密钥类型下 Models 字段不可用"
                        : "可选，留空表示可访问所有 Models"
                    }
                    className="mt-4"
                  >
                    {(control) => (
                      <MultiSelect
                        id={control.id}
                        options={modelOptions}
                        value={(control.value as string[] | undefined) ?? []}
                        placeholder="选择 Models"
                        disabled={keyType === "management" || keyType === "read_only"}
                        onValueChange={(values) => {
                          control.onChange(values);
                          if (values.includes("all-team-models")) {
                            form.setValue("models", ["all-team-models"]);
                          } else if (values.includes("all-proxy-models")) {
                            form.setValue("models", ["all-proxy-models"]);
                          }
                        }}
                      />
                    )}
                  </MountedFormField>

                  <MountedFormField
                    label={
                      <span>
                        密钥类型{" "}
                        <SimpleTooltip content="选择 密钥类型，决定此 Key 可访问的路由和操作">
                          <Info className="ml-1 inline size-3.5 align-text-bottom" />
                        </SimpleTooltip>
                      </span>
                    }
                    name="key_type"
                    className="mt-4"
                  >
                    {(control) => (
                      <Select
                        items={KEY_TYPE_OPTIONS}
                        value={control.value as string | undefined}
                        onValueChange={(value: string | null) =>
                          value != null && changeKeyType(control.onChange)(value)
                        }
                      >
                        <SelectTrigger
                          id={control.id}
                          className="w-full"
                          aria-invalid={control["aria-invalid"]}
                          aria-describedby={control["aria-describedby"]}
                        >
                          <SelectValue placeholder="选择 密钥类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {KEY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="py-1">
                                <div className="font-medium">{option.label}</div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </MountedFormField>
                </div>
              )}

              {/* Section 3: Optional Settings */}
              {!isFormDisabled && (
                <div className="mb-8">
                  <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                    <h3 className="m-0 text-lg font-medium text-foreground">
                      <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                        可选设置
                        <ChevronDown className={SECTION_CHEVRON_CLASS} />
                      </CollapsibleTrigger>
                    </h3>
                    <CollapsibleContent className="px-4 pb-3">
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            最高预算 (USD){" "}
                            <SimpleTooltip content="此 Key 可花费的最高金额（USD）。达到上限后，此 Key 将无法继续发起请求。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="max_budget"
                        help={`预算不能超过团队最高预算：$${team?.max_budget !== null && team?.max_budget !== undefined ? team?.max_budget : "无限制"}`}
                        rules={ceilingRule(
                          team?.max_budget,
                          (limit) => `预算不能超过团队最高预算：$${formatNumberWithCommas(limit, 4)}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={0.01}
                            precision={2}
                            width={200}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            预算重置{" "}
                            <SimpleTooltip content="Budget 的重置周期。例如设置为“daily”则每 24 小时重置一次。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="budget_duration"
                        help={`团队预算Reset:${team?.budget_duration !== null && team?.budget_duration !== undefined ? team?.budget_duration : "无"}`}
                      >
                        {(control) => (
                          <BudgetDurationDropdown
                            id={control.id}
                            value={control.value as string | null | undefined}
                            showNeverResets
                            placeholder="未设置"
                            onChange={(next) => control.onChange(next ?? undefined)}
                          />
                        )}
                      </MountedFormField>
                      <Field className="mt-4">
                        <FieldLabel>
                          <span>
                            预算窗口{" "}
                            <SimpleTooltip content="设置多个独立的预算窗口（例如每小时 $10 且每月 $200）。每个窗口单独统计用量并按各自周期重置。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        </FieldLabel>
                        <BudgetWindowsEditor value={budgetLimits} onChange={setBudgetLimits} />
                      </Field>
                      <Field className="mt-4">
                        <FieldLabel>
                          <span>
                            Per-Model 预算{" "}
                            <SimpleTooltip content="限制单个 Model 的 Spend，每个 Model 有独立的重置窗口。对此 Key 的每个请求生效；用量在 密钥详情页展示。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        </FieldLabel>
                        <ModelMaxBudgetEditor
                          value={modelMaxBudget}
                          onChange={setModelMaxBudget}
                          availableModels={modelsToPick}
                          premiumUser={premiumUser === true}
                        />
                      </Field>
                      <Field className="mt-4">
                        <FieldLabel>
                          <span>
                            预算回退{" "}
                            <SimpleTooltip content="当某个模型超出其按模型预算（model_max_budget）时，请求会自动改路由到回退模型而不是失败。在高级设置中配置按模型预算。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        </FieldLabel>
                        <BudgetFallbacksEditor
                          key={budgetFallbacksKey}
                          value={budgetFallbacks}
                          onChange={setBudgetFallbacks}
                          availableModels={modelsToPick}
                        />
                      </Field>
                      {keyOwner === "service_account" && isProxyAdminRole(userRole ?? "") && (
                        <MountedFormField
                          className="mt-4"
                          label={
                            <span>
                              默认客户预算{" "}
                              <SimpleTooltip content={END_USER_BUDGET_HINT}>
                                <Info className="ml-1 inline size-3.5 align-text-bottom" />
                              </SimpleTooltip>
                            </span>
                          }
                          name="end_user_budget_id"
                        >
                          {(control) => (
                            <EndUserBudgetSelect
                              id={control.id}
                              accessToken={accessToken}
                              value={typeof control.value === "string" ? control.value : null}
                              onChange={control.onChange}
                              canEdit
                            />
                          )}
                        </MountedFormField>
                      )}
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            每分钟 Token 上限 (TPM){" "}
                            <SimpleTooltip content="此 Key 每分钟可处理的最大 Token 数，用于控制用量和成本。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="tpm_limit"
                        help={`TPM 不能超过团队 TPM 上限：${team?.tpm_limit !== null && team?.tpm_limit !== undefined ? team?.tpm_limit : "无限制"}`}
                        rules={ceilingRule(
                          team?.tpm_limit,
                          (limit) => `TPM 限制不能超过 Team 的 TPM 限制：${limit}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={1}
                            width={400}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField name="tpm_limit_type" bare>
                        {(control) => (
                          <RateLimitTypeFormItem
                            type="tpm"
                            name="tpm_limit_type"
                            className="mt-4"
                            showDetailedDescriptions
                            id={control.id}
                            value={control.value as string | null | undefined}
                            onChange={control.onChange}
                            aria-invalid={control["aria-invalid"] ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            每分钟请求上限 (RPM){" "}
                            <SimpleTooltip content="此 Key 每分钟可发起的最大 API 请求数，用于防止滥用和管理负载。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="rpm_limit"
                        help={`RPM 不能超过团队 RPM 上限：${team?.rpm_limit !== null && team?.rpm_limit !== undefined ? team?.rpm_limit : "无限制"}`}
                        rules={ceilingRule(
                          team?.rpm_limit,
                          (limit) => `RPM 限制不能超过 Team 的 RPM 限制：${limit}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={1}
                            width={400}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField name="rpm_limit_type" bare>
                        {(control) => (
                          <RateLimitTypeFormItem
                            type="rpm"
                            name="rpm_limit_type"
                            className="mt-4"
                            showDetailedDescriptions
                            id={control.id}
                            value={control.value as string | null | undefined}
                            onChange={control.onChange}
                            aria-invalid={control["aria-invalid"] ? true : undefined}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            每日 Token 上限 (TPD){" "}
                            <SimpleTooltip content="批处理提交（/v1/batches）的每日 Token 预算。设置后，批处理输入文件计入此 24 小时窗口，而不是密钥的 TPM/RPM。在线请求仍使用 TPM/RPM。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="tpd_limit"
                        help={`TPD 不能超过团队 TPD 上限：${team?.tpd_limit !== null && team?.tpd_limit !== undefined ? team?.tpd_limit : "无限制"}`}
                        rules={ceilingRule(
                          team?.tpd_limit,
                          (limit) => `TPD 限制不能超过 Team 的 TPD 限制：${limit}`,
                        )}
                      >
                        {(control) => (
                          <NumericalInput
                            {...control}
                            value={control.value as number | string | undefined}
                            step={1}
                            width={400}
                          />
                        )}
                      </MountedFormField>
                      <Field className="mt-4">
                        <FieldLabel>
                          <span>
                            按 Tag 速率限制{" "}
                            <SimpleTooltip content="将速率限制限定到请求 Tag，使每个 Tag（例如某个单元或分组）拥有独立的 RPM 计数器。没有匹配 Tag 的请求回退到 Key 级限制。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        </FieldLabel>
                        <TagRateLimitEditor value={tagRateLimits} onChange={setTagRateLimits} />
                      </Field>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            超出预算时限流{" "}
                            <SimpleTooltip content="当此密钥超出最高预算时，将其 TPM/RPM 降至全局配置的百分比，而不是完全阻止访问。需要在 litellm_settings 中设置 budget_exceeded_throttle_percentage，且密钥需配置 TPM/RPM 上限。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="throttle_on_budget_exceeded"
                      >
                        {(control) => (
                          <Switch
                            id={control.id}
                            checked={control.value === true}
                            onCheckedChange={control.onChange}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        className="mt-4"
                        label={
                          <span>
                            Enable 提示词缓存{" "}
                            <SimpleTooltip content="自动为此密钥的请求添加提示词缓存断点（cache_control 标记），降低重复提示的输入成本。适用于 Anthropic 与 Bedrock Claude 模型；已自行设置 cache_control 的请求不会被修改。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="enable_prompt_caching"
                      >
                        {(control) => (
                          <Switch
                            id={control.id}
                            checked={control.value === true}
                            onCheckedChange={control.onChange}
                            aria-describedby={control["aria-describedby"]}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Guardrails{" "}
                            <SimpleTooltip content="为此 Key 应用安全 Guardrails，用于过滤内容或执行策略">
                              <a
                                href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                              >
                                <Info className="ml-1 inline size-3.5 align-text-bottom" />
                              </a>
                            </SimpleTooltip>
                          </span>
                        }
                        name="guardrails"
                        className="mt-4"
                        help={
                          canEditGuardrails
                            ? "选择已有 Guardrails 或输入新的"
                            : "高级功能，升级后可按密钥设置 Guardrails"
                        }
                      >
                        {(control) => (
                          <TagsInput
                            id={control.id}
                            value={(control.value as string[] | undefined) ?? []}
                            onValueChange={control.onChange}
                            disabled={!canEditGuardrails}
                            placeholder={
                              !canEditGuardrails
                                ? "高级功能，升级后可按密钥设置 Guardrails"
                                : "选择或Type Guardrails"
                            }
                            options={guardrailsList.map((name) => ({ value: name, label: name }))}
                          />
                        )}
                      </MountedFormField>
                      {userRole != null && isProxyAdminRole(userRole) && (
                        <MountedFormField
                          label={
                            <span>
                              禁用全局 Guardrails{" "}
                              <SimpleTooltip content="启用后，此 Key 将绕过配置为对每个请求运行的 Guardrails（全局 Guardrails）">
                                <a
                                  href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                                >
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </a>
                              </SimpleTooltip>
                            </span>
                          }
                          name="disable_global_guardrails"
                          className="mt-4"
                          help={
                            canEditGuardrails
                              ? "为此 Key 绕过全局 Guardrails"
                              : "Premium 功能，升级后可按 Key 禁用全局 Guardrails"
                          }
                        >
                          {(control) => (
                            <Switch
                              id={control.id}
                              checked={control.value === true}
                              onCheckedChange={control.onChange}
                              disabled={!canEditGuardrails}
                              aria-describedby={control["aria-describedby"]}
                            />
                          )}
                        </MountedFormField>
                      )}
                      {canViewPolicies && (
                        <MountedFormField
                          label={
                            <span>
                              Policies{" "}
                              <SimpleTooltip content="为此 Key 应用 Policies，用于控制 Guardrails 和其他设置">
                                <a
                                  href="https://docs.litellm.ai/docs/proxy/guardrails/guardrail_policies"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                                >
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </a>
                              </SimpleTooltip>
                            </span>
                          }
                          name="policies"
                          className="mt-4"
                          help={
                            premiumUser
                              ? "选择已有 Policies 或输入新的"
                              : "高级功能，升级后可按密钥设置 Policies"
                          }
                        >
                          {(control) => (
                            <TagsInput
                              id={control.id}
                              value={(control.value as string[] | undefined) ?? []}
                              onValueChange={control.onChange}
                              disabled={!premiumUser}
                              placeholder={
                                !premiumUser
                                  ? "高级功能，升级后可按密钥设置 Policies"
                                  : "选择或Type Policies"
                              }
                              options={policiesList.map((name) => ({ value: name, label: name }))}
                            />
                          )}
                        </MountedFormField>
                      )}
                      {canViewPrompts && (
                        <MountedFormField
                          label={
                            <span>
                              Prompts{" "}
                              <SimpleTooltip content="允许此 Key 使用指定的 Prompt 模板">
                                <a
                                  href="https://docs.litellm.ai/docs/proxy/prompt_management"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                                >
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </a>
                              </SimpleTooltip>
                            </span>
                          }
                          name="prompts"
                          className="mt-4"
                          help={
                            premiumUser
                              ? "选择已有 Prompts 或输入新的"
                              : "高级功能，升级后可按密钥设置 Prompts"
                          }
                        >
                          {(control) => (
                            <TagsInput
                              id={control.id}
                              value={(control.value as string[] | undefined) ?? []}
                              onValueChange={control.onChange}
                              disabled={!premiumUser}
                              placeholder={
                                !premiumUser
                                  ? "高级功能，升级后可按密钥设置 Prompts"
                                  : "选择或Type Prompts"
                              }
                              options={promptsList.map((name) => ({ value: name, label: name }))}
                            />
                          )}
                        </MountedFormField>
                      )}
                      <MountedFormField
                        label={
                          <span>
                            访问组{" "}
                            <SimpleTooltip content="为此 Key 分配 Access Group。Access Group 控制此 Key 可使用哪些 Models、MCP Server 和 Agent。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="access_group_ids"
                        className="mt-4"
                        help="选择要分配给此 Key 的 Access Group"
                      >
                        {(control) => (
                          <AccessGroupSelector
                            value={control.value as string[] | undefined}
                            onChange={control.onChange}
                            placeholder="选择 Access Group（可选）"
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Allowed Pass Through Routes{" "}
                            <SimpleTooltip content="允许此 Key 使用指定的透传路由">
                              <a
                                href="https://docs.litellm.ai/docs/proxy/pass_through"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Prevent accordion from collapsing when clicking link
                              >
                                <Info className="ml-1 inline size-3.5 align-text-bottom" />
                              </a>
                            </SimpleTooltip>
                          </span>
                        }
                        name="allowed_passthrough_routes"
                        className="mt-4"
                        help={
                          premiumUser
                            ? "选择已有透传路由或输入新的"
                            : "高级功能，升级后可按密钥设置透传路由"
                        }
                      >
                        {(control) => (
                          <PassThroughRoutesSelector
                            value={control.value as string[] | undefined}
                            onChange={control.onChange}
                            accessToken={accessToken}
                            placeholder={
                              !premiumUser
                                ? "高级功能，升级后可按密钥设置透传路由"
                                : "选择或输入透传路由"
                            }
                            disabled={!premiumUser}
                            teamId={selectedCreateKeyTeam ? selectedCreateKeyTeam.team_id : null}
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Allowed Vector Stores{" "}
                            <SimpleTooltip content="选择此 Key 可访问的 Vector Store。不选择则可访问所有可用的 Vector Store。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="allowed_vector_store_ids"
                        className="mt-4"
                        help="选择此 Key 可访问的 Vector Store。留空表示可访问所有 Vector Store。"
                      >
                        {(control) => (
                          <VectorStoreSelector
                            onChange={control.onChange}
                            value={control.value as string[] | undefined}
                            accessToken={accessToken}
                            placeholder="选择 Vector Store（可选）"
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Metadata{" "}
                            <SimpleTooltip content="包含此 Key 附加信息的 JSON 对象，用于追踪或自定义逻辑。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="metadata"
                        className="mt-4"
                      >
                        {(control) => (
                          <Textarea
                            {...control}
                            value={(control.value as string | undefined) ?? ""}
                            rows={4}
                            placeholder="Type JSON 格式的元数据"
                          />
                        )}
                      </MountedFormField>
                      <MountedFormField
                        label={
                          <span>
                            Tag{" "}
                            <SimpleTooltip content="用于跟踪用量和/或按 Tag 路由的 Tag，可用于分析与筛选。">
                              <Info className="ml-1 inline size-3.5 align-text-bottom" />
                            </SimpleTooltip>
                          </span>
                        }
                        name="tags"
                        className="mt-4"
                        help={`用于跟踪用量和/或按 Tag 路由的 Tag。`}
                      >
                        {(control) => (
                          <TagsInput
                            id={control.id}
                            value={(control.value as string[] | undefined) ?? []}
                            onValueChange={control.onChange}
                            placeholder="选择或Type Tag"
                            tokenSeparators={[","]}
                            options={tagOptions}
                          />
                        )}
                      </MountedFormField>
                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>MCP 设置</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <MountedFormField
                            label={
                              <span>
                                允许的 MCP 服务器{" "}
                                <SimpleTooltip content="选择此 Key 可访问的 MCP Server 或 Access Group">
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </SimpleTooltip>
                              </span>
                            }
                            name="allowed_mcp_servers_and_groups"
                            help="选择此 Key 可访问的 MCP Server 或 Access Group"
                          >
                            {(control) => (
                              <MCPServerSelector
                                onChange={control.onChange}
                                value={control.value as McpSelectorValue | undefined}
                                accessToken={accessToken}
                                teamId={selectedCreateKeyTeam?.team_id ?? null}
                                placeholder="选择 MCP Server 或 Access Group（可选）"
                                allowNoMcpServers
                              />
                            )}
                          </MountedFormField>

                          {/* Hidden field to register mcp_tool_permissions with the form */}
                          <MountedFormField name="mcp_tool_permissions" bare>
                            {(control) => <input type="hidden" id={control.id} name={control.name} />}
                          </MountedFormField>

                          <McpToolPermissionsField
                            accessToken={accessToken}
                            control={form.control}
                            setValue={form.setValue}
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>Agent 设置</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <MountedFormField
                            label={
                              <span>
                                允许的 Agent{" "}
                                <SimpleTooltip content="选择此 Key 可访问的 Agent 或 Access Group">
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </SimpleTooltip>
                              </span>
                            }
                            name="allowed_agents_and_groups"
                            help="选择此 Key 可访问的 Agent 或 Access Group"
                          >
                            {(control) => (
                              <AgentSelector
                                onChange={control.onChange}
                                value={control.value as AgentSelectorValue | undefined}
                                accessToken={accessToken}
                                placeholder="选择 Agent 或 Access Group（可选）"
                              />
                            )}
                          </MountedFormField>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>Skill 设置</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <MountedFormField
                            label={
                              <span>
                                允许的 Skill{" "}
                                <SimpleTooltip content="已启用的 Skill 对所有 Key 可见。在此为此 Key 授予已禁用（私有）的 Claude Code 插件。">
                                  <Info className="ml-1 inline size-3.5 align-text-bottom" />
                                </SimpleTooltip>
                              </span>
                            }
                            name="allowed_skills"
                            help="选择此 Key 在 Claude Code 市场中可访问的私有 Skill"
                          >
                            {(control) => (
                              <SkillSelector
                                onChange={control.onChange}
                                value={control.value as string[] | undefined}
                                accessToken={accessToken}
                                placeholder="选择 Skill（可选）"
                              />
                            )}
                          </MountedFormField>
                        </CollapsibleContent>
                      </Collapsible>

                      {premiumUser ? (
                        <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                          <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                            <b>日志设置</b>
                            <ChevronDown className={SECTION_CHEVRON_CLASS} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-3">
                            <div className="mt-4">
                              <PremiumLoggingSettings
                                value={loggingSettings}
                                onChange={setLoggingSettings}
                                premiumUser={true}
                                disabledCallbacks={disabledCallbacks}
                                onDisabledCallbacksChange={setDisabledCallbacks}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <SimpleTooltip
                          className="w-full"
                          content={
                            <span>
                              按 Key 的日志设置是企业版功能，请联系我们：
                              <a href="https://www.litellm.ai/enterprise" target="_blank">
                                https://www.litellm.ai/enterprise
                              </a>
                            </span>
                          }
                          side="top"
                        >
                          <div style={{ position: "relative" }}>
                            <div style={{ opacity: 0.5 }}>
                              <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                                <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                                  <b>日志设置</b>
                                  <ChevronDown className={SECTION_CHEVRON_CLASS} />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="px-4 pb-3">
                                  <div className="mt-4">
                                    <PremiumLoggingSettings
                                      value={loggingSettings}
                                      onChange={setLoggingSettings}
                                      premiumUser={false}
                                      disabledCallbacks={disabledCallbacks}
                                      onDisabledCallbacksChange={setDisabledCallbacks}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                            <div style={{ position: "absolute", inset: 0, cursor: "not-allowed" }} />
                          </div>
                        </SimpleTooltip>
                      )}

                      <Collapsible
                        key={`router-settings-accordion-${routerSettingsKey}`}
                        className="mt-4 mb-4 overflow-hidden rounded-lg border"
                      >
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>路由设置</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4 w-full">
                            <RouterSettingsAccordion
                              key={routerSettingsKey}
                              ref={routerSettingsRef}
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

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>模型别名</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              为可在 API 调用中使用的模型创建自定义别名，便于为特定模型设置快捷名称。
                            </p>
                            <ModelAliasManager
                              accessToken={accessToken}
                              initialModelAliases={modelAliases}
                              onAliasUpdate={setModelAliases}
                              showExampleConfig={false}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <b>密钥生命周期</b>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <div className="mt-4">
                            <MountedFormField name="duration" bare>
                              {(control) => (
                                <KeyLifecycleSettings
                                  id={control.id}
                                  value={control.value as string | undefined}
                                  onChange={control.onChange}
                                  autoRotationEnabled={autoRotationEnabled}
                                  onAutoRotationChange={setAutoRotationEnabled}
                                  rotationInterval={rotationInterval}
                                  onRotationIntervalChange={setRotationInterval}
                                  isCreateMode={true}
                                />
                              )}
                            </MountedFormField>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      <Collapsible className="mt-4 mb-4 overflow-hidden rounded-lg border">
                        <CollapsibleTrigger className={SECTION_HEADER_CLASS}>
                          <div className="flex items-center gap-2">
                            <b>高级设置</b>
                            <SimpleTooltip
                              content={
                                <span>
                                  Learn more about advanced settings in our{" "}
                                  <a
                                    href={
                                      proxyBaseUrl
                                        ? `${proxyBaseUrl}/#/key%20management/generate_key_fn_key_generate_post`
                                        : `/#/key%20management/generate_key_fn_key_generate_post`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info hover:text-info/80"
                                  >
                                    documentation
                                  </a>
                                </span>
                              }
                            >
                              <Info className="size-4 text-muted-foreground hover:text-foreground cursor-help" />
                            </SimpleTooltip>
                          </div>
                          <ChevronDown className={SECTION_CHEVRON_CLASS} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-3">
                          <SchemaFormFields
                            schemaComponent="GenerateKeyRequest"
                            setValue={form.setValue}
                            excludedFields={[
                              "key_alias",
                              "team_id",
                              "organization_id",
                              "models",
                              "duration",
                              "metadata",
                              "tags",
                              "guardrails",
                              "max_budget",
                              "budget_duration",
                              "tpm_limit",
                              "rpm_limit",
                              "tpd_limit",
                              ...(disableCustomApiKeys ? ["key"] : []),
                            ]}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              <div style={{ textAlign: "right", marginTop: "10px" }}>
                <Button type="submit" disabled={isFormDisabled}>
                  创建密钥
                </Button>
              </div>
            </form>
          </MountedFormProvider>
        </DialogContent>
      </Dialog>

      {/* Add the Create User Modal */}
      {isCreateUserModalVisible && (
        <Dialog open={isCreateUserModalVisible} onOpenChange={(open) => !open && setIsCreateUserModalVisible(false)}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>新建用户</DialogTitle>
            </DialogHeader>
            <CreateUserButton
              userID={userID}
              accessToken={accessToken}
              possibleUIRoles={possibleUIRoles}
              onUserCreated={handleUserCreated}
              isEmbedded={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {apiKey && (
        <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2 w-full">
              <DialogTitle className="text-lg font-medium text-foreground">保存你的密钥</DialogTitle>
              {apiKey != null ? (
                <CreatedKeyDisplay apiKey={apiKey} />
              ) : (
                <p className="text-sm">Key 创建中，可能需要 30 秒</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CreateKey;
