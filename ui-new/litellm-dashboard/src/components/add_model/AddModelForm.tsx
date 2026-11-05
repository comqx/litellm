import { useProviderFields } from "@/app/(dashboard)/hooks/providers/useProviderFields";
import { useGuardrails } from "@/app/(dashboard)/hooks/guardrails/useGuardrails";
import { useTags } from "@/app/(dashboard)/hooks/tags/useTags";
import { all_admin_roles, isUserTeamAdminForAnyTeam } from "@/utils/roles";
import { modelCreationScope } from "@/utils/modelPermissions";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect, type SearchSelectOption } from "@/components/shared/SearchSelect";
import { credentialOptions } from "@/components/shared/credentialOptions";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useWatch, type UseFormReturn } from "react-hook-form";
import TeamDropdown from "../common_components/team_dropdown";
import { requiredRule } from "../common_components/formRules";
import { labelWithHint } from "@/components/shared/form/LabelWithHint";
import {
  MountedFormField,
  MountedFormProvider,
  type MountRegistry,
  type MountedFormValues,
} from "../common_components/MountedFormField";
import type { Team } from "../key_team_helpers/key_list";
import { type CredentialItem, type ProviderCreateInfo, credentialCreateCall, modelAvailableCall } from "../networking";
import CredentialModal from "../model_add/CredentialModal";
import { federatedProviderOf } from "../model_add/credential_federation";
import { buildCredential, type CredentialSubmission } from "../model_add/credential_form_helpers";
import { ProviderLogo } from "../molecules/models/ProviderLogo";
import AccessGroupTagsCombobox from "./AccessGroupTagsCombobox";
import AdvancedSettings from "./advanced_settings";
import ConditionalPublicModelName from "./conditional_public_model_name";
import LiteLLMModelNameField from "./litellm_model_name";
import ConnectionErrorDisplay from "./model_connection_test";
import ProviderSpecificFields from "./provider_specific_fields";
import { TEST_MODES } from "./add_model_modes";
import DecisionModelNote from "./DecisionModelNote";
import { type DecisionCatalog } from "@/lib/decisionModels";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { credentialsKeys } from "@/app/(dashboard)/hooks/credentials/useCredentials";
import { extractProxyErrorMessage } from "@/lib/http/client";
import { toast } from "@/lib/toast";
import { isProxyAdminRole } from "@/utils/roles";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AddModelFormProps {
  form: UseFormReturn<MountedFormValues>; // For the Add Model tab
  registry: MountRegistry;
  mountedValues: () => MountedFormValues;
  handleOk: () => Promise<boolean>;
  selectedProvider: string | null;
  setSelectedProvider: (provider: string | null) => void;
  providerModels: string[];
  getPlaceholder: (provider: string) => string;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  teams: Team[] | null;
  credentials: CredentialItem[];
  decisionCatalog: DecisionCatalog;
}

const connectionTestModelName = (values: MountedFormValues): string | undefined => {
  const named = values.model_name || values.model;
  if (Array.isArray(named)) {
    return named.join(", ");
  }
  return typeof named === "string" ? named : undefined;
};

