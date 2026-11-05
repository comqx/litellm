import { z } from "zod";
import { DIMENSION_LABELS } from "./heuristic_scoring_knobs";

const customDimensionShape = {
  name: z.string(),
  weight: z.number(),
  keywords: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
  scoring_mode: z.enum(["binary", "match_count"]).optional(),
};
const customDimensionSchema = z.object(customDimensionShape);

export type CustomDimension = z.infer<typeof customDimensionSchema>;
export type CustomDimensionRow = CustomDimension & { id: string };

export const hydrateCustomDimensions = (raw: unknown): CustomDimensionRow[] | undefined => {
  if (raw === undefined) return undefined;
  const parsed = z.array(customDimensionSchema).safeParse(raw);
  return parsed.success ? parsed.data.map((row, index) => ({ ...row, id: `stored-${index}` })) : undefined;
};

export const serializeCustomDimensions = (rows: CustomDimensionRow[]): CustomDimension[] =>
  rows.map(({ id: _id, ...dimension }) => dimension);

export const customDimensionsError = (
  rows: CustomDimensionRow[] | undefined,
  builtinNames: string[] = Object.keys(DIMENSION_LABELS),
): string | null => {
  if (!rows) return null;
  if (rows.length > 16) return "一个路由器最多只能有 16 个自定义维度";
  const names = rows.map((row) => row.name.toLowerCase());
  for (const [index, row] of rows.entries()) {
    const prefix = `自定义维度 ${index + 1}：`;
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(row.name))
      return (
        prefix + "名称须以字母开头，后接字母、数字或下划线（最多 64 个字符）"
      );
    if (builtinNames.some((name) => name.toLowerCase() === row.name.toLowerCase()))
      return prefix + "请选择一个未被内置权重占用的名称";
    if (names.indexOf(row.name.toLowerCase()) !== index) return prefix + "名称必须唯一";
    if (!Number.isFinite(row.weight) || row.weight <= 0 || row.weight > 1)
      return prefix + "权重必须大于 0 且不超过 1";
    const matchers = [...(row.keywords ?? []), ...(row.patterns ?? [])];
    if (!matchers.length || matchers.some((matcher) => !matcher.trim()))
      return prefix + "请添加至少一个非空的关键词或正则表达式";
    if (
      matchers.length > 32 ||
      matchers.some((matcher) => [...matcher].length > 256) ||
      matchers.reduce((total, matcher) => total + [...matcher].length, 0) > 4096
    )
      return prefix + "最多 32 个匹配项，每项 256 个字符，合计 4096 个字符";
  }
  return null;
};
