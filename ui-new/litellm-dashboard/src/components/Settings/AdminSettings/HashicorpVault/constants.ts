export const SENSITIVE_FIELDS = new Set(["vault_token", "approle_secret_id", "client_key"]);

export const FIELD_LABELS: Record<string, string> = {
  vault_addr: "Vault 地址",
  vault_namespace: "命名空间",
  vault_login_namespace: "登录命名空间",
  vault_secret_namespace: "密钥命名空间",
  vault_mount_name: "KV 挂载名",
  vault_path_prefix: "路径前缀",
  vault_token: "Token",
  approle_role_id: "Role ID",
  approle_secret_id: "Secret ID",
  approle_mount_path: "挂载路径",
  client_cert: "客户端证书",
  client_key: "客户端密钥",
  vault_cert_role: "证书角色",
};
