import type { AgentCreateInfo } from "@/components/networking";

type AgentCreateInfoZhOverride = Partial<Pick<AgentCreateInfo, "agent_type_display_name" | "description">>;

const AGENT_CREATE_INFO_ZH: Partial<Record<string, AgentCreateInfoZhOverride>> = {
  a2a: {
    agent_type_display_name: "A2A 标准",
    description: "标准 A2A 协议",
  },
  langflow: {
    description: "通过 LangFlow Platform API 连接 LangFlow 智能体",
  },
  langgraph: {
    description: "通过 LangGraph Platform API 连接 LangGraph 智能体",
  },
  bedrock_agentcore: {
    description: "连接 Amazon Bedrock AgentCore 托管的智能体运行时",
  },
  azure_ai_foundry: {
    description: "连接 Microsoft Azure AI Foundry 智能体",
  },
  pydantic_ai_agents: {
    description: "通过 A2A 协议连接 Pydantic AI 智能体（支持伪流式）",
  },
  vertex_agent_engine: {
    description: "连接 Google Cloud Vertex AI Reasoning Engine",
  },
  watsonx_orchestrate: {
    description: "通过 CP4D 或 IBM Cloud IAM 连接 IBM watsonx Orchestrate 智能体",
  },
};

export const localizeAgentCreateInfo = (info: AgentCreateInfo): AgentCreateInfo => {
  const override = AGENT_CREATE_INFO_ZH[info.agent_type];
  if (!override) return info;
  return { ...info, ...override };
};

export const localizeAgentCreateMetadata = (items: AgentCreateInfo[]): AgentCreateInfo[] =>
  items.map(localizeAgentCreateInfo);
