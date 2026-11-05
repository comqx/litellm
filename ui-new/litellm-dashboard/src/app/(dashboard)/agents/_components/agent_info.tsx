import { AgentIdentityFields } from "./AgentIdentityFields";
import { AgentIdentityDetails } from "./AgentIdentityDetails";
import { withAgentIdentity } from "./agent_identity";
import React, { useState, useEffect, useMemo } from "react";
import { cx } from "@/lib/cva.config";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { ArrowLeft } from "lucide-react";
import { getAgentInfo, patchAgentCall, getAgentCreateMetadata, AgentCreateInfo } from "@/components/networking";
import { Agent } from "@/components/agents/types";
import { KeyResponse } from "@/components/key_team_helpers/key_list";
import { useKeys } from "@/app/(dashboard)/hooks/keys/useKeys";
import { useMCPServers } from "@/app/(dashboard)/hooks/mcpServers/useMCPServers";
import { useAccessGroups } from "@/app/(dashboard)/hooks/accessGroups/useAccessGroups";
import AccessGroupSelector from "@/components/common_components/AccessGroupSelector";
import KeyInfoView from "@/components/templates/key_info_view";
import MCPServerSelector from "@/components/mcp_server_management/MCPServerSelector";
import MCPToolPermissions from "@/components/mcp_server_management/MCPToolPermissions";
import AgentVirtualKeys from "./agent_virtual_keys";
import AgentKillSwitchDangerZone from "./AgentKillSwitchDangerZone";
import AgentFormFields, { unmountedA2AFieldNames } from "./agent_form_fields";
import DynamicAgentFormFields, { buildDynamicAgentData, unmountedDynamicFieldNames } from "./dynamic_agent_form_fields";
import {
  AGENT_FORM_CONFIG,
  buildAgentDataFromForm,
  buildMcpObjectPermission,
  parseAccessGroupIdsForForm,
  parseAgentForForm,
  parseMcpPermissionsForForm,
} from "./agent_config";
import {
  AgentFormField,
  AgentFormValues,
  AgentNumberInput,
  AgentRequestPayload,
  McpServerSelection,
  labelWithHint,
  omitFieldValues,
  useCollapsiblePanels,
} from "./AgentFormKit";
import AgentCostView from "./agent_cost_view";
import { detectAgentType, parseDynamicAgentForForm } from "./agent_type_utils";
import AgentCardDiscovery, { DiscoveredAgentCardSelection } from "./agent_card_discovery";
import { buildDiscoveryRequest, overlayDiscoveredCardParams } from "./agent_discovery_utils";

interface AgentInfoViewProps {
  agentId: string;
  onClose: () => void;
  accessToken: string | null;
  isAdmin: boolean;
}

const DetailList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <dl
    className={cx(
      "grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] overflow-hidden rounded-lg border border-border text-sm",
      className,
    )}
  >
    {children}
  </dl>
);

const DetailItem: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="border-b border-border bg-muted px-4 py-3 font-medium text-foreground last-of-type:border-b-0">
      {label}
    </dt>
    <dd className="border-b border-border px-4 py-3 break-words text-foreground last-of-type:border-b-0">{children}</dd>
  </>
);

