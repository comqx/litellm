import { isForecastClassifier } from "./forecast_classifier_config";
import type { ClassifierType, ComplexityTiers } from "./ComplexityRouterConfig";
import type { ComplexityTier } from "./KeywordTierRules";
import type { TierModelParams, TierModelParamsByTier } from "./complexity_router_tiers";

export const TIER_ORDER: ComplexityTier[] = ["SIMPLE", "MEDIUM", "COMPLEX", "REASONING"];

export const ALL_BUILT_IN_TIERS: ComplexityTier[] = ["NON_REASONING", ...TIER_ORDER];

/** The ladder one router renders, ascending; NON_REASONING appears only when enabled. */
export const tierOrderFor = (enableNonReasoningTier: boolean | undefined): ComplexityTier[] =>
  enableNonReasoningTier ? ALL_BUILT_IN_TIERS : TIER_ORDER;

export interface TierRow {
  id: string;
  name: string;
  definition: string;
  models: string[];
}

/** A row plus the per-model params it owns, so the two can never be keyed differently. */
export type ActiveTierRow = TierRow & { params: Record<string, TierModelParams> };

export interface CustomTierSet {
  tiers: TierRow[];
  fallback_tier_id: string;
}

// Mirrors TierDefinition in litellm/router_strategy/complexity_router/config.py
export const MIN_TIER_COUNT = 2;
export const MAX_TIER_COUNT = 8;
export const MAX_TIER_NAME_CHARS = 64;
export const MAX_TIER_DEFINITION_CHARS = 500;

export interface ActiveTierSet {
  classifier_type?: ClassifierType;
  tiers: ComplexityTiers;
  enable_non_reasoning_tier?: boolean;
  custom_tier_set?: CustomTierSet;
  tier_model_params?: TierModelParamsByTier;
}

export const activeTierName = (row: TierRow): string => row.name.trim();

// Casefold, matching the backend's name-uniqueness rule. NOT the comparison the keyword-rule gate
// uses: _validate_keyword_rule_tiers is exact membership, so folding there clears a save the
// backend then rejects.
export const sameTierIdentity = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

export const isBuiltInTierName = (name: string): boolean =>
  ALL_BUILT_IN_TIERS.some((tier) => sameTierIdentity(tier, name));

const builtInRow = (tier: keyof ComplexityTiers, tiers: ComplexityTiers): TierRow => ({
  id: tier,
  name: tier,
  definition: "",
  models: tiers[tier] ?? [],
});

// The only reader of the tier set. Built-in rows carry the canonical tier key as their id, so every
// pointer into the set is a row id in both modes and nothing downstream branches on the mode.
export const activeTierRows = (value: ActiveTierSet): ActiveTierRow[] => {
  const rows =
    value.custom_tier_set?.tiers ??
    tierOrderFor(value.enable_non_reasoning_tier).map((tier) => builtInRow(tier, value.tiers));
  return rows
    .filter(
      (row) =>
        value.custom_tier_set || !isForecastClassifier(value.classifier_type ?? "heuristic") || row.models.length > 0,
    )
    .map((row) => ({ ...row, params: value.tier_model_params?.[row.id] ?? {} }));
};

// The wire shape of an edited tier set, shared by the payload builder and the prompt preview so the
// preview cannot ask the proxy to render definitions the save would not send.
export const tierDefinitionsFromRows = (rows: readonly TierRow[]): { name: string; description?: string }[] =>
  rows.map((row) => ({
    name: activeTierName(row),
    ...(row.definition.trim() && { description: row.definition.trim() }),
  }));

export const tierRowById = <T extends TierRow>(rows: readonly T[], id: string | undefined): T | undefined =>
  id === undefined ? undefined : rows.find((row) => row.id === id);

export const tierRowByName = <T extends TierRow>(rows: readonly T[], name: string): T | undefined =>
  rows.find((row) => sameTierIdentity(row.name, name));

// Mirrors init_complexity_router_deployment (litellm/router.py): a pin wins, then the fallback
// tier's pool, then MEDIUM or SIMPLE looked up by exact name, so a row named `medium` is no match.
export const resolveComplexityDefaultModel = (value: ActiveTierSet, pinned?: string): string | undefined => {
  const rows = activeTierRows(value);
  const named = (name: string) => rows.find((row) => activeTierName(row) === name)?.models[0];
  const fallbackPoolModel = tierRowById(rows, value.custom_tier_set?.fallback_tier_id)?.models[0];
  const builtInDefault = named("MEDIUM") || named("SIMPLE");
  return pinned?.trim() || fallbackPoolModel || builtInDefault;
};

