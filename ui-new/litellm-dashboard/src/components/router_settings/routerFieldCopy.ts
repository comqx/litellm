const FIELD_LABEL_ZH: Readonly<Record<string, string>> = {
  routing_strategy: "路由策略",
  routing_strategy_args: "路由策略参数",
  routing_groups: "路由组",
  num_retries: "重试次数",
  timeout: "超时时间",
  stream_timeout: "流式超时",
  max_fallbacks: "最大回退次数",
  fallbacks: "回退模型",
  context_window_fallbacks: "上下文窗口回退",
  content_policy_fallbacks: "内容策略回退",
  allowed_fails: "允许失败次数",
  cooldown_time: "冷却时间",
  retry_after: "重试间隔",
  retry_policy: "重试策略",
  model_group_alias: "模型组别名",
  enable_pre_call_checks: "启用预调用检查",
  default_litellm_params: "默认 LiteLLM 参数",
  set_verbose: "详细日志",
  default_max_parallel_requests: "最大并行请求数",
  enable_tag_filtering: "启用标签筛选",
  tag_filtering_match_any: "标签匹配任一",
  disable_cooldowns: "禁用冷却",
  ttl: "ttl",
  lowest_latency_buffer: "lowest_latency_buffer",
};

const FIELD_DESCRIPTION_ZH: Readonly<Record<string, string>> = {
  routing_strategy: "用于在多个部署之间负载均衡的路由策略",
  routing_strategy_args:
    "传递给路由策略的参数（例如 latency-based-routing 的 ttl、lowest_latency_buffer）",
  routing_groups:
    "共享同一路由策略的 model_names 命名子集。未被显式分组声明的模型将回退到顶层 routing_strategy。",
  num_retries: "失败请求的重试次数",
  timeout: "请求超时时间（秒）",
  stream_timeout: "流式请求超时时间（秒）",
  max_fallbacks: "退出调用前尝试的最大回退次数",
  fallbacks: "回退模型映射列表",
  context_window_fallbacks: "上下文窗口错误的回退模型列表",
  content_policy_fallbacks: "内容策略错误的回退模型列表",
  allowed_fails: "部署进入冷却前允许失败的次数",
  cooldown_time: "部署失败后进入冷却的时间（秒）",
  retry_after: "重试失败请求前需等待的最短时间（秒）",
  retry_policy: "针对不同异常类型的自定义重试策略",
  model_group_alias: "模型组别名",
  enable_pre_call_checks: "在路由请求前启用预调用检查",
  default_litellm_params: "Router.chat.completion.create 的默认参数",
  set_verbose: "为路由器启用详细日志",
  default_max_parallel_requests: "所有部署的默认最大并行请求数",
  enable_tag_filtering: "启用基于标签的路由，按标签路由请求",
  tag_filtering_match_any: "标签路由时匹配任意标签而非全部标签",
  disable_cooldowns: "禁用失败部署的冷却机制",
  ttl: "计算部署平均延迟时回溯的滑动窗口。默认 1 小时（秒）。",
  lowest_latency_buffer:
    "在最低延迟的这一百分比范围内在部署间 shuffle。默认 0（即始终选择最低延迟）。",
};

const ROUTING_STRATEGY_DESCRIPTION_ZH: Readonly<Record<string, string>> = {
  priority:
    "将组调用路由到可用模型中优先级编号最低的模型，失败时切换到更高编号。相同优先级共享流量。直接成员调用保持现有策略。",
  "simple-shuffle": "从列表中随机选择一个部署。简单快速。",
  "least-busy": "路由到进行中请求数最少的部署。",
  "latency-based-routing": "在滑动窗口内路由到延迟最低的部署。",
  "cost-based-routing": "路由到每 token 成本最低的部署。",
  "usage-based-routing": "路由到 TPM（每分钟 token 数）使用最低的部署。（已弃用）",
  "usage-based-routing-v2": "改进版的使用量路由，跟踪更准确。",
};

export const labelZh = (fieldName: string, fallback: string): string =>
  FIELD_LABEL_ZH[fieldName] ?? fallback;

export const descriptionZh = (fieldName: string, fallback: string): string =>
  FIELD_DESCRIPTION_ZH[fieldName] ?? fallback;

export const strategyDescriptionZh = (strategy: string, fallback: string): string =>
  ROUTING_STRATEGY_DESCRIPTION_ZH[strategy] ?? fallback;

export const ROUTER_SETTINGS_SECTION = {
  title: "路由设置",
  description: "配置请求如何路由到部署",
} as const;

export const RELIABILITY_RETRIES_SECTION = {
  title: "可靠性与重试",
  description: "配置重试与失败处理",
} as const;

export const LATENCY_BASED_SECTION = {
  title: "基于延迟的配置",
  description: "微调基于延迟的路由行为",
} as const;

export const LEARN_MORE_LINK = "了解更多";

export const SAVE_CHANGES_BUTTON = "保存更改";
export const RESET_BUTTON = "重置";

export const TOAST_ROUTER_SETTINGS_UPDATED = "路由设置已成功更新";
export const TOAST_ROUTER_SETTINGS_UPDATE_FAILED_PREFIX = "更新路由设置失败：";
