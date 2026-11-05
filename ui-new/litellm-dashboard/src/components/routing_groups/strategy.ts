const STRATEGY_LABELS: Readonly<Record<string, string>> = {
  "simple-shuffle": "简单随机",
  "least-busy": "最空闲",
  "usage-based-routing": "按用量",
  "latency-based-routing": "按延迟",
  priority: "优先级",
};

export const formatStrategyLabel = (strategy: string): string => STRATEGY_LABELS[strategy] ?? strategy;
