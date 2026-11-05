// Must match the backend SpecialMCPServerNames.no_mcp_servers enum value.
export const NO_MCP_SERVERS_SENTINEL = "no-mcp-servers";

export const ALL_PROXY_MCP_SERVERS_SENTINEL = "all-proxy-mcpservers";

// Must match the backend MCP_ALL_TOOLS_WILDCARD constant in litellm/constants.py.
export const MCP_ALL_TOOLS_WILDCARD = "*";

export const MCP_TOOLS_PREVIEW_FORBIDDEN_MESSAGE =
  "提交审核的服务器无法预览工具。管理员将在审核期间验证工具。";
