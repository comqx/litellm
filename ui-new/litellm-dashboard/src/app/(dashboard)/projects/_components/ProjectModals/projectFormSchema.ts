import { z } from "zod";

export const ALL_TEAM_MODELS = "all-team-models";

const repeatsEarlierValue = (values: readonly string[], index: number): boolean =>
  values[index] !== "" && values.indexOf(values[index]) !== index;

const modelLimitSchema = z.object({
  model: z.string().min(1, "缺少 Model"),
  tpm: z.number().optional(),
  rpm: z.number().optional(),
  itpm: z.number().optional(),
  otpm: z.number().optional(),
});

export const projectFormSchema = z
  .object({
    project_alias: z.string().min(1, "请输入 项目名称"),
    team_id: z
      .string()
      .nullable()
      .pipe(z.string({ error: "请选择团队" }).min(1, "请选择团队")),
    description: z.string().optional(),
    models: z.array(z.string()),
    max_budget: z.number().nullish(),
    isBlocked: z.boolean(),
    guardrails: z.array(z.string()).optional(),
    modelLimits: z.array(modelLimitSchema).optional(),
    metadata: z
      .array(
        z.object({
          key: z.string().min(1, "缺少键"),
          value: z.string().min(1, "缺少值"),
        }),
      )
      .optional(),
  })
  .superRefine((values, ctx) => {
    const models = (values.modelLimits ?? []).map((entry) => entry.model);
    models.forEach((_, index) => {
      if (repeatsEarlierValue(models, index)) {
        ctx.addIssue({ code: "custom", message: "Model 重复", path: ["modelLimits", index, "model"] });
      }
    });

    const keys = (values.metadata ?? []).map((entry) => entry.key);
    keys.forEach((_, index) => {
      if (repeatsEarlierValue(keys, index)) {
        ctx.addIssue({ code: "custom", message: "键重复", path: ["metadata", index, "key"] });
      }
    });
  });

export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type ProjectSubmitValues = z.output<typeof projectFormSchema>;

export const emptyProjectFormValues: ProjectFormValues = {
  project_alias: "",
  team_id: null,
  description: undefined,
  models: [],
  max_budget: undefined,
  isBlocked: false,
  guardrails: undefined,
  modelLimits: undefined,
  metadata: undefined,
};
