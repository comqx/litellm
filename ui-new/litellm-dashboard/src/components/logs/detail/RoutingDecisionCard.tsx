"use client";

import { Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cva.config";

export interface RoutingDecisionTierBoundaries {
  simple_medium?: number;
  medium_complex?: number;
  complex_reasoning?: number;
}

export interface RoutingDecision {
  router_model_name?: string;
  router_type?: string;
  routed_model?: string;
  cause?: string;
  tier?: string;
  tier_label?: string;
  request_type?: string;
  score?: number;
  signals?: string[];
  matched_keyword?: string;
  escalation_keyword?: string;
  classifier_model?: string;
  classifier_p_solve?: number;
  classifier_calibrated_p_solve?: number;
  classifier_threshold?: number;
  classifier_capability_boundary?: string;
  classifier_primary_rule?: string;
  classifier_calibration_version?: string;
  classifier_efficient_p_solve?: number;
  classifier_capable_p_solve?: number;
  classifier_calibrated_efficient_p_solve?: number;
  classifier_calibrated_capable_p_solve?: number;
  classifier_max_quality_gap?: number;
  classifier_confidence?: number;
  classifier_probabilities?: Record<string, number>;
  classifier_cost?: number;
  escalated?: boolean;
  tier_boundaries?: RoutingDecisionTierBoundaries;
  reasoning_override_min_score?: number;
  heuristic_v2_forecast?: {
    probabilities: Record<string, number>;
    threshold: number;
    predicted_tier: string;
    request_type: string;
  };
}

const ROUTER_TYPE_LABELS: Record<string, string> = {
  complexity: "Auto-Router v2",
  adaptive: "自适应路由",
  quality: "质量路由",
};

/**
 * The tier the score alone would have produced, given the boundaries in effect when
 * the decision was made. Rendered as the bracket that explains a score, so it must
 * use the snapshot rather than today's config.
 */
function describeScoreAgainstBoundaries(
  score: number,
  boundaries?: RoutingDecisionTierBoundaries,
  renamed?: boolean,
): string | null {
  if (!boundaries) return null;
  const {
    simple_medium: simpleMedium,
    medium_complex: mediumComplex,
    complex_reasoning: complexReasoning,
  } = boundaries;
  if (simpleMedium === undefined || mediumComplex === undefined || complexReasoning === undefined) return null;

  const named = (range: string, tier: string): string => (renamed ? range : `${range}，${tier}`);
  if (score < simpleMedium) return named(`低于 ${simpleMedium}`, "SIMPLE");
  if (score < mediumComplex) return named(`${simpleMedium} 至 ${mediumComplex}`, "MEDIUM");
  if (score < complexReasoning) return named(`${mediumComplex} 至 ${complexReasoning}`, "COMPLEX");
  return named(`不低于 ${complexReasoning}`, "REASONING");
}

function describePlanModeFloor(matchedKeyword: string | undefined): string {
  if (matchedKeyword === "exit_plan_mode") return "计划模式下限（exit_plan_mode 工具）";
  if (matchedKeyword) return `计划模式下限："${matchedKeyword}"`;
  return "计划模式下限";
}

/**
 * The sentinel is the whole reason this row is worth reading: it is the string an operator
 * would add to housekeeping_patterns to cover another client, so naming it turns the row into
 * the instruction. Without it the drawer says only that the classifier was skipped.
 */
function describeHousekeeping(matchedKeyword: string | undefined): string {
  if (matchedKeyword) return `客户端维护调用："${matchedKeyword}"`;
  return "客户端维护调用，已跳过分类器";
}

/** Rows logged before the floor was recorded name what it tracked back then instead of a number. */
function describeReasoningOverride(tierLabel: string | undefined, floor: number | undefined): string {
  const stated = floor === undefined ? "Simple 至 Medium 边界" : String(floor);
  return `启发式，${tierLabel ?? "REASONING"} 覆盖（2 个及以上推理标记，分数至少 ${stated}）`;
}

const CONSTANT_CAUSE_LABELS: Record<string, string> = {
  heuristic_scorer: "启发式评分器",
  heuristic_v2: "启发式 v2",
  capability_classifier: "能力分类器",
  capability_classifier_fallback: "Capable 层级，能力分类器失败",
  llm_v2_classifier: "FUSE v2",
  llm_v2_fallback: "Capable 层级，FUSE v2 分类器失败",
  heuristic_first_short_circuit: "启发式评分器，已跳过分类器",
  hybrid_short_circuit: "启发式评分器，分数远离各边界",
  classifier_plugin: "自定义分类器插件",
  semantic_keyword_match: "语义关键词匹配",
  session_affinity_pin: "固定到会话",
  session_affinity_escalation: "从会话固定升级",
  user_turn_continuation: "连续轮次，已跳过分类器",
  modality_escalation: "因图像输入升级",
  modality_pin_override: "为图像输入覆盖会话固定",
  quality_tier: "质量层级映射",
  bandit: "自适应 bandit",
  default_fallback: "默认模型，无匹配路由",
  classifier_fallback: "回退层级，分类器失败",
  default_model_fallback: "默认模型，分类器失败",
};

function describeCause(decision: RoutingDecision): string {
  const {
    cause,
    classifier_model: classifierModel,
    matched_keyword: matchedKeyword,
    tier_label: tierLabel,
    reasoning_override_min_score: overrideFloor,
  } = decision;

  const constant = cause ? CONSTANT_CAUSE_LABELS[cause] : undefined;
  if (constant) return constant;

  switch (cause) {
    case "reasoning_override":
      return describeReasoningOverride(tierLabel, overrideFloor);
    case "llm_classifier":
      return classifierModel ? `LLM 分类器（${classifierModel}）` : "LLM 分类器";
    case "jev_classifier":
      return "OSS 分类器";
    case "literal_keyword_match":
    case "keyword":
      return matchedKeyword ? `关键词匹配："${matchedKeyword}"` : "关键词匹配";
    case "plan_mode":
      return describePlanModeFloor(matchedKeyword);
    case "housekeeping":
      return describeHousekeeping(matchedKeyword);
    default:
      return cause ?? "未知";
  }
}

/**
 * A request can ask to escalate and get nowhere, when its tier is already the highest
 * one configured. That row still has to say the caller asked, otherwise it reads as an
 * ordinary route; it just must not claim a bump that did not happen. Only called when
 * the request escalated or asked to, so there is no "did not escalate" case.
 */
function describeEscalation(escalated: boolean, keyword: string | undefined): string {
  if (escalated) return keyword ? `是，关键词 "${keyword}"` : "是";
  return keyword ? `通过 "${keyword}" 请求；已在最高层级` : "已请求升级；已在最高层级";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function PercentageRow({ label, value, unit = "%" }: { label: string; value?: number; unit?: string }) {
  if (value === undefined) return null;
  return (
    <Row label={label}>
      <span className="tabular-nums">{`${(value * 100).toFixed(1)}${unit}`}</span>
    </Row>
  );
}

function CapabilityForecast({ decision }: { decision: RoutingDecision }) {
  const {
    classifier_p_solve: raw,
    classifier_calibrated_p_solve: calibrated,
    classifier_threshold: threshold,
    classifier_capability_boundary: boundary,
    classifier_primary_rule: rule,
    classifier_calibration_version: version,
  } = decision;
  if ([raw, calibrated, threshold, boundary, rule].every((value) => value === undefined)) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-1 text-sm font-medium">能力估计</div>
      <div className="mb-2 text-xs text-muted-foreground">高效模型解题概率</div>
      <PercentageRow label="原始值" value={raw} />
      <PercentageRow label="校准值" value={calibrated} />
      <PercentageRow label="阈值" value={threshold} />
      {boundary && <Row label="边界">{boundary}</Row>}
      {rule && <Row label="规则">{rule}</Row>}
      {version && <Row label="校准版本">{version}</Row>}
    </div>
  );
}

function FuseV2Forecast({ decision }: { decision: RoutingDecision }) {
  const {
    classifier_efficient_p_solve: rawEfficient,
    classifier_capable_p_solve: rawCapable,
    classifier_calibrated_efficient_p_solve: calibratedEfficient,
    classifier_calibrated_capable_p_solve: calibratedCapable,
    classifier_max_quality_gap: allowedGap,
    classifier_calibration_version: version,
  } = decision;
  if ([rawEfficient, rawCapable, calibratedEfficient, calibratedCapable, allowedGap].every((v) => v === undefined)) {
    return null;
  }
  const isCalibrated = [calibratedEfficient, calibratedCapable, version].some((value) => value !== undefined);
  const efficient = isCalibrated ? calibratedEfficient : rawEfficient;
  const capable = isCalibrated ? calibratedCapable : rawCapable;
  const gap = efficient !== undefined && capable !== undefined ? capable - efficient : undefined;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-1 text-sm font-medium">FUSE v2 估计</div>
      <PercentageRow label="高效（原始）" value={rawEfficient} />
      <PercentageRow label="Capable（原始）" value={rawCapable} />
      <PercentageRow label="高效（校准）" value={calibratedEfficient} />
      <PercentageRow label="Capable（校准）" value={calibratedCapable} />
      <PercentageRow label="实际差距" value={gap} unit=" 百分点" />
      <PercentageRow label="允许差距" value={allowedGap} unit=" 百分点" />
      {version && <Row label="校准版本">{version}</Row>}
    </div>
  );
}

