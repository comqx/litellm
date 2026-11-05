import { z } from "zod";

export type DecisionEndpoint = "/v1/systemone" | "/typesafe/v1/systemone";

const decisionsJson = z.union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())]);
const decisionInstructions = decisionsJson.nullish();
const decisionQuestionSchema = z.discriminatedUnion("type", [
  z.looseObject({
    type: z.literal("choice"),
    instructions: decisionInstructions,
    criteria: z.record(z.string(), decisionsJson.nullable()).refine((value) => {
      const count = Object.keys(value).length;
      return count >= 1 && count <= 255;
    }, "选择题选项数量须在 1 到 255 之间。"),
  }),
  z
    .looseObject({
      type: z.literal("noul"),
      instructions: decisionInstructions,
      criteria: z.partialRecord(z.enum(["true", "false"]), decisionsJson.nullable()).nullish(),
    })
    .refine((value) => value.instructions != null || value.criteria != null, {
      message: "是/否问题需要 instructions 或 criteria。",
    }),
  z.looseObject({
    type: z.literal("score"),
    instructions: decisionInstructions,
    criteria: z.array(decisionsJson).min(1).max(10),
  }),
]);

export const decisionsRequestSchema = z.looseObject({
  model: z
    .string()
    .refine((value) => value.trim().length > 0, "model 必须为非空字符串。")
    .optional(),
  state: decisionsJson,
  questions: z.record(z.string().min(1), decisionQuestionSchema).refine((value) => {
    const count = Object.keys(value).length;
    return count >= 1 && count <= 128;
  }, "questions 数量须在 1 到 128 之间。"),
});

export type DecisionRequest = z.infer<typeof decisionsRequestSchema>;
export type PlaygroundRequest = SystemOneRequest | DecisionRequest;
export type PlaygroundQuestion = SystemOneQuestion | z.infer<typeof decisionQuestionSchema>;

const MAX_CHOICE_OPTIONS = 255;

const nonEmptyString = (message: string) =>
  z.string({ error: message }).refine((value) => value.trim().length > 0, message);

const instructions = z.string({
  error: (iss) => (iss.input === undefined ? "缺少必填字段 instructions。" : "instructions 必须是字符串。"),
});

const choiceQuestionSchema = z.looseObject({
  type: z.literal("choice"),
  instructions,
  criteria: z
    .record(z.string(), z.string({ error: "选择题描述必须是字符串。" }), {
      error: "选择题 criteria 必须是标签到描述的对象映射。",
    })
    .refine((criteria) => {
      const count = Object.keys(criteria).length;
      return count >= 1 && count <= MAX_CHOICE_OPTIONS;
    }, `选择题选项数量须在 1 到 ${MAX_CHOICE_OPTIONS} 之间。`),
});

const noulQuestionSchema = z.looseObject({
  type: z.literal("noul"),
  instructions,
  criteria: z
    .looseObject(
      {
        true: z.string({ error: "noul 的 true criteria 必须是字符串。" }).optional(),
        false: z.string({ error: "noul 的 false criteria 必须是字符串。" }).optional(),
      },
      { error: "若提供 noul criteria，必须是对象。" },
    )
    .optional(),
});

const scoreQuestionSchema = z.looseObject({
  type: z.literal("score"),
  instructions,
  criteria: z
    .array(z.string({ error: "评分层级必须是字符串。" }), {
      error: "评分 criteria 必须是层级数组。",
    })
    .min(2, "评分 criteria 至少包含 2 个层级。"),
});

const QUESTION_ERROR_MESSAGES: Partial<Record<z.core.$ZodIssue["code"], string>> = {
  invalid_union: "问题 type 必须是 choice、noul 或 score。",
  invalid_type: "问题必须是对象。",
};

const questionSchema = z.discriminatedUnion("type", [choiceQuestionSchema, noulQuestionSchema, scoreQuestionSchema], {
  error: (iss) => QUESTION_ERROR_MESSAGES[iss.code],
});

export const systemOneRequestSchema = z.looseObject(
  {
    model: nonEmptyString("model 必须为非空字符串。").optional(),
    state: z.unknown().nonoptional({ error: "缺少必填字段 state。" }),
    questions: z
      .record(z.string(), questionSchema, {
        error: (iss) =>
          iss.input === undefined ? "缺少必填字段 questions。" : "questions 必须是非空对象。",
      })
      .refine((questions) => Object.keys(questions).length > 0, "至少需要一个问题。"),
  },
  { error: "负载必须是 JSON 对象。" },
);

const probability = z.number().finite().min(0).max(1);
const probabilities = z.record(z.string(), probability);

const noulAnswerSchema = z.looseObject({ type: z.literal("noul"), noul: probability });

const choiceAnswerShape = {
  type: z.literal("choice"),
  choice: z.string(),
  confidence: probability.optional(),
  probabilities,
};
const choiceAnswerSchema = z.looseObject(choiceAnswerShape);

const scoreAnswerShape = {
  type: z.literal("score"),
  score: z.number().finite(),
  confidence: probability.optional(),
  legend: z.record(z.string(), decisionsJson).optional(),
  probabilities,
};
const scoreAnswerSchema = z.looseObject(scoreAnswerShape);

const tokenCount = z.number().finite().nonnegative();

export const systemOneResponseSchema = z.looseObject({
  model: nonEmptyString("model 必须为非空字符串。").nullish(),
  answers: z.record(
    z.string(),
    z.discriminatedUnion("type", [noulAnswerSchema, choiceAnswerSchema, scoreAnswerSchema]),
  ),
  usage: z.looseObject({ input_tokens: tokenCount, output_tokens: tokenCount }).nullish(),
});

export type SystemOneRequest = z.infer<typeof systemOneRequestSchema>;
export type SystemOneQuestion = z.infer<typeof questionSchema>;
export type SystemOneResponse = z.infer<typeof systemOneResponseSchema>;
export type SystemOneAnswer = SystemOneResponse["answers"][string];
