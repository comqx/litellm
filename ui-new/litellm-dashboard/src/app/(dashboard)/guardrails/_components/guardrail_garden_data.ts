import { Providers, providerLogoMap } from "@/components/provider_info_helpers";
import { guardrailLogoMap } from "./guardrail_info_helpers";

export interface GuardrailCardInfo {
  id: string;
  name: string;
  description: string;
  category: "litellm" | "decision_model" | "partner";
  subcategory?: string;
  logo: string;
  tags: string[];
  eval?: {
    f1: number;
    precision: number;
    recall: number;
    testCases: number;
    latency: string;
  };
  providerKey?: string;
}

const litellmContentFilterLogo = guardrailLogoMap["LiteLLM Content Filter"];

export const LITELLM_CONTENT_FILTER_CARDS: GuardrailCardInfo[] = [
  {
    id: "cf_denied_financial",
    name: "拒绝金融建议",
    description:
      "Detects requests for personalized financial advice, investment recommendations, or financial planning.",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "话题拦截"],
    eval: {
      f1: 100.0,
      precision: 100.0,
      recall: 100.0,
      testCases: 207,
      latency: "<0.1ms",
    },
  },
  {
    id: "cf_denied_insults",
    name: "侮辱与人身攻击",
    description: "检测针对聊天机器人、员工或其他人的侮辱、谩骂和人身攻击。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "话题拦截"],
    eval: {
      f1: 100.0,
      precision: 100.0,
      recall: 100.0,
      testCases: 299,
      latency: "<0.1ms",
    },
  },
  {
    id: "cf_denied_legal",
    name: "拒绝法律建议",
    description: "检测针对未经授权的法律建议、案件分析或法律推荐的请求。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "话题拦截"],
  },
  {
    id: "cf_denied_medical",
    name: "拒绝医疗建议",
    description: "检测针对医疗诊断、治疗建议或健康咨询的请求。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "话题拦截"],
  },
  {
    id: "cf_harmful_violence",
    name: "有害暴力内容",
    description: "检测与暴力、犯罪策划、攻击和暴力威胁相关的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "安全"],
  },
  {
    id: "cf_harmful_self_harm",
    name: "有害自残内容",
    description: "检测与自残、自杀和危险的自我伤害行为相关的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "安全"],
  },
  {
    id: "cf_harmful_child_safety",
    name: "危害儿童安全内容",
    description: "检测可能危害儿童安全或剥削未成年人的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "安全"],
  },
  {
    id: "cf_harmful_illegal_weapons",
    name: "非法武器内容",
    description: "检测与非法武器制造、贩运或获取相关的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "安全"],
  },
  {
    id: "cf_bias_gender",
    name: "偏见：性别",
    description: "检测基于性别的歧视、刻板印象和偏见性语言。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "偏见"],
  },
  {
    id: "cf_bias_racial",
    name: "偏见：种族",
    description: "检测种族歧视、刻板印象和带有种族偏见的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "偏见"],
  },
  {
    id: "cf_bias_religious",
    name: "偏见：宗教",
    description: "检测宗教歧视、不宽容和带有宗教偏见的内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "偏见"],
  },
  {
    id: "cf_bias_sexual_orientation",
    name: "偏见：性取向",
    description: "检测基于性取向的歧视及相关偏见内容。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "偏见"],
  },
  {
    id: "cf_prompt_injection_jailbreak",
    name: "Prompt 注入：越狱",
    description: "检测旨在绕过 AI 安全准则和限制的越狱尝试。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Prompt 注入"],
  },
  {
    id: "cf_prompt_injection_data_exfil",
    name: "Prompt 注入：数据窃取",
    description: "检测通过提示词操纵窃取敏感数据的尝试。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Prompt 注入"],
  },
  {
    id: "cf_prompt_injection_sql",
    name: "Prompt 注入：SQL",
    description: "检测嵌入在提示词中的 SQL 注入尝试。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Prompt 注入"],
  },
  {
    id: "cf_prompt_injection_malicious_code",
    name: "Prompt 注入：恶意代码",
    description: "检测通过提示词注入恶意代码的尝试。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Prompt 注入"],
  },
  {
    id: "cf_prompt_injection_system_prompt",
    name: "Prompt 注入：系统提示词",
    description: "检测提取或覆盖系统提示词的尝试。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Prompt 注入"],
  },
  {
    id: "cf_toxic_abuse",
    name: "有毒与辱骂语言",
    description: "检测多种语言（EN、AU、DE、ES、FR）中的有毒、辱骂和仇恨言论。",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "毒性内容"],
  },
  {
    id: "cf_patterns",
    name: "Pattern 匹配",
    description:
      "Detect and block sensitive data patterns like SSNs, credit card numbers, API keys, and custom regex patterns.",
    category: "litellm",
    subcategory: "Patterns",
    logo: litellmContentFilterLogo,
    tags: ["PII", "Regex", "数据保护"],
  },
  {
    id: "cf_keywords",
    name: "关键词拦截",
    description:
      "Block or mask content containing specific keywords or phrases. Upload custom word lists or add individual terms.",
    category: "litellm",
    subcategory: "关键词",
    logo: litellmContentFilterLogo,
    tags: ["关键词", "黑名单"],
  },
  {
    id: "block_code_execution",
    name: "阻止代码执行",
    description:
      "检测请求和响应中的 Markdown 代码块。按语言阻止或掩码可执行代码（如 Python、JavaScript、Bash），置信度可配置。",
    category: "litellm",
    subcategory: "代码安全",
    logo: litellmContentFilterLogo,
    tags: ["代码", "安全", "Prompt 注入"],
  },
  {
    id: "cf_competitor_intent",
    name: "竞品名称拦截",
    description:
      "Block or reframe competitor comparison and ranking intent. Detect when users ask to compare or recommend competitors (airline or generic competitor lists).",
    category: "litellm",
    subcategory: "内容类别",
    logo: litellmContentFilterLogo,
    tags: ["内容类别", "Competitor", "话题拦截"],
  },
];

