import { z } from "zod";

const isBlank = (value: string): boolean => value.trim() === "";

const amountOrEmpty = z
  .string()
  .refine(
    (value) => isBlank(value) || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "必须是非负数字",
  );

const defaultTeamRowSchema = z.object({
  team_id: z
    .string()
    .nullable()
    .pipe(z.string({ error: "请选择 Team" }).min(1, "请选择 Team")),
  max_budget_in_team: amountOrEmpty,
  user_role: z.enum(["user", "admin"]),
});

export type DefaultTeamRowValues = z.input<typeof defaultTeamRowSchema>;

export const EMPTY_TEAM_ROW: DefaultTeamRowValues = { team_id: null, max_budget_in_team: "", user_role: "user" };

const defaultUserSettingsShape = {
  user_role: z.string(),
  max_budget: amountOrEmpty,
  budget_duration: z.string(),
  models: z.array(z.string()),
  teams: z.array(defaultTeamRowSchema),
};

export const defaultUserSettingsSchema = z.object(defaultUserSettingsShape).superRefine((values, ctx) => {
  const repeatedRows = values.teams.flatMap((team, index) =>
    team.team_id !== "" && values.teams.findIndex((other) => other.team_id === team.team_id) < index ? [index] : [],
  );

  repeatedRows.forEach((index) =>
    ctx.addIssue({
      code: "custom",
      message: "该 Team 已在列表中",
      path: ["teams", index, "team_id"],
    }),
  );
});

export type DefaultUserSettingsFormValues = z.input<typeof defaultUserSettingsSchema>;
export type DefaultUserSettingsSubmitValues = z.output<typeof defaultUserSettingsSchema>;
