const ALERTING_FIELD_DESCRIPTION_ZH: Readonly<Record<string, string>> = {
  slack_alerting:
    "启用 Slack 告警以监控生产环境 proxy：LLM 故障、预算、spend 追踪失败等。",
  daily_report_frequency: "接收部署延迟/失败报告的频率。默认 12 小时，单位为秒。",
  report_check_interval: "后台检查是否应发送报告的频率。默认约每小时一次，单位为秒。",
  budget_alert_ttl: "预算告警的缓存 TTL，避免每次越过预算时重复发送相同告警，单位为秒。",
  outage_alert_ttl: "模型故障告警的缓存 TTL，定义错误统计时间窗。默认 1 分钟，单位为秒。",
  region_outage_alert_ttl:
    "按 provider 区域聚合的故障告警缓存 TTL；同一区域 2 个以上 model 报错时告警。默认 1 分钟，单位为秒。",
  minor_outage_alert_threshold: "计为 model/区域轻微故障的错误次数（不incl. 400 状态码）。",
  major_outage_alert_threshold: "计为 model/区域严重故障的错误次数（不incl. 400 状态码）。",
  max_outage_alert_list_size: "单个 model/区域在缓存中保留的最大错误条数，防止内存泄漏。",
  daily_spend_per_user_threshold: "某用户 UTC 当日 spend 超过该 USD 金额时告警。默认关闭。",
  monthly_spend_per_user_threshold: "某用户 UTC 自然月 spend 超过该 USD 金额时告警。默认关闭。",
  spend_anomaly_multiplier: "当用户当日 spend 超过其 trailing 日平均 spend 的该倍数时，标记为异常。",
  spend_anomaly_baseline_days: "用于计算用户日平均 spend 的 trailing 天数，供异常检测使用。",
  spend_anomaly_min_spend: "触发异常告警前用户当日需达到的最低 spend（USD），用于降低误报。",
  user_spend_check_interval: "检查 per-user spend 阈值与异常的间隔（秒）。默认每小时。",
  region_name: "监看的区域",
  log_to_console: "为 true 时，告警 payload 会打印到控制台。",
} as const;

export function alertingFieldDescriptionZh(fieldName: string, fieldDescription: string): string {
  return ALERTING_FIELD_DESCRIPTION_ZH[fieldName] ?? fieldDescription;
}
