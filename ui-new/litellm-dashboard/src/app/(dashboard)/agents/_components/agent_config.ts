import { parseIdentityForForm } from "./agent_identity";
/**
 * Shared configuration for agent form fields
 * Used across create, view, and update operations
 */

import {
  EMPTY_KILL_SWITCH_FORM,
  buildKillSwitchFromForm,
  parseKillSwitchForForm,
  type KillSwitchConfig,
  type KillSwitchFormValue,
} from "./kill_switch_config";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "switch" | "list" | "select";
  required?: boolean;
  tooltip?: string;
  placeholder?: string;
  defaultValue?: any;
  rows?: number;
  validation?: any[];
  options?: string[];
  helpText?: string;
}

export interface SectionConfig {
  key: string;
  title: string;
  fields: FieldConfig[];
  defaultExpanded?: boolean;
}

export const AGENT_FORM_CONFIG: {
  basic: SectionConfig;
  skills: SectionConfig;
  capabilities: SectionConfig;
  optional: SectionConfig;
  litellm: SectionConfig;
  cost: SectionConfig;
  tracing: SectionConfig;
} = {
  basic: {
    key: "basic",
    title: "基本信息",
    defaultExpanded: true,
    fields: [
      {
        name: "name",
        label: "显示名称",
        type: "text",
        required: true,
        placeholder: "例如：客户支持智能体",
      },
      {
        name: "description",
        label: "描述",
        type: "textarea",
        required: false,
        placeholder: "描述此智能体的功能…",
        rows: 3,
      },
      {
        name: "url",
        label: "URL",
        type: "url",
        required: false,
        placeholder: "http://localhost:9999/",
        tooltip: "智能体托管的基础 URL（可选）",
      },
      {
        name: "version",
        label: "版本",
        type: "text",
        placeholder: "1.0.0",
        defaultValue: "1.0.0",
      },
      {
        name: "protocolVersion",
        label: "协议版本",
        type: "select",
        options: ["1.0", "0.3"],
        defaultValue: "1.0",
        tooltip:
          "LiteLLM 向客户端提供此智能体时使用的 A2A 协议版本。LiteLLM 会将上游智能体的响应转换为此版本，因此客户端看到的版本始终为你在此选择的版本，与原始智能体版本无关。",
        helpText:
          "LiteLLM 向客户端提供此版本，并将上游智能体的响应转换为与之匹配，与原始智能体版本无关。",
      },
    ],
  },
  skills: {
    key: "skills",
    title: "技能",
    fields: [
      {
        name: "skills",
        label: "技能列表",
        type: "list",
        defaultValue: [],
      },
    ],
  },
  capabilities: {
    key: "capabilities",
    title: "能力",
    fields: [
      {
        name: "streaming",
        label: "流式响应",
        type: "switch",
        defaultValue: false,
      },
      {
        name: "pushNotifications",
        label: "推送通知",
        type: "switch",
      },
      {
        name: "stateTransitionHistory",
        label: "状态转换历史",
        type: "switch",
      },
    ],
  },
  optional: {
    key: "optional",
    title: "可选设置",
    fields: [
      {
        name: "iconUrl",
        label: "图标 URL",
        type: "url",
        placeholder: "https://example.com/icon.png",
      },
      {
        name: "documentationUrl",
        label: "文档 URL",
        type: "url",
        placeholder: "https://docs.example.com",
      },
      {
        name: "supportsAuthenticatedExtendedCard",
        label: "支持认证扩展卡片",
        type: "switch",
      },
    ],
  },
  litellm: {
    key: "litellm",
    title: "LiteLLM 参数",
    fields: [
      {
        name: "model",
        label: "模型（可选）",
        type: "text",
      },
      {
        name: "make_public",
        label: "公开",
        type: "switch",
      },
    ],
  },
  cost: {
    key: "cost",
    title: "成本配置",
    fields: [
      {
        name: "cost_per_query",
        label: "Cost Per Query ($)",
        type: "text",
        placeholder: "0.0",
        tooltip: "每次查询的固定成本",
      },
      {
        name: "input_cost_per_token",
        label: "Input Cost Per Token ($)",
        type: "text",
        placeholder: "0.000001",
        tooltip: "每个输入 Token 的成本",
      },
      {
        name: "output_cost_per_token",
        label: "Output Cost Per Token ($)",
        type: "text",
        placeholder: "0.000002",
        tooltip: "每个输出 Token 的成本",
      },
    ],
  },
  tracing: {
    key: "tracing",
    title: "追踪",
    fields: [
      {
        name: "enable_tracing",
        label: "启用追踪",
        type: "switch",
        defaultValue: false,
        tooltip: "为此 Agent 启用请求追踪",
      },
    ],
  },
};