export const DECISION_MODEL_CARDS: GuardrailCardInfo[] = [
  {
    id: "dm_typesafe_jev",
    name: "TypeSafe Jev",
    description:
      "TypeSafe's Jev decision model answers your yes/no questions about each request, such as prompt injection or policy checks.",
    category: "decision_model",
    logo: providerLogoMap[Providers.TypeSafe] ?? "",
    tags: ["Decision Model", "TypeSafe", "Prompt 注入"],
    providerKey: "DecisionModel",
  },
  {
    id: "dm_perplexity",
    name: "Perplexity Decision",
    description: "Perplexity's pplx-decider model answers your yes/no questions about each request or response.",
    category: "decision_model",
    logo: providerLogoMap[Providers.Perplexity] ?? "",
    tags: ["Decision Model", "Perplexity"],
    providerKey: "DecisionModel",
  },
  {
    id: "dm_microsoft",
    name: "Microsoft Decision Model",
    description:
      "Microsoft Foundry decision models, such as Microsoft-Decision-1, answer your yes/no questions about each request or response.",
    category: "decision_model",
    logo: providerLogoMap[Providers.Azure_AI_Studio] ?? "",
    tags: ["Decision Model", "Microsoft"],
    providerKey: "DecisionModel",
  },
  {
    id: "dm_openai",
    name: "OpenAI Decision Model",
    description:
      "OpenAI decision models, such as gpt-6-luna, answer your yes/no questions about each request or response.",
    category: "decision_model",
    logo: providerLogoMap[Providers.OpenAI] ?? "",
    tags: ["Decision Model", "OpenAI"],
    providerKey: "DecisionModel",
  },
  {
    id: "dm_databricks",
    name: "Databricks Decision Model",
    description:
      "Decision models served on Databricks, such as OpenJev, answer your yes/no questions about each request or response.",
    category: "decision_model",
    logo: providerLogoMap[Providers.Databricks] ?? "",
    tags: ["Decision Model", "Databricks"],
    providerKey: "DecisionModel",
  },
];

