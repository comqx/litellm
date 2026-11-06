const HOME_BLOG_TEXT_ZH: Readonly<Record<string, string>> = {
  "Half the price of GPT-6.1 Sol at $1 / $5 per 1M tokens, 50.3% on Terminal-Bench 4.0, 1.05M context.":
    "GPT-6.1 Sol 半价，每百万 Token 输入 $1 / 输出 $5，Terminal-Bench 4.0 得分 50.3%，上下文 1.05M。",
  "Jev 1.14 reads PNG and JPEG images, answers box questions with coordinates, and takes long-context requests on LiteLLM.":
    "Jev 1.14 支持读取 PNG 和 JPEG 图片、回答带坐标的框选问题，并在 LiteLLM 上处理长上下文请求。",
  "Typed yes/no, choice and score answers as probabilities, from 9 providers on /v1/decisions and /v1/systemone.":
    "通过 /v1/decisions 和 /v1/systemone 将是/否、选择和评分回答作为概率输出，支持 9 家供应商。",
  "Release cadence changes and an LTS version pilot": "发布节奏调整与 LTS 版本试点",
  "Starting the week of November 2, 2026, release candidates and stable releases ship on Tuesday mornings, and LiteLLM is piloting a long-term support line on 1.108 for one month.":
    "自 2026 年 11 月 2 日当周起，Release Candidate 与稳定版将于每周二上午发布。LiteLLM 还将在 1.108 版本上试点为期一个月的长期支持（LTS）线。",
  "How to build an agent with grounding on LiteLLM": "如何在 LiteLLM 上构建带 Grounding 的智能体",
  "Build a grounded chat agent in four steps with LiteLLM's AI Gateway. Connect your evidence, call a grounding guardrail, and show its verdict in chat.":
    "通过 LiteLLM AI 网关，用四步构建带 Grounding 的聊天智能体：接入证据、调用 Grounding 护栏，并在对话中展示判定结果。",
  "Introducing LiteLLM's Unified Cost Accounting Engine": "推出 LiteLLM 统一成本核算引擎",
  "Consistent cost reporting, independently scalable accounting, and spend analysis by team, user, model, or custom dimensions.":
    "一致的成本报告、可独立扩展的核算能力，以及按团队、用户、模型或自定义维度分析花费。",
  "What we are changing after October 21": "10 月 21 日后的变更说明",
  "Why the controls built after March did not stop the v1.107.0 release, and the identity, credential and detection changes we are making in response.":
    "说明 3 月之后建立的控制措施为何未能阻止 v1.107.0 发布，以及我们将采取的身份、凭证与检测方面的改进。",
  "Use Hex to analyze LiteLLM costs, then set budgets and routing": "使用 Hex 分析 LiteLLM 成本并设置预算与路由",
  "Connect Hex to LiteLLM's Postgres data, import a cost dashboard, then use the LiteLLM UI to set a budget or change model routing.":
    "将 Hex 连接到 LiteLLM 的 Postgres 数据，导入成本仪表板，然后使用 LiteLLM UI 设置预算或更改模型路由。",
  "Model Deprecation Management": "模型弃用管理",
  "Manage model deprecations in the LiteLLM AI Gateway. Find affected keys, track migration traffic, and notify owners before provider deadlines.":
    "在 LiteLLM AI 网关中管理模型弃用。查找受影响的密钥，追踪迁移流量，并在供应商截止日期前通知负责人。",
  "Introducing the LiteLLM Private Registry": "LiteLLM 私有镜像仓库发布",
  "LiteLLM is committing to a private registry to provide early access to fixes for the most severe security vulnerabilities, ahead of public release.":
    "LiteLLM 将提供私有镜像仓库，在公开发布之前为最严重安全漏洞的修复提供抢先访问。",
} as const;

export const homeBlogTextZh = (text: string): string => HOME_BLOG_TEXT_ZH[text] ?? text;
