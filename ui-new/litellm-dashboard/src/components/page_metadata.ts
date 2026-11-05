/**
 * Page metadata for UI Settings configuration
 * This file contains descriptions and metadata for all navigation pages
 */

// Page descriptions for UI Settings configuration
export const pageDescriptions: Record<string, string> = {
  home: "Usage at a glance, recent launches and blog updates",
  "api-keys": "管理用于 API 访问与认证的 Virtual Key",
  "llm-playground": "交互式测试 LLM 请求的 Playground",
  models: "配置与管理 LLM 模型与端点",
  agents: "创建与管理 AI Agent",
  agentic: "管理 Agent 相关资源：Agent、工作流运行与记忆",
  workflows: "跟踪并查看持久化工作流运行历史",
  "mcp-servers": "配置 Model Context Protocol 服务器",
  memory: "Inspect and manage agent memory entries stored under /v1/memory",
  guardrails: "设置内容审核与安全护栏",
  policies: "定义访问控制与使用策略",
  "search-tools": "配置 RAG 搜索与检索工具",
  "tool-policies": "配置工具使用策略与权限",
  "vector-stores": "管理用于嵌入的向量数据库",
  new_usage: "查看用量分析与指标",
  "cost-optimization": "跟踪并配置节省成本功能：Prompt 压缩、缓存与自动路由",
  "model-insights": "模型排行榜: compare usage, spend, tokens, and task mix across this gateway",
  logs: "访问请求与响应日志",
  lens: "Review agent activity and investigate patterns with supporting evidence",
  "guardrails-monitor": "监控护栏性能并查看日志",
  users: "管理内部用户账号与权限",
  teams: "创建与管理团队以控制访问",
  organizations: "管理组织及其成员",
  projects: "管理团队内的项目",
  "access-groups": "管理用于基于角色的权限的访问组",
  budgets: "设置并监控消费预算",
  api_ref: "浏览 API 文档与端点",
  "model-hub-table": "探索可用的 AI 模型与供应商",
  "learning-resources": "Access tutorials and documentation",
  caching: "配置响应缓存与协调 Redis 设置",
  "transform-request": "设置请求转换规则",
  "cost-tracking": "跟踪并分析 API 成本",
  "ui-theme": "自定义仪表盘外观",
  "tag-management": "使用标签组织资源",
  prompts: "管理与版本化 Prompt 模板",
  skills: "浏览与管理 Claude Code Skills",
  usage: "查看旧版用量仪表盘",
  "router-settings": "配置路由与负载均衡设置",
  "logging-and-alerts": "设置日志与告警配置",
  "admin-panel": "访问管理面板与设置",
};

export interface PageMetadata {
  page: string;
  label: string;
  group: string;
  description: string;
}
