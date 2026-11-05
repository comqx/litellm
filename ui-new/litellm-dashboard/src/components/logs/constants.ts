export const ERROR_CODE_OPTIONS: { label: string; value: string }[] = [
  { label: "400 - 错误请求", value: "400" },
  { label: "401 - 认证无效", value: "401" },
  { label: "403 - 权限被拒绝", value: "403" },
  { label: "404 - 未找到", value: "404" },
  { label: "408 - 请求超时", value: "408" },
  { label: "422 - 无法处理的实体", value: "422" },
  { label: "429 - 触发限流", value: "429" },
  { label: "500 - 服务器内部错误", value: "500" },
  { label: "502 - 网关错误", value: "502" },
  { label: "503 - 服务不可用", value: "503" },
  { label: "529 - 服务过载", value: "529" },
];

/** Call types that represent MCP tool invocations (shared across columns, index, drawer). */
export const MCP_CALL_TYPES = ["call_mcp_tool", "list_mcp_tools"];

/** Call types that represent agent/A2A requests (e.g. asend_message). */
export const AGENT_CALL_TYPES = ["asend_message"];

/** Call types that represent Batch API operations (creation and retrieval, sync and async). */
export const BATCH_CALL_TYPES = ["acreate_batch", "create_batch", "aretrieve_batch", "retrieve_batch"];

export const SPAN_TYPE_LABELS: Record<string, string> = {
  llm: "LLM",
  agent: "智能体",
  mcp: "MCP",
  batch: "Batch",
};

export const CREDENTIAL_LABELS: Record<string, string> = {
  true: "客户端 OAuth 令牌",
  false: "已配置的密钥",
};

export const QUICK_SELECT_OPTIONS: { label: string; value: number; unit: string }[] = [
  { label: "最近 1 分钟", value: 1, unit: "minutes" },
  { label: "最近 15 分钟", value: 15, unit: "minutes" },
  { label: "最近 1 小时", value: 1, unit: "hours" },
  { label: "最近 4 小时", value: 4, unit: "hours" },
  { label: "最近 24 小时", value: 24, unit: "hours" },
  { label: "最近 7 天", value: 7, unit: "days" },
];
