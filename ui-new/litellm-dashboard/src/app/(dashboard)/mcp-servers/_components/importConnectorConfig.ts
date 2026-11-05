export interface MCPConnectorImportResult {
  name: string;
  server_id: string;
  alias: string;
}

export interface MCPConnectorImportSkipped {
  name: string;
  reason: string;
}

export interface MCPConnectorImportFailure {
  name: string;
  error: string;
}

export interface MCPConnectorImportResponse {
  imported: MCPConnectorImportResult[];
  skipped: MCPConnectorImportSkipped[];
  errors: MCPConnectorImportFailure[];
}

export type ParsedConnectorConfig =
  | { ok: true; payload: Record<string, unknown>; connectorCount: number }
  | { ok: false; error: string };

export const parseConnectorConfig = (text: string): ParsedConnectorConfig => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "请在导入前粘贴连接器 JSON。" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "JSON 无效。请检查是否缺少引号、逗号或括号。" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON object with an mcpServers or mcp_servers key." };
  }
  const record = parsed as Record<string, unknown>;
  const mapping = record.mcpServers;
  if (mapping !== undefined) {
    if (typeof mapping !== "object" || mapping === null || Array.isArray(mapping)) {
      return { ok: false, error: "mcpServers 必须是将连接器名称映射到定义的对象。" };
    }
    const connectorCount = Object.keys(mapping).length;
    if (connectorCount === 0) {
      return { ok: false, error: "mcpServers 不包含任何连接器。" };
    }
    return { ok: true, payload: { mcpServers: mapping }, connectorCount };
  }
  const list = record.mcp_servers;
  if (list !== undefined) {
    if (!Array.isArray(list)) {
      return { ok: false, error: "mcp_servers must be an array of connector definitions." };
    }
    if (list.length === 0) {
      return { ok: false, error: "mcp_servers contains no connectors." };
    }
    return { ok: true, payload: { mcp_servers: list }, connectorCount: list.length };
  }
  return { ok: false, error: "Expected a JSON object with an mcpServers or mcp_servers key." };
};
