import { z } from "zod";

export const accessGroupCreateSchema = z.object({
  name: z.string().refine((value) => value.trim() !== "", "请输入 访问组 名称"),
  description: z.string(),
  modelIds: z.array(z.string()),
  mcpServerIds: z.array(z.string()),
  agentIds: z.array(z.string()),
});

export type AccessGroupCreateFormValues = z.output<typeof accessGroupCreateSchema>;