export const PARTNER_GUARDRAIL_CARDS: GuardrailCardInfo[] = [
  {
    id: "presidio",
    name: "Presidio PII",
    description:
      "Microsoft Presidio for PII detection and anonymization. Supports 30+ entity types with configurable actions.",
    category: "partner",
    logo: guardrailLogoMap["Presidio PII"],
    tags: ["PII", "Microsoft"],
    providerKey: "PresidioPII",
  },
  {
    id: "bedrock",
    name: "Bedrock Guardrail",
    description: "AWS Bedrock Guardrails，用于内容过滤、话题规避和敏感信息检测。",
    category: "partner",
    logo: guardrailLogoMap["Bedrock Guardrail"],
    tags: ["AWS", "内容安全"],
    providerKey: "Bedrock",
  },
  {
    id: "lakera",
    name: "Lakera",
    description: "AI 安全平台，防护 Prompt 注入、数据泄露和有害内容。",
    category: "partner",
    logo: guardrailLogoMap["Lakera"],
    tags: ["安全", "Prompt 注入"],
    providerKey: "Lakera",
  },
  {
    id: "openai_moderation",
    name: "OpenAI Moderation",
    description: "OpenAI 的内容审核 API，可检测多个类别的有害内容。",
    category: "partner",
    logo: guardrailLogoMap["OpenAI Moderation"],
    tags: ["内容审核", "OpenAI"],
  },
  {
    id: "google_model_armor",
    name: "Google Cloud Model Armor",
    description: "Google Cloud 的模型保护服务，用于安全、负责任的 AI 部署。",
    category: "partner",
    logo: guardrailLogoMap["Google Cloud Model Armor"],
    tags: ["Google Cloud", "安全"],
  },
  {
    id: "guardrails_ai",
    name: "Guardrails AI",
    description: "为 LLM 输出添加结构、类型和质量保证的开源框架。",
    category: "partner",
    logo: guardrailLogoMap["Guardrails AI"],
    tags: ["开源", "校验"],
  },
  {
    id: "zscaler",
    name: "Zscaler AI Guard",
    description: "Enterprise AI security from Zscaler for monitoring and protecting AI/ML workloads.",
    category: "partner",
    logo: guardrailLogoMap["Zscaler AI Guard"],
    tags: ["企业级", "安全"],
  },
  {
    id: "panw",
    name: "PANW Prisma AIRS",
    description: "Palo Alto Networks Prisma AI Runtime Security，用于保护生产环境中的 AI 应用。",
    category: "partner",
    logo: guardrailLogoMap["PANW Prisma AIRS"],
    tags: ["企业级", "安全"],
  },
  {
    id: "cisco_ai_defense",
    name: "Cisco AI Defense",
    description:
      "Cisco AI Defense Inspection API for runtime protection: prompt injection, PII/PCI/PHI, harassment, hate speech, profanity, violence, and code detection.",
    category: "partner",
    logo: guardrailLogoMap["Cisco AI Defense"],
    tags: ["企业级", "安全", "Prompt 注入", "PII"],
    providerKey: "CiscoAiDefense",
  },
  {
    id: "noma",
    name: "Noma Security",
    description: "AI 安全平台，用于检测和防范 AI 特有的威胁与漏洞。",
    category: "partner",
    logo: guardrailLogoMap["Noma Security"],
    tags: ["安全", "威胁检测"],
  },
  {
    id: "aporia",
    name: "Aporia AI",
    description: "实时 AI Guardrail，用于幻觉检测、话题控制和 Policy 执行。",
    category: "partner",
    logo: guardrailLogoMap["Aporia AI"],
    tags: ["幻觉", "Policy"],
  },
  {
    id: "aim",
    name: "AIM Guardrail",
    description: "AIM Security 的 Guardrail，提供全面的 AI 威胁检测与缓解。",
    category: "partner",
    logo: guardrailLogoMap["AIM Guardrail"],
    tags: ["安全", "威胁检测"],
  },
  {
    id: "cato_networks",
    name: "Cato Networks Guardrail",
    description: "Cato Networks 的 Guardrail，提供全面的 AI 威胁检测与缓解。",
    category: "partner",
    logo: guardrailLogoMap["Cato Networks Guardrail"],
    tags: ["安全", "威胁检测"],
  },
  {
    id: "prompt_security",
    name: "Prompt Security",
    description: "防护 Prompt 注入攻击、数据泄露和其他 LLM 安全威胁。",
    category: "partner",
    logo: guardrailLogoMap["Prompt Security"],
    tags: ["Prompt 注入", "安全"],
  },
  {
    id: "lasso",
    name: "Lasso Guardrail",
    description: "面向负责任 AI 部署的内容审核与安全 Guardrail。",
    category: "partner",
    logo: guardrailLogoMap["Lasso Guardrail"],
    tags: ["内容审核"],
  },
  {
    id: "pangea",
    name: "Pangea Guardrail",
    description: "Pangea 的 AI Guardrail，用于构建安全、合规、可信的 AI 应用。",
    category: "partner",
    logo: guardrailLogoMap["Pangea Guardrail"],
    tags: ["合规", "安全"],
  },
  {
    id: "enkryptai",
    name: "EnkryptAI",
    description: "AI 安全与治理平台，面向企业级 AI 安全与合规。",
    category: "partner",
    logo: guardrailLogoMap["EnkryptAI"],
    tags: ["企业级", "治理"],
  },
  {
    id: "javelin",
    name: "Javelin Guardrails",
    description: "内置 Guardrail 的 AI 网关，保障 AI 运营的安全与合规。",
    category: "partner",
    logo: guardrailLogoMap["Javelin Guardrails"],
    tags: ["网关", "安全"],
  },
  {
    id: "pillar",
    name: "Pillar Guardrail",
    description: "AI 安全平台，用于监控、测试和保护 AI 系统。",
    category: "partner",
    logo: guardrailLogoMap["Pillar Guardrail"],
    tags: ["监控", "安全"],
  },
  {
    id: "akto",
    name: "Akto Guardrail",
    description: "AI security platform from Akto.io with automatic monitoring and guardrails for AI/ML applications.",
    category: "partner",
    logo: guardrailLogoMap["Akto"],
    tags: ["安全", "Safety", "Monitoring"],
  },
  {
    id: "promptguard",
    name: "PromptGuard",
    description:
      "AI 安全网关，具备 Prompt 注入检测、PII 脱敏、话题过滤、实体黑名单和幻觉检测能力。可自托管，支持即插即用的 Proxy 集成。",
    category: "partner",
    logo: guardrailLogoMap["PromptGuard"],
    tags: ["安全", "Prompt 注入", "PII"],
    providerKey: "Promptguard",
    eval: {
      f1: 94.9,
      precision: 100.0,
      recall: 90.4,
      testCases: 5384,
      latency: "~150ms",
    },
  },
  {
    id: "xecguard",
    name: "XecGuard",
    description:
      "CyCraft XecGuard AI 安全网关。多策略扫描（Prompt 注入、有害内容、PII、系统提示词执行），并支持 RAG 上下文 Grounding。",
    category: "partner",
    logo: guardrailLogoMap["XecGuard"],
    tags: ["安全", "Policy", "Grounding", "RAG"],
    providerKey: "Xecguard",
  },
  {
    id: "deepkeep",
    name: "DeepKeep AI Firewall",
    description:
      "DeepKeep AI 防火墙提供全面的 LLM 安全能力：Prompt 注入检测、PII 保护、内容审核和 Policy 执行，支持可配置的 Guardrail Pipeline。",
    category: "partner",
    logo: guardrailLogoMap["DeepKeep AI Firewall"],
    tags: ["安全", "Prompt 注入", "PII", "防火墙"],
    providerKey: "Deepkeep",
  },
  {
    id: "repelloai",
    name: "RepelloAI Argus",
    description:
      "RepelloAI Argus scans prompts and responses against policies configured per asset in the Repello dashboard.",
    category: "partner",
    logo: guardrailLogoMap["RepelloAI Argus"],
    tags: ["安全", "Policy", "Prompt 注入"],
    providerKey: "Repelloai",
  },
  {
    id: "straiker",
    name: "Straiker",
    description:
      "Defend AI Agentic Guardrails: Indirect/Direct Prompt Injection, Tool Misuse, Malicious MCP and Skills",
    category: "partner",
    logo: guardrailLogoMap["Straiker"],
    tags: ["智能体", "Prompt 注入", "Tool 滥用", "MCP", "Skills"],
    providerKey: "Straiker",
  },
  {
    id: "alice",
    name: "Alice",
    description:
      "基于 Policy 的提示词和模型响应 Guardrail，按应用评估，一个 Proxy 即可为不同 Team 或产品执行不同的 Policy 集。",
    category: "partner",
    logo: guardrailLogoMap["Alice"],
    tags: ["内容审核", "Prompt 注入", "PII", "Policy"],
    providerKey: "Alice",
  },
  {
    id: "agent_365",
    name: "Microsoft Agent 365",
    description:
      "Microsoft Agent 365 Tool 调用治理：以登录用户身份对 MCP Tool 调用进行 Defender 威胁评估和可观测性分析",
    category: "partner",
    logo: guardrailLogoMap["Microsoft Agent 365"],
    tags: ["智能体", "MCP", "Tool 滥用", "可观测性"],
    providerKey: "Agent365",
  },
  {
    id: "llm_shield_proxy",
    name: "LLM Shield Proxy",
    description:
      "Self-hosted PII redaction that puts the original values back into the model's response, so the provider never receives personal data while the end user still sees it.",
    category: "partner",
    logo: guardrailLogoMap["LLM Shield Proxy"],
    tags: ["PII", "Data Privacy", "合规", "流式响应"],
    providerKey: "LLM Shield Proxy",
  },
  {
    id: "conduct",
    name: "Conduct Guard",
    description:
      "Conduct Guard 在模型调用前根据工作区规则评估提示词：Prompt 注入、PII 和自定义 Policy，并给出阻止、警告和审批结论。",
    category: "partner",
    logo: guardrailLogoMap["Conduct Guard"],
    tags: ["安全", "Prompt 注入", "PII", "Policy"],
    providerKey: "Conduct",
  },
];

export const ALL_CARDS = [...LITELLM_CONTENT_FILTER_CARDS, ...DECISION_MODEL_CARDS, ...PARTNER_GUARDRAIL_CARDS];