export function RoutingDecisionCard({
  decision,
  className,
}: {
  decision?: RoutingDecision | null;
  className?: string;
}) {
  if (!decision || !decision.cause) return null;

  const {
    router_model_name: routerModelName,
    router_type: routerType,
    routed_model: routedModel,
    tier,
    tier_label: tierLabel,
    request_type: requestType,
    score,
    signals,
    escalated,
    escalation_keyword: escalationKeyword,
    tier_boundaries: tierBoundaries,
    heuristic_v2_forecast: forecast,
  } = decision;

  // On an override row the score did not decide the tier, so showing it against a
  // boundary would claim something untrue. Keyed off the cause rather than a marker
  // inside `signals`, which redaction can remove.
  const scoreExplanation =
    score !== undefined && decision.cause !== "reasoning_override" && decision.cause !== "plan_mode"
      ? describeScoreAgainstBoundaries(score, tierBoundaries, tierLabel !== undefined)
      : null;

  return (
    <div className={cn("mb-6 w-full max-w-full overflow-hidden rounded-lg bg-card shadow-sm", className)}>
      <div className="border-b px-4 py-2.5 text-sm font-medium">路由</div>
      <div className="px-4 py-3">
        {routerModelName && (
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Waypoints size={14} aria-hidden />
            <span>{routerModelName}</span>
            {routerType && (
              <span className="font-normal text-muted-foreground">
                ({ROUTER_TYPE_LABELS[routerType] ?? routerType})
              </span>
            )}
          </div>
        )}

        {tier && (
          <Row label="层级">
            <Badge variant="secondary" className="font-normal">
              {tierLabel ?? tier}
            </Badge>
          </Row>
        )}

        {requestType && <Row label="请求类型">{requestType}</Row>}

        <Row label="决策依据">{describeCause(decision)}</Row>
        {decision.classifier_model && <Row label="分类器模型">{decision.classifier_model}</Row>}
        {decision.classifier_confidence != null && (
          <Row label="置信度">{(decision.classifier_confidence * 100).toFixed(1)}%</Row>
        )}
        {decision.classifier_probabilities && (
          <Row label="概率">
            {Object.entries(decision.classifier_probabilities).map(([name, probability]) => (
              <div key={name}>
                {name}: {(probability * 100).toFixed(1)}%
              </div>
            ))}
          </Row>
        )}
        {decision.classifier_cost != null && <Row label="分类器成本">${decision.classifier_cost.toFixed(8)}</Row>}

        {score !== undefined && (
          <Row label="分数">
            <span className="tabular-nums">{score.toFixed(2)}</span>
            {scoreExplanation && <span className="ml-2 text-muted-foreground">({scoreExplanation})</span>}
          </Row>
        )}

        {routedModel && <Row label="路由至">{routedModel}</Row>}

        {escalated !== undefined && <Row label="已升级">{describeEscalation(escalated, escalationKeyword)}</Row>}

        {forecast && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-1 text-sm font-medium">启发式 v2 估计</div>
            <Row label="按层级成功概率">
              <span className="flex flex-wrap gap-1">
                {["SIMPLE", "MEDIUM", "COMPLEX", "REASONING"].map((predictedTier) => (
                  <Badge key={predictedTier} variant="outline" className="font-normal tabular-nums">
                    {predictedTier} {(forecast.probabilities[predictedTier] * 100).toFixed(1)}%
                  </Badge>
                ))}
              </span>
            </Row>
            <Row label="阈值">
              <span className="tabular-nums">{(forecast.threshold * 100).toFixed(1)}%</span>
            </Row>
            <Row label="预测层级">{forecast.predicted_tier}</Row>
            <Row label="请求类型">{forecast.request_type}</Row>
          </div>
        )}

        <CapabilityForecast decision={decision} />
        <FuseV2Forecast decision={decision} />

        {signals && signals.length > 0 && (
          <Row label="信号">
            <span className="flex flex-wrap gap-1">
              {signals.map((signal) => (
                <Badge key={signal} variant="outline" className="font-normal">
                  {signal}
                </Badge>
              ))}
            </span>
          </Row>
        )}
      </div>
    </div>
  );
}

export default RoutingDecisionCard;
