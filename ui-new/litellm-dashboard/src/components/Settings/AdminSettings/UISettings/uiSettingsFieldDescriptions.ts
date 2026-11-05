export const UI_SETTINGS_SECTION_DESCRIPTION = "界面相关开关";

export const uiSettingsFieldDescriptions = {
  disable_model_add_for_internal_users: "开启后，内部用户无法在界面中添加模型。",
  disable_team_admin_delete_team_user:
    "禁止团队管理员从其管理的团队中删除用户。适用于通过 SCIM 在外部定义团队成员关系的场景。",
  enabled_ui_pages_internal_users:
    "指定内部用户（非管理员）在侧边栏可见的页面键列表。未设置时，按角色权限显示全部页面。",
  require_auth_for_public_ai_hub: "开启后，访问公开 AI 中心需要先登录。",
  forward_client_headers_to_llm_api:
    "将客户端 Header（Authorization、anthropic-beta 及 x-* 自定义 Header）转发至上游 LLM。适用于 Claude Code Max 订阅（转发 OAuth Token）或需要将自定义/追踪 Header 透传给供应商的场景。与 BYOK 开关相互独立，按需启用即可。",
  forward_llm_provider_auth_headers:
    "将供应商鉴权 Header（x-api-key、x-goog-api-key、api-key、ocp-apim-subscription-key 等）转发至上游 LLM，并在该请求中覆盖部署里配置的 Key。适用于 Claude Code BYOK（客户端自带 API Key）。与客户端 Header 开关相互独立，按需启用即可。",
  enable_projects_ui: "启用后，侧边栏显示项目功能，并在密钥管理中显示项目字段。",
  enable_chat_ui: "启用后，侧边栏显示聊天页，用户可与 LLM 对话并通过 OAuth 连接自己的 MCP 服务器凭据。",
  disable_agents_for_internal_users: "开启后，内部用户无法访问 Agent 管理接口或界面中的 Agent 页面。",
  allow_agents_for_team_admins:
    "开启后，团队管理员不受「禁止内部用户使用 Agent」限制（仅在已开启该禁止项时生效）。",
  disable_vector_stores_for_internal_users:
    "开启后，内部用户无法访问向量存储管理接口或界面中的向量存储页面。",
  allow_vector_stores_for_team_admins:
    "开启后，团队管理员不受「禁止内部用户使用向量存储」限制（仅在已开启该禁止项时生效）。",
  scope_user_search_to_org:
    "启用后，用户搜索接口（/user/filter/ui）按组织过滤结果；关闭时，任意已登录用户可搜索全部用户。",
  disable_custom_api_keys: "启用后，用户不能指定自定义 Key 值，所有 Key 必须由系统自动生成。",
} as const satisfies Record<string, string>;

export type UiSettingsFieldKey = keyof typeof uiSettingsFieldDescriptions;

export function getUiSettingsFieldDescription(key: UiSettingsFieldKey): string {
  return uiSettingsFieldDescriptions[key];
}
