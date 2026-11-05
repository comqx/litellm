export const SENSITIVE_FIELDS = new Set(["cyberark_api_key", "client_key"]);

export const FIELD_LABELS: Record<string, string> = {
  cyberark_api_base: "Conjur 服务器 URL",
  cyberark_account: "账户",
  cyberark_username: "用户名",
  cyberark_api_key: "API Key",
  client_cert: "客户端证书",
  client_key: "客户端密钥",
  ssl_verify: "SSL 验证",
  refresh_interval: "Token 刷新间隔（秒）",
};
