import { z } from "zod";

const isBlank = (value: string): boolean => value.trim() === "";

const isJsonObject = (value: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

const wholeNumberOrEmpty = z
  .string()
  .refine((value) => isBlank(value) || /^\d+$/.test(value.trim()), "必须是非负整数");

const amountOrEmpty = z
  .string()
  .refine(
    (value) => isBlank(value) || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "必须是非负数字",
  );

const orgSettingsShape = {
  organization_alias: z.string().min(1, "请Type Organization 名称"),
  models: z.array(z.string()),
  max_budget: amountOrEmpty,
  budget_duration: z.string(),
  tpm_limit: wholeNumberOrEmpty,
  rpm_limit: wholeNumberOrEmpty,
  vector_stores: z.array(z.string()),
  mcp: z.object({
    servers: z.array(z.string()),
    accessGroups: z.array(z.string()),
    toolsets: z.array(z.string()),
  }),
  metadata: z.string().refine((value) => isBlank(value) || isJsonObject(value), "元数据必须是有效的 JSON 对象"),
};

export const orgSettingsSchema = z.object(orgSettingsShape);

export type OrgSettingsFormValues = z.output<typeof orgSettingsSchema>;