export const SKILL_FIELD_CONFIG = {
  id: {
    name: "id",
    label: "技能 ID",
    required: true,
    placeholder: "e.g., hello_world",
  },
  name: {
    name: "name",
    label: "技能名称",
    required: true,
    placeholder: "例如：返回 hello world",
  },
  description: {
    name: "description",
    label: "描述",
    required: true,
    placeholder: "描述此技能的功能",
    rows: 2,
  },
  tags: {
    name: "tags",
    label: "标签",
    required: true,
    placeholder: "输入标签后按 Enter",
  },
  examples: {
    name: "examples",
    label: "示例",
    placeholder: "输入示例后按 Enter",
  },
};

/**
 * Get default form values from configuration
 */
export const getDefaultFormValues = () => {
  const defaults: any = {
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    kill_switch: { ...EMPTY_KILL_SWITCH_FORM },
  };

  Object.values(AGENT_FORM_CONFIG).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    });
  });

  return defaults;
};

/**
 * Build agent data from form values according to AgentConfig spec
 */
export const buildAgentDataFromForm = (values: any, existingAgent?: any) => {
  const agentData: any = {
    agent_name: values.agent_name,
    agent_card_params: {
      protocolVersion: values.protocolVersion || "1.0",
      name: values.name || values.agent_name,
      description: values.description || "",
      url: values.url || "",
      version: values.version || "1.0.0",
      defaultInputModes: existingAgent?.agent_card_params?.defaultInputModes || ["text"],
      defaultOutputModes: existingAgent?.agent_card_params?.defaultOutputModes || ["text"],
      capabilities: {
        streaming: values.streaming === true,
        ...(values.pushNotifications !== undefined && { pushNotifications: values.pushNotifications }),
        ...(values.stateTransitionHistory !== undefined && { stateTransitionHistory: values.stateTransitionHistory }),
      },
      skills: values.skills || [],
      ...(values.iconUrl && { iconUrl: values.iconUrl }),
      ...(values.documentationUrl && { documentationUrl: values.documentationUrl }),
      ...(values.supportsAuthenticatedExtendedCard !== undefined && {
        supportsAuthenticatedExtendedCard: values.supportsAuthenticatedExtendedCard,
      }),
    },
  };

  const params: Record<string, any> = {};

  if (values.model) params.model = values.model;
  if (values.make_public !== undefined) params.make_public = values.make_public;
  if (values.cost_per_query) params.cost_per_query = parseFloat(values.cost_per_query);
  if (values.input_cost_per_token) params.input_cost_per_token = parseFloat(values.input_cost_per_token);
  if (values.output_cost_per_token) params.output_cost_per_token = parseFloat(values.output_cost_per_token);

  if (Object.keys(params).length > 0) {
    agentData.litellm_params = params;
  }

  if (values.tpm_limit != null) agentData.tpm_limit = values.tpm_limit;
  if (values.rpm_limit != null) agentData.rpm_limit = values.rpm_limit;
  if (values.session_tpm_limit != null) agentData.session_tpm_limit = values.session_tpm_limit;
  if (values.session_rpm_limit != null) agentData.session_rpm_limit = values.session_rpm_limit;
  // static_headers: convert [{header, value}, ...] → {header: value, ...}
  if (Array.isArray(values.static_headers) && values.static_headers.length > 0) {
    const staticHeaders: Record<string, string> = {};
    values.static_headers.forEach((entry: { header?: string; value?: string }) => {
      const key = entry?.header?.trim();
      if (key) staticHeaders[key] = entry?.value ?? "";
    });
    if (Object.keys(staticHeaders).length > 0) {
      agentData.static_headers = staticHeaders;
    }
  }

  // extra_headers: already an array of strings from Select tags
  if (Array.isArray(values.extra_headers) && values.extra_headers.length > 0) {
    agentData.extra_headers = values.extra_headers;
  }

  applyKillSwitchToPayload(agentData, values.kill_switch, existingAgent);

  return agentData;
};

