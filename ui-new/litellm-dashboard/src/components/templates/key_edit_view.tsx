import { canDetachKeyProject, KeyProjectField } from "./KeyProjectField";
import GuardrailSelector from "@/components/guardrails/GuardrailSelector";
import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import PolicySelector from "@/components/policies/PolicySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import React, { useEffect, useRef, useState } from "react";
import { hasCapability } from "../../utils/capabilities";
import { isProxyAdminRole, rolesWithWriteAccess } from "../../utils/roles";
import AccessGroupSelector from "../common_components/AccessGroupSelector";
import BudgetDurationDropdown from "../common_components/budget_duration_dropdown";
import { mapInternalToDisplayNames } from "../callback_info_helpers";
import KeyLifecycleSettings from "../common_components/KeyLifecycleSettings";
import PassThroughRoutesSelector from "../common_components/PassThroughRoutesSelector";
import OrganizationDropdown from "../common_components/OrganizationDropdown";
import RouterSettingsAccordion, { RouterSettingsAccordionRef } from "../common_components/RouterSettingsAccordion";
import { routerSettingsEditorValue, routerSettingsUpdate } from "../common_components/routerSettingsPayload";
import { estimateTooltips, withNormalizedEstimates } from "./estimatedOutputTokens";
import {
  currentValuePlaceholder,
  keyTypeFromRoutes,
  modelSentinelOptions,
  parseAllowedRoutes,
} from "./keyEditFieldNormalizers";
import {
  KeyAgentAndSkillFields,
  KeyBudgetNumberField,
  KeyMetadataField,
  KeyRateLimitFields,
  KeyTypeSelect,
  labelWithHint,
  moveMetadataTagsToTagsField,
} from "./KeyEditViewControls";
import {
  KeyEditFormValues,
  keyEditFormSchema,
  McpServersAndGroups,
  toKeyEditFormValues,
  toSubmittedValues,
} from "./keyEditFormValues";
import { BudgetFallbacksEditor } from "../key_team_helpers/BudgetFallbacksEditor";
import { END_USER_BUDGET_HINT, EndUserBudgetSelect } from "../key_team_helpers/EndUserBudgetSelect";
import {
  endUserBudgetIdUpdate,
  keyOffersEndUserBudget,
  storedEndUserBudgetId,
} from "../key_team_helpers/endUserBudgetPayload";
import { ModelMaxBudgetField } from "../key_team_helpers/ModelMaxBudgetEditor";
import { useModelMaxBudgetField } from "../key_team_helpers/useModelMaxBudgetField";
import { BudgetWindowEntry, BudgetWindowsEditor } from "../key_team_helpers/BudgetWindowsEditor";
import {
  TagRateLimitEditor,
  TagRateLimitEntry,
  tagLimitsToRows,
  tagRowsToLimits,
} from "../key_team_helpers/TagRateLimitEditor";
import { excludeProxyWideSentinel, hasAllModelsSentinel } from "../key_team_helpers/fetch_available_models_team_key";
import { KeyResponse } from "../key_team_helpers/key_list";
import MCPServerSelector from "../mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "../mcp_server_management/MCPToolPermissions";
import { toast } from "@/lib/toast";
import { getPromptsList, modelAvailableCall, tagListCall } from "../networking";
import { fetchTeamModels } from "../organisms/create_key_button";
import NumericalInput from "../shared/numerical_input";
import { MultiSelect } from "../shared/MultiSelect";
import { TagsInput } from "@/app/(dashboard)/guardrails/_components/content_filter/TagsInput";
import { Tag } from "../tag_management/types";
import EditLoggingSettings from "../team/EditLoggingSettings";
import { useZodForm } from "@/lib/forms/useZodForm";
import VectorStoreSelector from "../vector_store_management/VectorStoreSelector";

interface KeyEditViewProps {
  keyData: KeyResponse;
  onCancel: () => void;
  onSubmit: (values: any, dirtyFields: readonly string[]) => Promise<void>;
  teams?: any[] | null;
  accessToken: string | null;
  userID: string | null;
  userRole: string | null;
  premiumUser?: boolean;
}

