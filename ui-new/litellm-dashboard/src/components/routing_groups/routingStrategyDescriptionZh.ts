const ROUTING_STRATEGY_DESCRIPTION_ZH: Readonly<Record<string, string>> = {
  priority:
    "组调用路由到可用模型中优先级数字最小的模型，失败时依次尝试更高数字；相同优先级共享流量。直接调用成员模型仍沿用原有策略。",
  "simple-shuffle": "从列表中随机选取一个部署，简单快速。",
  "least-busy": "路由到当前进行中请求数最少的部署。",
  "latency-based-routing": "路由到滑动窗口内延迟最低的部署。",
  "cost-based-routing": "路由到每 token 成本最低的部署。",
  "usage-based-routing": "路由到 TPM（每分钟 token 数）用量最低的部署。（已弃用）",
  "usage-based-routing-v2": "改进版 usage-based 路由，跟踪更准确。",
} as const;

export function routingStrategyDescriptionZh(strategy: string, description: string | undefined): string {
  if (description === undefined || description === "") {
    return ROUTING_STRATEGY_DESCRIPTION_ZH[strategy] ?? description ?? "";
  }
  return ROUTING_STRATEGY_DESCRIPTION_ZH[strategy] ?? description;
}