const AgentInfoView: React.FC<AgentInfoViewProps> = ({ agentId, onClose, accessToken, isAdmin }) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyResponse | null>(null);
  const { data: keysData, isLoading: keysLoading, refetch: refetchAgentKeys } = useKeys(1, 100, { agentID: agentId });
  const agentKeys = keysData?.keys ?? [];
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<AgentFormValues>({ defaultValues: {} });
  const panels = useCollapsiblePanels([AGENT_FORM_CONFIG.basic.key]);
  const [agentTypeMetadata, setAgentTypeMetadata] = useState<AgentCreateInfo[]>([]);
  const [detectedAgentType, setDetectedAgentType] = useState<string>("a2a");
  const [appliedDiscoveredSelection, setAppliedDiscoveredSelection] = useState<DiscoveredAgentCardSelection | null>(
    null,
  );

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = await getAgentCreateMetadata();
        setAgentTypeMetadata(metadata);
      } catch (error) {
        console.error("Error fetching agent metadata:", error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAgentInfo();
  }, [agentId, accessToken]);

  const fetchAgentInfo = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const data = await getAgentInfo(accessToken, agentId);
      setAgent(data);

      // Detect agent type
      const agentType = detectAgentType(data);
      setDetectedAgentType(agentType);

      // Parse form values based on agent type
      if (agentType === "a2a") {
        form.reset(parseAgentForForm(data));
      } else {
        const typeInfo = agentTypeMetadata.find((t) => t.agent_type === agentType);
        if (typeInfo) {
          form.reset({
            ...parseDynamicAgentForForm(data, typeInfo),
            ...parseMcpPermissionsForForm(data),
            ...parseAccessGroupIdsForForm(data),
          });
        } else {
          form.reset(parseAgentForForm(data));
        }
      }
    } catch (error) {
      console.error("Error fetching agent info:", error);
      toast.error("加载 Agent 信息失败");
    } finally {
      setIsLoading(false);
    }
  };

  // Re-parse form when metadata is loaded
  useEffect(() => {
    if (agent && agentTypeMetadata.length > 0) {
      const agentType = detectAgentType(agent);
      if (agentType !== "a2a") {
        const typeInfo = agentTypeMetadata.find((t) => t.agent_type === agentType);
        if (typeInfo) {
          form.reset({
            ...parseDynamicAgentForForm(agent, typeInfo),
            ...parseMcpPermissionsForForm(agent),
            ...parseAccessGroupIdsForForm(agent),
          });
        }
      }
    }
  }, [agentTypeMetadata, agent]);

  const selectedAgentTypeInfo = agentTypeMetadata.find((t) => t.agent_type === detectedAgentType);
  const watchedFormValues = useWatch({ control: form.control });
  const mcpSelection = useWatch({ control: form.control, name: "allowed_mcp_servers_and_groups" });
  const mcpToolPermissions = useWatch({ control: form.control, name: "mcp_tool_permissions" });
  const { data: mcpServers = [] } = useMCPServers();
  const { data: accessGroups = [] } = useAccessGroups();

  const mcpServerLabel = (serverId: string) => {
    const server = mcpServers.find((s) => s.server_id === serverId);
    return server?.server_name ? `${server.server_name} (${serverId})` : serverId;
  };

  const accessGroupLabel = (accessGroupId: string) => {
    const group = accessGroups.find((g) => g.access_group_id === accessGroupId);
    return group ? `${group.access_group_name} (${accessGroupId})` : accessGroupId;
  };

  const discoveryRequest = useMemo(
    () => buildDiscoveryRequest(detectedAgentType, watchedFormValues || {}, selectedAgentTypeInfo),
    [watchedFormValues, selectedAgentTypeInfo, detectedAgentType],
  );

  const handleApplyDiscoveredCard = (selection: DiscoveredAgentCardSelection | null) => {
    setAppliedDiscoveredSelection(selection);
    if (!selection) return;
    const { selected_card } = selection;
    const skills = (selected_card.skills ?? []).map((s) => ({
      id: s.id ?? "",
      name: s.name ?? "",
      description: s.description ?? "",
      tags: s.tags ?? [],
      examples: s.examples ?? [],
    }));

    const urlCredentialKeys = (selectedAgentTypeInfo?.credential_fields ?? [])
      .map((f) => f.key)
      .filter((key) => /(^|_)(url|api_base|endpoint)$/i.test(key));

    const fieldsToSet: AgentFormValues = {
      name: selected_card.name ?? undefined,
      description: selected_card.description ?? undefined,
      url: selection.upstream_url,
      streaming: Boolean(selected_card.capabilities?.streaming),
      skills,
      iconUrl: selected_card.iconUrl ?? undefined,
      documentationUrl: selected_card.documentationUrl ?? undefined,
      ...Object.fromEntries(urlCredentialKeys.map((key) => [key, selection.upstream_url])),
    };

    for (const [key, value] of Object.entries(fieldsToSet)) {
      form.setValue(key, value);
    }
  };

  const usesDynamicFields = detectedAgentType !== "a2a" && selectedAgentTypeInfo !== undefined;

  const handleUpdate = async (submitted: AgentFormValues) => {
    if (!accessToken || !agent) return;

    setIsSaving(true);
    try {
      const values = omitFieldValues(
        submitted,
        usesDynamicFields
          ? unmountedDynamicFieldNames(panels.mountedPanels)
          : unmountedA2AFieldNames(panels.mountedPanels),
      );

      const built: AgentRequestPayload = usesDynamicFields
        ? { ...buildDynamicAgentData(values, selectedAgentTypeInfo, agent), agent_name: values.agent_name }
        : buildAgentDataFromForm(values, agent);

      const updateData = appliedDiscoveredSelection
        ? overlayDiscoveredCardParams(built, appliedDiscoveredSelection.selected_card)
        : built;
      const cardEdited =
        Boolean(appliedDiscoveredSelection) ||
        [AGENT_FORM_CONFIG.basic, AGENT_FORM_CONFIG.skills, AGENT_FORM_CONFIG.capabilities, AGENT_FORM_CONFIG.optional]
          .flatMap((section) => section.fields)
          .some((field) => form.getFieldState(field.name).isDirty);

      await patchAgentCall(accessToken, agentId, {
        ...withAgentIdentity(updateData, values, agent, cardEdited),
        object_permission: buildMcpObjectPermission(values),
        access_group_ids: values.access_group_ids ?? [],
      });
      toast.success("Agent 已更新");
      setIsEditing(false);
      fetchAgentInfo();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("更新 Agent 失败");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <UiLoadingSpinner className="size-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4">
        <div className="text-center">未找到 Agent</div>
        <Button onClick={onClose} className="mt-4">
          返回 Agent 列表
        </Button>
      </div>
    );
  }

  // Format date helper function
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const rateLimitField = (name: keyof AgentFormValues & string, label: string) => (
    <AgentFormField name={name} label={label}>
      {({ value, onChange, ref, ...control }) => (
        <AgentNumberInput
          {...control}
          value={value}
          onChange={onChange}
          inputRef={ref}
          min={0}
          placeholder="无限制"
        />
      )}
    </AgentFormField>
  );

  if (selectedKey) {
    return (
      <KeyInfoView
        keyId={selectedKey.token}
        keyData={selectedKey}
        onClose={() => setSelectedKey(null)}
        onDelete={() => {
          setSelectedKey(null);
          refetchAgentKeys();
        }}
        teams={null}
        backButtonText="返回 Agent"
      />
    );
  }

  return (
    <div className="p-4">
      <div>
        <Button variant="ghost" onClick={onClose} className="mb-4">
          <ArrowLeft className="size-4" />
          返回智能体
        </Button>
        <h1 className="text-2xl font-semibold">{agent.agent_name || "未命名 Agent"}</h1>
        <p className="text-sm text-muted-foreground font-mono">{agent.agent_id}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-4 h-auto w-full justify-start rounded-none border-b p-0">
          <TabsTrigger value="overview" className="flex-none rounded-none px-4 py-2">
            概览
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="flex-none rounded-none px-4 py-2">
              设置
            </TabsTrigger>
          )}
        </TabsList>

        <div>
          {/* Overview Panel */}
          <TabsContent value="overview" keepMounted>
            <AgentIdentityDetails
              agentId={agentId}
              identity={agent.identity}
              accessToken={accessToken}
              isAdmin={isAdmin}
            />
            <DetailList>
              <DetailItem label="智能体 ID">{agent.agent_id}</DetailItem>
              <DetailItem label="智能体名称">{agent.agent_name}</DetailItem>
              <DetailItem label="显示名称">{agent.agent_card_params?.name || "-"}</DetailItem>
              <DetailItem label="描述">{agent.agent_card_params?.description || "-"}</DetailItem>
              <DetailItem label="URL">{agent.agent_card_params?.url || "-"}</DetailItem>
              <DetailItem label="版本">{agent.agent_card_params?.version || "-"}</DetailItem>
              <DetailItem label="协议版本">{agent.agent_card_params?.protocolVersion || "-"}</DetailItem>
              <DetailItem label="流式响应">
                {agent.agent_card_params?.capabilities?.streaming ? "是" : "否"}
              </DetailItem>
              {agent.agent_card_params?.capabilities?.pushNotifications && (
                <DetailItem label="推送通知">是</DetailItem>
              )}
              {agent.agent_card_params?.capabilities?.stateTransitionHistory && (
                <DetailItem label="状态迁移历史">是</DetailItem>
              )}
              <DetailItem label="技能">{agent.agent_card_params?.skills?.length || 0} 项已配置</DetailItem>
              {agent.litellm_params?.model && <DetailItem label="模型">{agent.litellm_params.model}</DetailItem>}
              {agent.litellm_params?.make_public !== undefined && (
                <DetailItem label="公开访问">{agent.litellm_params.make_public ? "是" : "否"}</DetailItem>
              )}
              {agent.agent_card_params?.iconUrl && (
                <DetailItem label="图标 URL">{agent.agent_card_params.iconUrl}</DetailItem>
              )}
              {agent.agent_card_params?.documentationUrl && (
                <DetailItem label="文档 URL">{agent.agent_card_params.documentationUrl}</DetailItem>
              )}
              <DetailItem label="TPM 上限">{agent.tpm_limit ?? "无限制"}</DetailItem>
              <DetailItem label="RPM 上限">{agent.rpm_limit ?? "无限制"}</DetailItem>
              <DetailItem label="会话 TPM 上限">{agent.session_tpm_limit ?? "无限制"}</DetailItem>
              <DetailItem label="会话 RPM 上限">{agent.session_rpm_limit ?? "无限制"}</DetailItem>
              <DetailItem label="访问组">
                {agent.access_group_ids?.length ? (
                  <div className="space-y-1">
                    {agent.access_group_ids.map((accessGroupId) => (
                      <div key={accessGroupId}>{accessGroupLabel(accessGroupId)}</div>
                    ))}
                  </div>
                ) : (
                  "无"
                )}
              </DetailItem>
              <DetailItem label="创建时间">{formatDate(agent.created_at)}</DetailItem>
              <DetailItem label="更新时间">{formatDate(agent.updated_at)}</DetailItem>
            </DetailList>

            <AgentVirtualKeys keys={agentKeys} isLoading={keysLoading} onKeyClick={setSelectedKey} />

            {agent.object_permission &&
              (agent.object_permission.mcp_servers?.length ||
                agent.object_permission.mcp_access_groups?.length ||
                agent.object_permission.mcp_toolsets?.length ||
                (agent.object_permission.mcp_tool_permissions &&
                  Object.keys(agent.object_permission.mcp_tool_permissions).length > 0)) && (
                <div style={{ marginTop: 24 }}>
                  <h3 className="text-lg font-medium">Agent 设置</h3>
                  <DetailList className="mt-4">
                    {agent.object_permission.mcp_servers && agent.object_permission.mcp_servers.length > 0 && (
                      <DetailItem label="MCP 服务器">
                        <div className="space-y-1">
                          {agent.object_permission.mcp_servers.map((serverId) => (
                            <div key={serverId}>{mcpServerLabel(serverId)}</div>
                          ))}
                        </div>
                      </DetailItem>
                    )}
                    {agent.object_permission.mcp_access_groups &&
                      agent.object_permission.mcp_access_groups.length > 0 && (
                        <DetailItem label="MCP 访问组">
                          {agent.object_permission.mcp_access_groups.join(", ")}
                        </DetailItem>
                      )}
                    {agent.object_permission.mcp_toolsets && agent.object_permission.mcp_toolsets.length > 0 && (
                      <DetailItem label="MCP 工具集">{agent.object_permission.mcp_toolsets.join(", ")}</DetailItem>
                    )}
                    {agent.object_permission.mcp_tool_permissions &&
                      Object.keys(agent.object_permission.mcp_tool_permissions).length > 0 && (
                        <DetailItem label="各服务器工具权限">
                          <div className="space-y-1">
                            {Object.entries(agent.object_permission.mcp_tool_permissions).map(([serverId, tools]) => (
                              <div key={serverId}>
                                <span className="font-medium">{mcpServerLabel(serverId)}:</span>{" "}
                                {Array.isArray(tools) ? tools.join(", ") : String(tools)}
                              </div>
                            ))}
                          </div>
                        </DetailItem>
                      )}
                  </DetailList>
                </div>
              )}

            <AgentCostView agent={agent} />

            {agent.agent_card_params?.skills && agent.agent_card_params.skills.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 className="text-lg font-medium">技能</h3>
                <DetailList className="mt-4">
                  {agent.agent_card_params.skills.map((skill, index) => (
                    <DetailItem label={skill.name || `技能 ${index + 1}`} key={index}>
                      <div>
                        <div>
                          <strong>ID：</strong> {skill.id}
                        </div>
                        <div>
                          <strong>描述：</strong> {skill.description}
                        </div>
                        <div>
                          <strong>标签：</strong> {Array.isArray(skill.tags) ? skill.tags.join(", ") : skill.tags}
                        </div>
                        {skill.examples && skill.examples.length > 0 && (
                          <div>
                            <strong>示例：</strong>{" "}
                            {Array.isArray(skill.examples) ? skill.examples.join(", ") : skill.examples}
                          </div>
                        )}
                      </div>
                    </DetailItem>
                  ))}
                </DetailList>
              </div>
            )}

            <AgentKillSwitchDangerZone
              agentId={agent.agent_id}
              agentName={agent.agent_name}
              killSwitch={agent.kill_switch}
              accessToken={accessToken}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {/* Settings Panel (only for admins) */}
          {isAdmin && (
            <TabsContent value="settings" keepMounted>
              <Card className="block p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Agent 设置</h3>
                  {!isEditing && (
                    <Button
                      onClick={() => {
                        setAppliedDiscoveredSelection(null);
                        setIsEditing(true);
                      }}
                    >
                      编辑设置
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <TooltipProvider>
                    <FormProvider {...form}>
                      <form onSubmit={form.handleSubmit(handleUpdate)}>
                        <FieldGroup className="mb-4">
                          <Field>
                            <FieldLabel htmlFor="agent-id">智能体 ID</FieldLabel>
                            <Input id="agent-id" value={agent.agent_id} disabled readOnly />
                          </Field>
                        </FieldGroup>

                        {usesDynamicFields && selectedAgentTypeInfo ? (
                          <DynamicAgentFormFields agentTypeInfo={selectedAgentTypeInfo} panels={panels} />
                        ) : (
                          <AgentFormFields showAgentName={true} panels={panels} />
                        )}

                        <AgentIdentityFields accessToken={accessToken} />

                        {discoveryRequest && (
                          <div className="mt-4">
                            <AgentCardDiscovery
                              accessToken={accessToken}
                              onApply={handleApplyDiscoveredCard}
                              discoveryRequest={discoveryRequest}
                              savedAgentCard={agent.agent_card_params ?? null}
                            />
                          </div>
                        )}

                        <Separator className="my-6" />
                        <h3 className="text-lg font-medium mb-4">速率限制</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {rateLimitField("tpm_limit", "TPM 上限")}
                          {rateLimitField("rpm_limit", "RPM 上限")}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          {rateLimitField("session_tpm_limit", "会话 TPM 上限")}
                          {rateLimitField("session_rpm_limit", "会话 RPM 上限")}
                        </div>

                        <Separator className="my-6" />
                        <h3 className="text-lg font-medium mb-4">访问组</h3>
                        <FieldGroup>
                          <AgentFormField
                            name="access_group_ids"
                            label={labelWithHint(
                              "访问组",
                              "附加的访问组会在密钥与团队权限之上，进一步限制该智能体可访问的模型、MCP 服务器与其他智能体。留空表示不额外限制。",
                            )}
                          >
                            {({ value, onChange }) => (
                              <AccessGroupSelector
                                value={Array.isArray(value) ? (value as string[]) : []}
                                onChange={onChange}
                                placeholder="选择访问组（可选）"
                              />
                            )}
                          </AgentFormField>
                        </FieldGroup>

                        <Separator className="my-6" />
                        <h3 className="text-lg font-medium mb-4">MCP 服务器</h3>
                        <FieldGroup>
                          <AgentFormField
                            name="allowed_mcp_servers_and_groups"
                            label={labelWithHint(
                              "允许的 MCP 服务器",
                              "选择该智能体可访问的 MCP 服务器或访问组。绑定到此智能体的密钥只能访问此处授权的服务器。",
                            )}
                          >
                            {({ value, onChange }) => (
                              <MCPServerSelector
                                onChange={onChange}
                                value={{
                                  servers: (value as McpServerSelection | undefined)?.servers ?? [],
                                  accessGroups: (value as McpServerSelection | undefined)?.accessGroups ?? [],
                                  toolsets: (value as McpServerSelection | undefined)?.toolsets ?? [],
                                }}
                                accessToken={accessToken ?? ""}
                                placeholder="选择 MCP 服务器或访问组（可选）"
                              />
                            )}
                          </AgentFormField>
                        </FieldGroup>
                        <div className="mt-4">
                          <MCPToolPermissions
                            accessToken={accessToken ?? ""}
                            selectedServers={mcpSelection?.servers ?? []}
                            toolPermissions={mcpToolPermissions ?? {}}
                            onChange={(toolPerms: Record<string, string[]>) =>
                              form.setValue("mcp_tool_permissions", toolPerms)
                            }
                          />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setAppliedDiscoveredSelection(null);
                              setIsEditing(false);
                              fetchAgentInfo();
                            }}
                          >
                            取消
                          </Button>
                          <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
                            {isSaving && <UiLoadingSpinner className="size-4" />}
                            保存更改
                          </Button>
                        </div>
                      </form>
                    </FormProvider>
                  </TooltipProvider>
                ) : (
                  <p>点击「编辑设置」以修改 Agent 配置。</p>
                )}
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default AgentInfoView;