const AddModelForm: React.FC<AddModelFormProps> = ({
  form,
  registry,
  mountedValues,
  handleOk,
  selectedProvider,
  setSelectedProvider,
  providerModels,
  getPlaceholder,
  showAdvancedSettings,
  setShowAdvancedSettings,
  teams,
  credentials,
  decisionCatalog,
}) => {
  const [testMode, setTestMode] = useState<string>("chat");
  const [isResultModalVisible, setIsResultModalVisible] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  // Using a unique ID to force the ConnectionErrorDisplay to remount and run a fresh test
  const [connectionTestId, setConnectionTestId] = useState<string>("");

  const { accessToken, userRole, premiumUser, userId, isViewOnly } = useAuthorized();
  const {
    data: providerMetadata,
    isLoading: isProviderMetadataLoading,
    error: providerMetadataError,
  } = useProviderFields();
  const { data: guardrailsData } = useGuardrails();
  const guardrailsList = guardrailsData?.guardrails.map((g) => g.guardrail_name);
  const { data: tagsList } = useTags();
  const selectedCredentialName = useWatch({ control: form.control, name: "litellm_credential_name" });
  const pickedProvider = useWatch({ control: form.control, name: "custom_llm_provider" });
  const queryClient = useQueryClient();
  const [isFederatedCredentialModalOpen, setIsFederatedCredentialModalOpen] = useState(false);
  const canCreateFederatedCredential =
    isProxyAdminRole(userRole ?? "") && federatedProviderOf(selectedProvider) !== null;

  const handleCreateFederatedCredential = async (submission: CredentialSubmission) => {
    const credential = buildCredential(submission, submission.credential_values);
    try {
      await credentialCreateCall(accessToken, credential);
    } catch (error) {
      toast.error(extractProxyErrorMessage(error));
      return;
    }
    toast.success("凭证添加成功");
    setIsFederatedCredentialModalOpen(false);
    await queryClient.invalidateQueries({ queryKey: credentialsKeys.all });
    form.setValue("litellm_credential_name", credential.credential_name, { shouldDirty: true });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestId(`test-${Date.now()}`);
    setIsResultModalVisible(true);
  };

  const [isTeamOnly, setIsTeamOnly] = useState<boolean>(false);
  const [modelAccessGroups, setModelAccessGroups] = useState<string[]>([]);
  // Team admin specific state
  const [teamAdminSelectedTeam, setTeamAdminSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    const fetchModelAccessGroups = async () => {
      const response = await modelAvailableCall(accessToken, "", "", false, null, true, true);
      setModelAccessGroups(response["data"].map((model: any) => model["id"]));
    };
    fetchModelAccessGroups();
  }, [accessToken]);

  const sortedProviderMetadata: ProviderCreateInfo[] = useMemo(() => {
    if (!providerMetadata) {
      return [];
    }
    return [...providerMetadata].sort((a, b) => a.provider_display_name.localeCompare(b.provider_display_name));
  }, [providerMetadata]);

  const providerOptions: SearchSelectOption[] = useMemo(
    () =>
      sortedProviderMetadata.map((providerInfo) => ({
        label: providerInfo.provider_display_name,
        value: providerInfo.provider,
        icon: <ProviderLogo provider={providerInfo.provider} className="w-5 h-5" />,
      })),
    [sortedProviderMetadata],
  );

  const pickedLitellmProvider = sortedProviderMetadata.find(
    (providerInfo) => providerInfo.provider === pickedProvider,
  )?.litellm_provider;

  const credentialSelectOptions: SearchSelectOption[] = useMemo(() => credentialOptions(credentials), [credentials]);

  const applyProviderSelection = (provider: string | null) => {
    setSelectedProvider(provider);
    form.setValue("model", []);
    form.setValue("model_name", undefined);
  };

  const providerMetadataErrorText = providerMetadataError
    ? providerMetadataError instanceof Error
      ? providerMetadataError.message
      : "加载供应商失败"
    : null;

  const isAdmin = all_admin_roles.includes(userRole);
  const isTeamAdmin = isUserTeamAdminForAnyTeam(teams, userId);
  // Same owner the Auto-Routers tab uses, so the two creation forms cannot disagree about
  // who has to name a team. This form is only reachable when creation is allowed at all.
  const createScope = modelCreationScope(
    { userRole, userID: userId, isViewOnly },
    { teams, disabledForInternalUsers: false },
  );
  const requiresTeamScope = createScope === "team-required";

  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold text-foreground">添加模型</h2>

      <Card>
        <CardContent>
          <FormProvider {...form}>
            <MountedFormProvider value={{ control: form.control, registry }}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleOk().then((submitted) => {
                    if (submitted) {
                      setTeamAdminSelectedTeam(null);
                    }
                  });
                }}
              >
                <>
                  {requiresTeamScope && (
                    <>
                      <MountedFormField
                        label={labelWithHint("选择团队", "选择要添加此模型的团队")}
                        name="team_id"
                        required
                        rules={{ validate: { required: requiredRule("请选择团队以继续") } }}
                        className="mb-4"
                      >
                        {(control) => (
                          <TeamDropdown
                            value={control.value as string | undefined}
                            onChange={(value) => {
                              control.onChange(value);
                              setTeamAdminSelectedTeam(value);
                            }}
                          />
                        )}
                      </MountedFormField>
                      {!teamAdminSelectedTeam && (
                        <Alert variant="info" className="mb-4">
                          <Info />
                          <AlertTitle>需要选择团队</AlertTitle>
                          <AlertDescription>
                            作为团队管理员，你需要先选择你的团队，然后才能添加模型。
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                  {(isAdmin || (isTeamAdmin && teamAdminSelectedTeam)) && (
                    <>
                      <MountedFormField
                        label={labelWithHint("供应商", "例如 OpenAI、Azure OpenAI、Anthropic、Bedrock 等")}
                        name="custom_llm_provider"
                        required
                        rules={{ validate: { required: requiredRule("必填") } }}
                        className="mb-4"
                      >
                        {(control) => (
                          <SearchSelect
                            inputId={control.id}
                            options={providerOptions}
                            emptyText={providerMetadataErrorText ?? "未找到供应商"}
                            placeholder={isProviderMetadataLoading ? "加载供应商中…" : "选择供应商"}
                            value={typeof control.value === "string" ? control.value : null}
                            onValueChange={(value) => {
                              control.onChange(value);
                              applyProviderSelection(value);
                            }}
                          />
                        )}
                      </MountedFormField>
                      <LiteLLMModelNameField
                        selectedProvider={selectedProvider}
                        providerModels={providerModels}
                        getPlaceholder={getPlaceholder}
                      />
                      <DecisionModelNote catalog={decisionCatalog} litellmProvider={pickedLitellmProvider} />

                      {/* Conditionally Render "公开模型名称" */}
                      <ConditionalPublicModelName />

                      {/* Select Mode */}
                      <MountedFormField label="模式" name="mode" className="mb-1">
                        {(control) => (
                          <Select
                            items={TEST_MODES}
                            value={(control.value as string | undefined) ?? null}
                            onValueChange={(value: string | null) => {
                              control.onChange(value);
                              setTestMode(value ?? "");
                            }}
                          >
                            <SelectTrigger id={control.id} className="w-full" aria-label="模式">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEST_MODES.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </MountedFormField>
                      <div className="grid grid-cols-12">
                        <div className="col-span-5" />
                        <div className="col-span-5">
                          <p className="text-sm mb-5 mt-1">
                            <strong>可选</strong> - 健康检查此模型时使用的 LiteLLM 端点{" "}
                            <a
                              href="https://docs.litellm.ai/docs/proxy/health#health"
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              了解更多
                            </a>
                          </p>
                        </div>
                      </div>

                      {/* Credentials */}
                      <div className="mb-4">
                        <span className="text-sm text-muted-foreground">
                          选择已有凭证，或在下方输入新的供应商凭证
                        </span>
                      </div>

                      <MountedFormField
                        label="已有凭证"
                        name="litellm_credential_name"
                        defaultValue={null}
                        className="mb-4"
                      >
                        {(control) => (
                          <SearchSelect
                            inputId={control.id}
                            placeholder="选择或搜索已有凭证"
                            options={credentialSelectOptions}
                            value={(control.value as string | null | undefined) ?? ""}
                            onValueChange={(value) => control.onChange(value === "" ? null : value)}
                          />
                        )}
                      </MountedFormField>

                      {/* Only show provider specific fields if no credentials selected */}
                      {!selectedCredentialName && (
                        <>
                          <div className="flex items-center my-4">
                            <div className="grow border-t border-border"></div>
                            <span className="px-4 text-muted-foreground text-sm">OR</span>
                            <div className="grow border-t border-border"></div>
                          </div>
                          <ProviderSpecificFields selectedProvider={selectedProvider} />
                          {canCreateFederatedCredential && (
                            <div className="mb-4 flex flex-col items-start gap-2">
                              <span className="text-sm text-muted-foreground">
                                Workload identity federation is saved as a credential, then attached to this model.
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFederatedCredentialModalOpen(true)}
                              >
                                Use workload identity federation
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex items-center my-4">
                        <div className="grow border-t border-border"></div>
                        <span className="px-4 text-muted-foreground text-sm">其他模型信息设置</span>
                        <div className="grow border-t border-border"></div>
                      </div>
                      {/* Team-only Model Switch - Only show for proxy admins, not team admins */}
                      {(isAdmin || !isTeamAdmin) && (
                        <Field className="mb-4">
                          <FieldLabel>
                            {labelWithHint(
                              "Team-BYOK 模型",
                              "仅为此团队使用此模型与凭证组合。适用于团队想要使用自己的 OpenAI Key 的场景。",
                            )}
                          </FieldLabel>
                          <SimpleTooltip
                            content={
                              !premiumUser
                                ? "这是企业版功能。升级到高级版以将模型与凭证组合限制到特定团队。"
                                : ""
                            }
                            side="top"
                          >
                            <span className="inline-flex">
                              <Switch
                                checked={isTeamOnly}
                                onCheckedChange={(checked) => {
                                  setIsTeamOnly(checked);
                                  if (!checked) {
                                    form.setValue("team_id", undefined);
                                  }
                                }}
                                disabled={!premiumUser}
                                aria-label="Team-BYOK 模型"
                              />
                            </span>
                          </SimpleTooltip>
                        </Field>
                      )}

                      {/* Conditional Team Selection */}
                      {isTeamOnly && !requiresTeamScope && (
                        <MountedFormField
                          label={labelWithHint(
                            "选择团队",
                            "只有此团队的 Key 才能调用此模型。",
                          )}
                          name="team_id"
                          className="mb-4"
                          required={isTeamOnly && !isAdmin}
                          rules={
                            isTeamOnly && !isAdmin
                              ? { validate: { required: requiredRule("请选择团队。") } }
                              : undefined
                          }
                        >
                          {(control) => (
                            <TeamDropdown
                              value={control.value as string | undefined}
                              onChange={control.onChange}
                              disabled={!premiumUser}
                            />
                          )}
                        </MountedFormField>
                      )}
                      {isAdmin && (
                        <>
                          <MountedFormField
                            label={labelWithHint(
                              "模型访问组",
                              "使用 模型访问组 让用户访问指定的 模型，并可以随时间向组内添加新 Model。",
                            )}
                            name="model_access_group"
                            className="mb-4"
                          >
                            {(control) => (
                              <AccessGroupTagsCombobox
                                id={control.id}
                                value={control.value as string[] | undefined}
                                onChange={control.onChange}
                                options={modelAccessGroups}
                                ariaInvalid={control["aria-invalid"] ? true : undefined}
                                ariaDescribedBy={control["aria-describedby"]}
                              />
                            )}
                          </MountedFormField>
                        </>
                      )}
                      <AdvancedSettings
                        showAdvancedSettings={showAdvancedSettings}
                        setShowAdvancedSettings={setShowAdvancedSettings}
                        teams={teams}
                        guardrailsList={guardrailsList || []}
                        tagsList={tagsList || {}}
                        accessToken={accessToken || ""}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <SimpleTooltip content="在我们的 GitHub 上获取帮助">
                      <a
                        href="https://github.com/BerriAI/litellm/issues"
                        className="text-sm text-primary hover:underline"
                      >
                        需要帮助？
                      </a>
                    </SimpleTooltip>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        data-testid="test-connect-btn"
                        onClick={handleTestConnection}
                        disabled={isTestingConnection}
                        aria-busy={isTestingConnection}
                      >
                        测试连接
                      </Button>
                      <Button data-testid="add-model-btn" type="submit">
                        添加模型
                      </Button>
                    </div>
                  </div>
                </>
              </form>
            </MountedFormProvider>
          </FormProvider>
        </CardContent>
      </Card>

      {isFederatedCredentialModalOpen && (
        <CredentialModal
          open
          mode="add"
          initialProvider={selectedProvider}
          initialAuthMethod="federation"
          providerLocked
          onCancel={() => setIsFederatedCredentialModalOpen(false)}
          onSubmit={handleCreateFederatedCredential}
        />
      )}
      {/* Test Connection Results Modal */}
      <Dialog
        open={isResultModalVisible}
        onOpenChange={(open) => {
          if (!open) {
            setIsResultModalVisible(false);
            setIsTestingConnection(false);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>连接测试结果</DialogTitle>
          </DialogHeader>
          {/* Only render the ConnectionErrorDisplay when modal is visible and we have a test ID */}
          {isResultModalVisible && (
            <ConnectionErrorDisplay
              // The key prop tells React to create a fresh component instance when it changes
              key={connectionTestId}
              formValues={mountedValues()}
              accessToken={accessToken}
              testMode={testMode}
              modelName={connectionTestModelName(form.getValues())}
              onClose={() => {
                setIsResultModalVisible(false);
                setIsTestingConnection(false);
              }}
              onTestComplete={() => setIsTestingConnection(false)}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResultModalVisible(false);
                setIsTestingConnection(false);
              }}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddModelForm;