// Stored params arrive keyed by the wire tier name while the editor keys them by row id, which is
// ephemeral for a custom row. A key matching no row passes 至, so a tier this editor does not
// render keeps its params.
export const tierParamsByRowId = (
  params: TierModelParamsByTier | undefined,
  rows: readonly TierRow[],
): TierModelParamsByTier | undefined =>
  params &&
  Object.fromEntries(Object.entries(params).map(([tier, byModel]) => [tierRowByName(rows, tier)?.id ?? tier, byModel]));

// Params keyed by the rows that own them, dropping the rows with none so an untouched router keeps
// the key out of its payload.
export const rowParamsByTier = (rows: readonly ActiveTierRow[]): TierModelParamsByTier | undefined => {
  const owned = rows.filter((row) => Object.keys(row.params).length > 0);
  return owned.length > 0 ? Object.fromEntries(owned.map((row) => [row.id, row.params])) : undefined;
};

export interface TierRestriction {
  omit: readonly string[];
  reason: string;
}

// One source for both the disabled control and the wire, so a control cannot grey out while its
// value still ships. All but heuristicScoring are rejected outright by _validate_tier_definitions;
// heuristicScoring the backend accepts, and it is dropped because that scorer never runs here.
export const CUSTOM_TIER_RESTRICTIONS = {
  displayNames: {
    omit: ["tier_labels"],
    reason: "显示名称用于重命名内置层级，而你的层级集合已将其替换。请直接为每个层级命名",
  },
  escalation: {
    omit: ["escalation_keywords"],
    reason: "升级沿内置层级阶梯提升请求，而你的层级集合已将其替换",
  },
  stallEscalation: {
    omit: ["stall_escalation_enabled", "stall_escalation_window", "stall_escalation_repeat_threshold"],
    reason: "停滞升级沿内置层级阶梯提升请求，而你的层级集合已将其替换",
  },
  adaptive: {
    omit: ["adaptive", "adaptive_weights", "tier_distance_penalty", "adaptive_eligible"],
    reason: "自适应路由沿内置层级阶梯为 模型评分，而你的层级集合已将其替换",
  },
  sessionAffinity: {
    omit: [],
    reason: "会话固定沿内置层级阶梯升级，而你的层级集合已将其替换",
  },
  heuristicClassifier: {
    omit: ["heuristic_first_max_tier", "hybrid_boundary_margin", "local_heuristic"],
    reason:
      "启发式评分器只会产出内置层级，因此编辑过的层级集合需要 LLM 或 Jev 分类器。" +
      "启发式优先和混合也因同样的原因不可用：它们的本地评分器会决定它确定的那部分流量",
  },
  heuristicScoring: {
    omit: [
      "tier_boundaries",
      "token_thresholds",
      "dimension_weights",
      "custom_dimensions",
      "reasoning_override_min_score",
      "custom_technical_keywords",
    ],
    reason: "启发式评分器在编辑过的层级集合下永远不会运行，因此它的输入不会生效",
  },
  classificationRubric: {
    omit: [],
    reason: "预设的校准示例是针对内置层级编写的，而你的层级集合已将其替换",
  },
  classifierFallback: {
    omit: ["classifier_fallback"],
    reason: "回退层级是编辑过的层级集合在分类器失败时的路由去向",
  },
} as const satisfies Record<string, TierRestriction>;

export const CUSTOM_TIER_OMITTED_KEYS: readonly string[] = Object.values(CUSTOM_TIER_RESTRICTIONS).flatMap(
  (restriction) => restriction.omit,
);

// Row-shape errors the backend cannot phrase per row. Payload validity is the dry-run's job.
export const getCustomTierRowsError = (customTierSet: CustomTierSet): string | null => {
  const rows = customTierSet.tiers;
  if (rows.length < MIN_TIER_COUNT || rows.length > MAX_TIER_COUNT)
    return `层级集合需要 ${MIN_TIER_COUNT} 到 ${MAX_TIER_COUNT} 个层级`;
  if (rows.some((row) => !activeTierName(row))) return "请为每个层级命名";
  const folded = rows.map((row) => row.name.trim().toLowerCase());
  if (new Set(folded).size !== folded.length) return "层级名称必须唯一（不区分大小写）";
  if (rows.some((row) => !row.definition.trim() && !isBuiltInTierName(row.name)))
    return "每个自定义层级都需要定义：它是分类器路由所依据的评分标准";
  if (!tierRowById(rows, customTierSet.fallback_tier_id)) return "请为分类器失败的情况选择一个 回退层级";
  return null;
};