export function KeyEditView({
  keyData,
  onCancel,
  onSubmit,
  teams,
  accessToken,
  userID,
  userRole,
  premiumUser = false,
}: KeyEditViewProps) {
  const canEditGuardrails = premiumUser || (userRole != null && rolesWithWriteAccess.includes(userRole));
  const canViewPolicies = hasCapability(userRole, "viewPolicies");
  const canViewPrompts = hasCapability(userRole, "viewPrompts");
  const canEditEstimates = userRole != null && isProxyAdminRole(userRole);
  const estimateTooltip = estimateTooltips(canEditEstimates);
  const form = useZodForm<KeyEditFormValues, KeyEditFormValues>(keyEditFormSchema, {
    defaultValues: toKeyEditFormValues(keyData),
  });
  const [promptsList, setPromptsList] = useState<string[]>([]);
  const [tagsList, setTagsList] = useState<Record<string, Tag>>({});
  const team = teams?.find((team) => team.team_id === keyData.team_id);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [disabledCallbacks, setDisabledCallbacks] = useState<string[]>(
    Array.isArray(keyData.metadata?.litellm_disabled_callbacks)
      ? mapInternalToDisplayNames(keyData.metadata.litellm_disabled_callbacks)
      : [],
  );
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(keyData.organization_id || null);
  const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(keyData.auto_rotate || false);
  const [rotationInterval, setRotationInterval] = useState<string>(keyData.rotation_interval || "");
  const [neverExpire, setNeverExpire] = useState<boolean>(!keyData.expires);
  const [isKeySaving, setIsKeySaving] = useState(false);
  const [budgetLimits, setBudgetLimits] = useState<BudgetWindowEntry[]>(
    Array.isArray(keyData.budget_limits) ? keyData.budget_limits : [],
  );
  const [tagRateLimits, setTagRateLimits] = useState<TagRateLimitEntry[]>(
    tagLimitsToRows(keyData.metadata?.tag_rpm_limit),
  );
  const [budgetFallbacks, setBudgetFallbacks] = useState<Record<string, string[]>>(
    keyData.budget_fallbacks && typeof keyData.budget_fallbacks === "object" ? keyData.budget_fallbacks : {},
  );
  const modelBudget = useModelMaxBudgetField(keyData.token, keyData.model_max_budget);
  const storedEndUserBudgetIdValue = storedEndUserBudgetId(keyData.metadata);
  const [endUserBudgetId, setEndUserBudgetId] = useState<string | null>(storedEndUserBudgetIdValue || null);
  const routerSettingsRef = useRef<RouterSettingsAccordionRef>(null);
  const keyTypeFieldId = React.useId();
  const endUserBudgetFieldId = React.useId();
  const { data: organizations, isLoading: isOrganizationsLoading } = useOrganizations();
  const { data: uiSettingsData } = useUISettings();
  const enableProjectsUI = Boolean(uiSettingsData?.values?.enable_projects_ui);
  const hasProject = Boolean(keyData.project_id);
  const detachProject = hasProject && form.watch("project_id") === null;
  const canDetachProject = canDetachKeyProject(team, organizations, userID, userRole);

  const allowedRoutesValue = form.watch("allowed_routes");
  const selectedModels = (form.watch("models") as string[] | undefined) ?? [];
  const allowedRoutes = parseAllowedRoutes(allowedRoutesValue);
  const isModelsDisabled = allowedRoutes.includes("management_routes") || allowedRoutes.includes("info_routes");
  const mcpSelection = form.watch("mcp_servers_and_groups") as
    | { servers?: string[]; accessGroups?: string[]; toolsets?: string[] }
    | undefined;
  const mcpToolPermissions = form.watch("mcp_tool_permissions");

  useEffect(() => {
    const fetchModels = async () => {
      if (!userID || !userRole || !accessToken) return;

      try {
        if (keyData.team_id === null) {
          // Fetch user models if no team
          const model_available = await modelAvailableCall(accessToken, userID, userRole);
          const available_model_names = model_available["data"].map((element: { id: string }) => element.id);
          setAvailableModels(excludeProxyWideSentinel(available_model_names));
        } else if (team?.team_id) {
          // Fetch team models if team exists
          const models = await fetchTeamModels(userID, userRole, accessToken, team.team_id);
          setAvailableModels(excludeProxyWideSentinel(Array.from(new Set([...team.models, ...models]))));
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };

    const fetchPrompts = async () => {
      if (!accessToken) return;
      try {
        const response = await getPromptsList(accessToken);
        setPromptsList(Array.from(new Set(response.prompts.map((prompt) => prompt.prompt_id))));
      } catch (error) {
        console.error("Failed to fetch prompts:", error);
      }
    };

    if (canViewPrompts) fetchPrompts();
    fetchModels();
  }, [userID, userRole, accessToken, team, keyData.team_id, canViewPrompts]);

  // Sync disabled callbacks with form when component mounts
  useEffect(() => {
    form.setValue("disabled_callbacks", disabledCallbacks);
  }, [form, disabledCallbacks]);

  useEffect(() => {
    form.reset(toKeyEditFormValues(keyData));
  }, [keyData, form]);

  // Sync auto-rotation state with form values
  useEffect(() => {
    form.setValue("auto_rotate", autoRotationEnabled);
  }, [autoRotationEnabled, form]);

  useEffect(() => {
    if (rotationInterval) {
      form.setValue("rotation_interval", rotationInterval);
    }
  }, [rotationInterval, form]);

  // Fetch tags for selector
  useEffect(() => {
    const fetchTags = async () => {
      if (!accessToken) return;
      try {
        const response = await tagListCall(accessToken);
        setTagsList(response);
      } catch (error) {
        toast.fromError("获取 Tag 出错：" + error);
      }
    };
    fetchTags();
  }, [accessToken]);

  const handleSubmit = async (values: any) => {
    try {
      setIsKeySaving(true);

      // Parse allowed_routes from comma-separated string to array
      if (typeof values.allowed_routes === "string") {
        const trimmedInput = values.allowed_routes.trim();
        if (trimmedInput === "") {
          values.allowed_routes = [];
        } else {
          values.allowed_routes = trimmedInput
            .split(",")
            .map((route: string) => route.trim())
            .filter((route: string) => route.length > 0);
        }
      }
      // If it's already an array (shouldn't happen, but handle it), keep as is

      // Backend rejects non-empty allowed_routes from non-admins, so re-sending
      // an unchanged value 403s a team admin. Set compare tolerates reorder.
      const originalRoutesSet = new Set<string>(Array.isArray(keyData.allowed_routes) ? keyData.allowed_routes : []);
      const submittedRoutesSet = new Set<string>(Array.isArray(values.allowed_routes) ? values.allowed_routes : []);
      const allowedRoutesUnchanged =
        originalRoutesSet.size === submittedRoutesSet.size &&
        [...submittedRoutesSet].every((r) => originalRoutesSet.has(r));
      if (allowedRoutesUnchanged) {
        delete values.allowed_routes;
      }

      if (neverExpire) {
        values.duration = null;
      }

      if (keyData.budget_duration && !values.budget_duration) {
        values.budget_duration = null;
      }

      // Reconcile multi-window budget limits from the editor state, dropping
      // incomplete entries (no max_budget). The backend treats any budget_limits
      // in a /key/update request as an admin-only budget change, so re-sending
      // the stored windows on an unrelated edit 403s a non-admin key owner
      // (issue #33246). Only send the field when the user actually changed the
      // windows, mirroring how allowed_routes is dropped above when unchanged:
      // compare on (duration, cap), ignoring server-owned reset_at and order.
      // Sending [] clears every window, so send it only when the user removed
      // the last one; otherwise leave the field off (JSON.stringify drops the
      // undefined key) so an unchanged or incomplete editor state never touches
      // storage.
      const windowSignature = (windows: Array<{ budget_duration: string; max_budget: number | null }> | undefined) =>
        (windows ?? [])
          .filter((w) => w.budget_duration && w.max_budget !== null && w.max_budget !== undefined)
          .map((w) => `${w.budget_duration}:${w.max_budget}`)
          .sort()
          .join("|");
      const validWindows = budgetLimits.filter(
        (w) => w.budget_duration && w.max_budget !== null && w.max_budget !== undefined,
      );
      const budgetLimitsUnchanged = windowSignature(keyData.budget_limits) === windowSignature(validWindows);
      if (budgetLimitsUnchanged) {
        // no-op: leave budget_limits off the payload
      } else if (validWindows.length > 0) {
        values.budget_limits = validWindows;
      } else if (budgetLimits.length === 0) {
        values.budget_limits = [];
      }

      // Always send the current per-tag limit map so removing every row
      // clears the stored limits ({} overwrites the metadata field).
      const { tag_rpm_limit } = tagRowsToLimits(tagRateLimits);
      values.tag_rpm_limit = tag_rpm_limit;

      const hadExistingFallbacks = keyData.budget_fallbacks != null && Object.keys(keyData.budget_fallbacks).length > 0;
      if (Object.keys(budgetFallbacks).length > 0) {
        values.budget_fallbacks = budgetFallbacks;
      } else if (hadExistingFallbacks) {
        values.budget_fallbacks = {};
      }

      modelBudget.applyTo(values);

      const endUserBudgetUpdate = endUserBudgetIdUpdate(endUserBudgetId, storedEndUserBudgetIdValue);
      if (endUserBudgetUpdate !== undefined) {
        values.end_user_budget_id = endUserBudgetUpdate;
      }

      const routerSettings = routerSettingsUpdate(
        routerSettingsRef.current?.getValue()?.router_settings,
        keyData.router_settings,
      );
      if (routerSettings) {
        values.router_settings = routerSettings;
      }

      await onSubmit(
        withNormalizedEstimates({
          ...values,
          ...(detachProject && enableProjectsUI && canDetachProject ? { project_id: null } : {}),
        }),
        [...Object.keys(form.formState.dirtyFields), ...(budgetLimitsUnchanged ? [] : ["budget_limits"])],
      );
    } finally {
      setIsKeySaving(false);
    }
  };

  const handleOrganizationChange = (setField: (value: string | null) => void, orgId: string | null) => {
    setField(orgId);
    setSelectedOrganizationId(orgId);
    form.setValue("team_id", null);
  };

  const handleTeamChange = (setField: (value: string | null) => void, teamId: string | null) => {
    setField(teamId);
    const selectedTeam = teams?.find((t) => t.team_id === teamId) || null;
    if (selectedTeam?.organization_id) {
      setSelectedOrganizationId(selectedTeam.organization_id);
      form.setValue("organization_id", selectedTeam.organization_id);
    } else if (!teamId) {
      setSelectedOrganizationId(null);
      form.setValue("organization_id", null);
    }
  };

  const handleDisabledCallbacksChange = (internalValues: string[]) => {
    setDisabledCallbacks(mapInternalToDisplayNames(internalValues));
    form.setValue("disabled_callbacks", internalValues);
  };

  const modelOptions = [
    ...modelSentinelOptions(keyData.team_id, team != null),
    ...availableModels.map((model) => ({
      value: model,
      label: model,
      disabled: hasAllModelsSentinel(selectedModels),
    })),
  ];

  const visibleTeams = selectedOrganizationId
    ? teams?.filter((t) => t.organization_id === selectedOrganizationId)
    : teams;

  return (
    <TooltipProvider>
      <form
        onSubmit={(event) => {
          moveMetadataTagsToTagsField(form);
          return form.handleSubmit((values) =>
            handleSubmit(toSubmittedValues(values, { canViewPolicies, canViewPrompts })),
          )(event);
        }}
      >
        <FieldGroup>
          <FormField control={form.control} name="key_alias" label="密钥别名">
            {(field) => <Input {...field} value={(field.value as string | undefined) ?? ""} />}
          </FormField>

          <FormField
            control={form.control}
            name="models"
            label="模型"
            description={isModelsDisabled ? "此密钥类型下模型字段不可用" : undefined}
          >
            {({ value, onChange, id }) => (
              <MultiSelect
                id={id}
                options={modelOptions}
                value={isModelsDisabled ? [] : (value as string[] | undefined) ?? []}
                onValueChange={(next) => {
                  if (next.includes("all-team-models")) {
                    onChange(["all-team-models"]);
                  } else if (next.includes("all-proxy-models")) {
                    onChange(["all-proxy-models"]);
                  } else {
                    onChange(next);
                  }
                }}
                disabled={isModelsDisabled}
                placeholder="选择模型"
              />
            )}
          </FormField>

          <Field>
            <FieldLabel htmlFor={keyTypeFieldId}>Key 类型</FieldLabel>
            <KeyTypeSelect
              id={keyTypeFieldId}
              value={keyTypeFromRoutes(allowedRoutes)}
              onChange={(value) => {
                switch (value) {
                  case "default":
                    form.setValue("allowed_routes", "");
                    break;
                  case "llm_api":
                    form.setValue("allowed_routes", "llm_api_routes");
                    break;
                  case "management":
                    form.setValue("allowed_routes", "management_routes");
                    form.setValue("models", []);
                    break;
                }
              }}
            />
          </Field>

          <FormField
            control={form.control}
            name="allowed_routes"
            label={labelWithHint(
              "Allowed Routes",
              "List of allowed routes for the key (comma-separated). Can be specific routes (e.g., '/chat/completions') or route patterns (e.g., 'llm_api_routes', 'management_routes', '/keys/*'). Leave empty to allow all routes.",
            )}
          >
            {(field) => (
              <Input
                {...field}
                value={(field.value as string | undefined) ?? ""}
                placeholder="输入允许的路由（逗号分隔）。特殊值：llm_api_routes、management_routes。示例：llm_api_routes、/chat/completions、/keys/*。留空表示允许全部路由"
              />
            )}
          </FormField>

          <KeyBudgetNumberField
            control={form.control}
            name="max_budget"
            label="Max Budget (USD)"
            placeholder="输入数值"
          />

          <KeyBudgetNumberField
            control={form.control}
            name="soft_budget"
            label="软预算 (USD)"
            placeholder="当 Spend 超过此值时发出告警，但不阻止请求"
          />

          <FormField control={form.control} name="budget_duration" label="预算重置">
            {({ value, onChange, id }) => (
              <BudgetDurationDropdown
                id={id}
                value={value as string | null}
                onChange={(next) => onChange(next ?? null)}
                placeholder="永不重置"
              />
            )}
          </FormField>

          <Field>
            <FieldLabel>
              {labelWithHint(
                "预算窗口",
                "设置多个独立的预算窗口（例如每小时 $10 且每月 $200）。每个窗口单独统计用量并按各自周期重置。",
              )}
            </FieldLabel>
            <BudgetWindowsEditor value={budgetLimits} onChange={setBudgetLimits} />
          </Field>

          <ModelMaxBudgetField
            key={keyData.token}
            premiumUser={premiumUser}
            value={modelBudget.value}
            onChange={modelBudget.setValue}
            availableModels={availableModels}
            usage={keyData.model_max_budget_usage}
            hint="限制单个 Model 的 Spend，每个 Model 有独立的重置窗口。对此 Key 的每个请求生效。"
          />

          <Field>
            <FieldLabel>
              {labelWithHint(
                "预算回退",
                "当某个 Model 超出其按 Model 的 Budget 时，请求会自动改路由到 Fallback Model 而不是失败",
              )}
            </FieldLabel>
            <BudgetFallbacksEditor
              value={budgetFallbacks}
              onChange={setBudgetFallbacks}
              availableModels={availableModels}
            />
          </Field>

          {keyOffersEndUserBudget(keyData.metadata) && (
            <Field>
              <FieldLabel htmlFor={endUserBudgetFieldId}>
                {labelWithHint("默认客户 Budget", END_USER_BUDGET_HINT)}
              </FieldLabel>
              <EndUserBudgetSelect
                id={endUserBudgetFieldId}
                accessToken={accessToken}
                value={endUserBudgetId}
                onChange={setEndUserBudgetId}
                canEdit={userRole != null && isProxyAdminRole(userRole)}
              />
            </Field>
          )}

          <KeyRateLimitFields control={form.control} />

          <FormField
            control={form.control}
            name="throttle_on_budget_exceeded"
            label={labelWithHint(
              "Throttle on budget exceeded",
              "When this key exceeds its max budget, throttle its TPM/RPM to the globally configured percentage instead of blocking access entirely. Requires budget_exceeded_throttle_percentage in litellm_settings and a TPM/RPM limit on the key.",
            )}
          >
            {({ value, onChange, ref: _ref, ...field }) => (
              <Switch {...field} checked={Boolean(value)} onCheckedChange={onChange} />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="enable_prompt_caching"
            label={labelWithHint(
              "Enable 提示词缓存",
              "Automatically add prompt caching breakpoints (cache_control markers) to requests made with this key, cutting input cost on repeated prompts. Applies to Anthropic and Bedrock Claude models; requests that already set their own cache_control markers are left untouched.",
            )}
          >
            {({ value, onChange, ref: _ref, ...field }) => (
              <Switch {...field} checked={Boolean(value)} onCheckedChange={onChange} />
            )}
          </FormField>

          <FormField control={form.control} name="max_parallel_requests" label="最大并发请求数">
            {({ ref: _ref, ...field }) => <NumericalInput {...field} value={field.value ?? ""} min={0} />}
          </FormField>

          <FormField control={form.control} name="model_tpm_limit" label="按 Model 的 TPM 限制">
            {(field) => (
              <Textarea
                {...field}
                value={(field.value as string | undefined) ?? ""}
                rows={4}
                placeholder='{"gpt-4": 100, "claude-v1": 200}'
              />
            )}
          </FormField>

          <FormField control={form.control} name="model_rpm_limit" label="按 Model 的 RPM 限制">
            {(field) => (
              <Textarea
                {...field}
                value={(field.value as string | undefined) ?? ""}
                rows={4}
                placeholder='{"gpt-4": 100, "claude-v1": 200}'
              />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="default_estimated_output_tokens"
            label={labelWithHint("预估输出 Token 数", estimateTooltip.estimate)}
          >
            {({ ref: _ref, ...field }) => (
              <NumericalInput {...field} value={field.value ?? ""} min={1} step={1} disabled={!canEditEstimates} />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="default_estimated_output_tokens_per_model"
            label={labelWithHint("按 Model 的预估输出 Token 数", estimateTooltip.perModel)}
          >
            {(field) => (
              <Textarea
                {...field}
                value={(field.value as string | undefined) ?? ""}
                rows={4}
                placeholder='{"gpt-4": 4096}'
                disabled={!canEditEstimates}
              />
            )}
          </FormField>

          <Field>
            <FieldLabel>
              {labelWithHint(
                "按 Tag 的速率限制",
                "将速率限制限定到请求 Tag，使每个 Tag（例如某个单元或分组）拥有独立的 RPM 计数器。没有匹配 Tag 的请求回退到 Key 级限制。",
              )}
            </FieldLabel>
            <TagRateLimitEditor value={tagRateLimits} onChange={setTagRateLimits} />
          </Field>

          <FormField control={form.control} name="guardrails" label="护栏">
            {({ value, onChange }) =>
              accessToken ? (
                <GuardrailSelector
                  onChange={onChange}
                  value={value as string[] | undefined}
                  accessToken={accessToken}
                  disabled={!canEditGuardrails}
                />
              ) : (
                <div />
              )
            }
          </FormField>

          {userRole != null && isProxyAdminRole(userRole) && (
            <FormField
              control={form.control}
              name="disable_global_guardrails"
              label={labelWithHint(
                "禁用全局 Guardrails",
                "启用后，此 Key 将绕过配置为对每个请求运行的 Guardrails（全局 Guardrails）",
              )}
            >
              {({ value, onChange, ref: _ref, ...field }) => (
                <Switch {...field} checked={Boolean(value)} onCheckedChange={onChange} disabled={!canEditGuardrails} />
              )}
            </FormField>
          )}

          {canViewPolicies && (
            <FormField
              control={form.control}
              name="policies"
              label={labelWithHint("Policies", "为此 Key 应用 Policies，用于控制 Guardrails 和其他设置")}
            >
              {({ value, onChange }) =>
                accessToken ? (
                  <PolicySelector
                    onChange={onChange}
                    value={value as string[] | undefined}
                    accessToken={accessToken}
                    disabled={!premiumUser}
                  />
                ) : (
                  <div />
                )
              }
            </FormField>
          )}

          <FormField control={form.control} name="tags" label="标签">
            {({ value, onChange, id }) => (
              <TagsInput
                id={id}
                value={(value as string[] | undefined) ?? []}
                onValueChange={onChange}
                options={Object.values(tagsList).map((tag) => ({ value: tag.name, label: tag.name }))}
                placeholder="选择或Type Tag"
              />
            )}
          </FormField>

          {canViewPrompts && (
            <FormField
              control={form.control}
              name="prompts"
              label={premiumUser ? "Prompts" : labelWithHint("Prompts", "按 Key 设置 Prompt 是 Premium 功能")}
            >
              {({ value, onChange, id }) => (
                <TagsInput
                  id={id}
                  value={(value as string[] | undefined) ?? []}
                  onValueChange={onChange}
                  options={promptsList.map((name) => ({ value: name, label: name }))}
                  disabled={!premiumUser}
                  placeholder={currentValuePlaceholder(
                    premiumUser,
                    keyData.metadata?.prompts,
                    "Premium 功能，升级后可按 Key 设置 Prompts",
                    "选择或Type Prompts",
                  )}
                />
              )}
            </FormField>
          )}

          <FormField
            control={form.control}
            name="access_group_ids"
            label={labelWithHint(
              "访问组",
              "为此 Key 分配 Access Group。Access Group 控制此 Key 可使用哪些 Models、MCP Server 和 Agent。",
            )}
          >
            {({ value, onChange }) => (
              <AccessGroupSelector
                value={value as string[] | undefined}
                onChange={onChange}
                placeholder="选择 Access Group（可选）"
              />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="allowed_passthrough_routes"
            label={
              premiumUser
                ? "允许的透传路由"
                : labelWithHint(
                    "允许的透传路由",
                    "按 Key 设置允许的透传路由是 Premium 功能",
                  )
            }
          >
            {({ value, onChange }) => (
              <PassThroughRoutesSelector
                value={value as string[] | undefined}
                onChange={onChange}
                accessToken={accessToken || ""}
                placeholder={currentValuePlaceholder(
                  premiumUser,
                  keyData.metadata?.allowed_passthrough_routes,
                  "Premium 功能，升级后可按 Key 设置允许的透传路由",
                  "选择或输入允许的透传路由",
                )}
                disabled={!premiumUser}
              />
            )}
          </FormField>

          <FormField control={form.control} name="vector_stores" label="向量库">
            {({ value, onChange }) => (
              <VectorStoreSelector
                onChange={onChange}
                value={value as string[] | undefined}
                accessToken={accessToken || ""}
                placeholder="选择 Vector Store"
              />
            )}
          </FormField>

          <FormField control={form.control} name="mcp_servers_and_groups" label="MCP 服务器 / 访问组">
            {({ value, onChange }) => (
              <MCPServerSelector
                onChange={onChange}
                value={value as McpServersAndGroups | undefined}
                accessToken={accessToken || ""}
                placeholder="选择 MCP Server 或 Access Group（可选）"
                allowNoMcpServers
              />
            )}
          </FormField>

          <div className="mb-6">
            <MCPToolPermissions
              accessToken={accessToken || ""}
              selectedServers={mcpSelection?.servers || []}
              selectedAccessGroups={mcpSelection?.accessGroups || []}
              selectedToolsets={mcpSelection?.toolsets || []}
              toolPermissions={(mcpToolPermissions as Record<string, string[]> | undefined) || {}}
              onChange={(toolPerms) => form.setValue("mcp_tool_permissions", toolPerms)}
            />
          </div>

          <KeyAgentAndSkillFields control={form.control} accessToken={accessToken || ""} />

          <FormField
            control={form.control}
            name="organization_id"
            label={labelWithHint(
              "组织",
              "此 Key 所属的 Organization。选择 Organization 后会筛选可用的 Team。",
            )}
            description={hasProject ? "此 Key 属于某个项目，Organization 已锁定" : undefined}
          >
            {({ value, onChange, id }) => (
              <OrganizationDropdown
                id={id}
                value={value}
                organizations={organizations}
                loading={isOrganizationsLoading}
                disabled={userRole !== "Admin" || hasProject}
                onChange={(orgId) => handleOrganizationChange(onChange, orgId)}
              />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="team_id"
            label="团队 ID"
            description={hasProject ? "此 Key 属于某个项目，Team 已锁定" : undefined}
          >
            {({ value, onChange, id }) => (
              <Select
                value={(value as string | null) ?? null}
                onValueChange={(teamId: string | null) => handleTeamChange(onChange, teamId)}
                disabled={hasProject}
                items={Object.fromEntries(
                  (visibleTeams ?? []).map((t) => [t.team_id, `${t.team_alias} (${t.team_id})`]),
                )}
              >
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="选择 Team" />
                </SelectTrigger>
                <SelectContent>
                  {visibleTeams?.map((t) => (
                    <SelectItem key={t.team_id} value={t.team_id}>
                      {`${t.team_alias} (${t.team_id})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {enableProjectsUI && hasProject && (
            <KeyProjectField
              projectId={keyData.project_id}
              canDetach={canDetachProject}
              pending={detachProject}
              disabled={isKeySaving}
              onToggle={() => form.setValue("project_id", detachProject ? keyData.project_id : null)}
            />
          )}

          <Field>
            <FieldLabel>Router 设置</FieldLabel>
            <RouterSettingsAccordion
              ref={routerSettingsRef}
              accessToken={accessToken || ""}
              teamId={keyData.team_id}
              value={routerSettingsEditorValue(keyData.router_settings)}
            />
          </Field>

          <FormField control={form.control} name="logging_settings" label="日志设置">
            {({ value, onChange }) => (
              <EditLoggingSettings
                value={(value as unknown[] | undefined) ?? []}
                onChange={onChange}
                disabledCallbacks={disabledCallbacks}
                onDisabledCallbacksChange={handleDisabledCallbacksChange}
              />
            )}
          </FormField>

          <KeyMetadataField form={form} />

          <div className="mb-4">
            <FormField control={form.control} name="duration">
              {({ value, onChange, id }) => (
                <KeyLifecycleSettings
                  id={id}
                  value={(value as string | null) ?? ""}
                  onChange={onChange}
                  autoRotationEnabled={autoRotationEnabled}
                  onAutoRotationChange={setAutoRotationEnabled}
                  rotationInterval={rotationInterval}
                  onRotationIntervalChange={setRotationInterval}
                  neverExpire={neverExpire}
                  onNeverExpireChange={setNeverExpire}
                />
              )}
            </FormField>
          </div>
        </FieldGroup>

        <div className="sticky z-chrome bg-background p-4 border-t border-border -bottom-6 -inset-x-6">
          <div className="flex justify-end items-center gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isKeySaving}>
              取消
            </Button>
            <Button type="submit" disabled={isKeySaving} aria-busy={isKeySaving}>
              {isKeySaving && <UiLoadingSpinner className="size-4" />}
              保存更改
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