export const applyKillSwitchToPayload = (
  agentData: { kill_switch?: KillSwitchConfig | null },
  form: KillSwitchFormValue | undefined,
  existingAgent?: { kill_switch?: KillSwitchConfig | null },
) => {
  const killSwitch = buildKillSwitchFromForm(form);
  if (killSwitch !== undefined && (killSwitch !== null || existingAgent?.kill_switch)) {
    agentData.kill_switch = killSwitch;
  }
};

export const parseAccessGroupIdsForForm = (agent: { access_group_ids?: string[] | null }) => ({
  access_group_ids: agent.access_group_ids ?? [],
});

export const parseMcpPermissionsForForm = (agent: any) => ({
  ...parseIdentityForForm(agent),
  allowed_mcp_servers_and_groups: {
    servers: agent.object_permission?.mcp_servers ?? [],
    accessGroups: agent.object_permission?.mcp_access_groups ?? [],
    toolsets: agent.object_permission?.mcp_toolsets ?? [],
  },
  mcp_tool_permissions: agent.object_permission?.mcp_tool_permissions ?? {},
});

/**
 * Always includes every MCP key (empty when cleared) so removals persist;
 * the proxy merges object_permission per key, leaving non-MCP grants untouched.
 */
export const buildMcpObjectPermission = (values: any) => ({
  mcp_servers: values.allowed_mcp_servers_and_groups?.servers ?? [],
  mcp_access_groups: values.allowed_mcp_servers_and_groups?.accessGroups ?? [],
  mcp_toolsets: values.allowed_mcp_servers_and_groups?.toolsets ?? [],
  mcp_tool_permissions: values.mcp_tool_permissions ?? {},
});

/**
 * Parse agent data for form fields
 */
export const parseAgentForForm = (agent: any) => {
  const card = agent.agent_card_params ?? {};
  const skills =
    card.skills?.map((skill: any) => ({
      ...skill,
      tags: skill.tags,
      examples: skill.examples || [],
    })) || [];

  return {
    agent_name: agent.agent_name,
    name: card.name || agent.agent_name,
    description: card.description,
    url: card.url,
    version: card.version,
    protocolVersion: card.protocolVersion,
    streaming: card.capabilities?.streaming,
    pushNotifications: card.capabilities?.pushNotifications,
    stateTransitionHistory: card.capabilities?.stateTransitionHistory,
    skills: skills,
    iconUrl: card.iconUrl,
    documentationUrl: card.documentationUrl,
    supportsAuthenticatedExtendedCard: card.supportsAuthenticatedExtendedCard,
    model: agent.litellm_params?.model,
    make_public: agent.litellm_params?.make_public,
    cost_per_query: agent.litellm_params?.cost_per_query,
    input_cost_per_token: agent.litellm_params?.input_cost_per_token,
    output_cost_per_token: agent.litellm_params?.output_cost_per_token,
    tpm_limit: agent.tpm_limit,
    rpm_limit: agent.rpm_limit,
    session_tpm_limit: agent.session_tpm_limit,
    session_rpm_limit: agent.session_rpm_limit,
    // static_headers: {key: value} → [{header, value}, ...]
    static_headers: agent.static_headers
      ? Object.entries(agent.static_headers as Record<string, string>).map(([header, value]) => ({
          header,
          value,
        }))
      : [],
    // extra_headers: already an array of strings
    extra_headers: agent.extra_headers ?? [],
    kill_switch: parseKillSwitchForForm(agent.kill_switch),
    ...parseMcpPermissionsForForm(agent),
    ...parseAccessGroupIdsForForm(agent),
  };
};
