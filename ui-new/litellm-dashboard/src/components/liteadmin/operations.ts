import { zodFunction } from "openai/helpers/zod";
import { z } from "zod";
import { apiClient } from "@/components/networking";
import { ApiError } from "@/lib/http/client";
import type { components } from "@/lib/http/schema";
import { generatedKey, projectToolResult, type ResultKind } from "./toolResults";

export interface LiteAdminAction {
  id: string;
  name: string;
  title: string;
  arguments: Record<string, unknown>;
  destructive: boolean;
}

export type ActionResult = { status: "completed"; key?: string } | { status: "unknown"; message: string };

export interface OperationContext {
  accessToken: string;
  signal: AbortSignal;
  assertCurrent: () => void;
  beforeTool: () => void;
  confirm: (action: LiteAdminAction) => Promise<boolean>;
  onResult: (action: LiteAdminAction, result: ActionResult) => void;
}

type Schemas = components["schemas"];
const text = z.string().min(1).max(200);
const hash = z.string().regex(/^[a-f0-9]{64}$/i, "Use the key hash from a lookup, not a raw API key.");
const optional = <Schema extends z.ZodType<unknown>>(schema: Schema) => schema.nullable();
type NullsStripped<T> = { [K in keyof T]: Exclude<T[K], null> };
const stripNulls = <T extends Record<string, unknown>>(args: T): NullsStripped<T> =>
  Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, value === null ? undefined : value]),
  ) as NullsStripped<T>;
const optionalText = optional(text);
const amount = optional(z.number().finite().nonnegative());
const limit = optional(z.number().int().nonnegative());
const models = optional(z.array(text).max(50));
const page = z.number().int().min(1);
const pageSize = z.number().int().min(1).max(50);
const limits = { max_budget: amount, budget_duration: optionalText, rpm_limit: limit, tpm_limit: limit };
const keyFields = {
  key_alias: optionalText,
  team_id: optionalText,
  user_id: optionalText,
  models,
  ...limits,
  budget_id: optionalText,
  duration: optionalText,
};
const teamFields = { team_alias: optionalText, organization_id: optionalText, models, ...limits };
const userFields = {
  user_email: optional(z.email().max(200)),
  user_alias: optionalText,
  user_role: optional(z.enum(["proxy_admin", "proxy_admin_viewer", "internal_user", "internal_user_viewer"])),
  models,
  ...limits,
};
const object = <Shape extends z.ZodRawShape>(shape: Shape) => z.strictObject(shape);
const dated = <Shape extends z.ZodRawShape>(shape: Shape) =>
  object({ start_date: z.iso.date(), end_date: z.iso.date(), ...shape }).refine((value: Record<string, unknown>) => {
    if (typeof value.start_date !== "string" || typeof value.end_date !== "string") return false;
    const days = (Date.parse(value.end_date) - Date.parse(value.start_date)) / 86_400_000;
    return days >= 0 && days <= 366;
  }, "Choose an ordered date range of at most 366 days.");

const keysListFields = {
  page,
  page_size: pageSize,
  search: optionalText,
  team_id: optionalText,
  user_id: optionalText,
};
const teamsListFields = { page, page_size: pageSize, search: optionalText, organization_id: optionalText };
const teamMemberAddFields = {
  team_id: text,
  member: object({ user_id: text, role: z.enum(["admin", "user"]) }),
  max_budget_in_team: amount,
  budget_duration: optionalText,
};
const teamMemberUpdateFields = {
  team_id: text,
  user_id: text,
  role: optional(z.enum(["admin", "user"])),
  max_budget_in_team: amount,
  budget_duration: optionalText,
  rpm_limit: limit,
  tpm_limit: limit,
};
const spendReportFields = {
  group_by: z.enum(["team", "customer", "api_key"]),
  api_key: optional(hash),
  team_id: optionalText,
  internal_user_id: optionalText,
  customer_id: optionalText,
};
const requestLogsFields = {
  page,
  page_size: pageSize,
  request_id: optionalText,
  team_id: optionalText,
  user_id: optionalText,
  model: optionalText,
  status_filter: optional(z.enum(["success", "failure"])),
};

export function createLiteAdminOperations(context: OperationContext) {
  const active = () => {
    context.signal.throwIfAborted();
    context.assertCurrent();
  };
  const auth = { accessToken: context.accessToken, signal: context.signal };
  const operation =
    (mode: "read" | "write" | "delete", kind: ResultKind, extraArguments?: Record<string, unknown>) =>
    <Schema extends z.ZodType<Record<string, unknown>>>(
      name: string,
      title: string,
      schema: Schema,
      execute: (args: NullsStripped<z.output<Schema>>) => Promise<unknown>,
    ) => {
      const definition = {
        name,
        description: `${title}. Null means omitted or unchanged. ${mode === "read" ? "Read-only." : "Requires the administrator to review and confirm the change."}`,
        parameters: schema,
        function: async (rawArgs: unknown) => {
          const args = stripNulls(rawArgs as z.output<Schema>);
          active();
          context.beforeTool();
          const action: LiteAdminAction | undefined =
            mode === "read"
              ? undefined
              : {
                  id: crypto.randomUUID(),
                  name,
                  title,
                  arguments: {
                    ...Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined)),
                    ...extraArguments,
                  },
                  destructive: mode === "delete",
                };
          if (action) {
            const approved = await context.confirm(action);
            active();
            if (!approved) throw new Error("操作已取消，未发送任何变更。");
          }
          const outcome = await Promise.resolve()
            .then(() => {
              active();
              return execute({ ...args, ...extraArguments } as NullsStripped<z.output<Schema>>);
            })
            .then(
              (value) => ({ ok: true, value }) as const,
              (error: unknown) => ({ ok: false, error }) as const,
            );
          active();
          if (!outcome.ok) {
            if (action) {
              const result: ActionResult = {
                status: "unknown",
                message: "无法确认变更是否生效。请先核对资源后再试。",
              };
              context.onResult(action, result);
              throw new Error(result.message);
            }
            return {
              operation: name,
              success: false,
              status: outcome.error instanceof ApiError ? outcome.error.status : undefined,
              message: "网关无法完成此次查询。",
            };
          }
          const key = name === "key_create" || name === "user_create" ? generatedKey(outcome.value) : undefined;
          if (action) context.onResult(action, { status: "completed", ...(key ? { key } : {}) });
          return {
            operation: name,
            success: true,
            result: projectToolResult(kind, outcome.value, [context.accessToken, ...(key ? [key] : [])]),
          };
        },
      };
      return zodFunction(definition);
    };

  return [
    operation("read", "key")("keys_list", "列出虚拟 Key", object(keysListFields), (a) =>
      apiClient.get<unknown>("/key/list", {
        ...auth,
        query: {
          page: a.page,
          size: a.page_size,
          search: a.search,
          team_id: a.team_id,
          user_id: a.user_id,
          return_full_object: true,
        },
      }),
    ),
    operation("read", "key")("key_info", "查看虚拟 Key", object({ key: hash }), (a) =>
      apiClient.get<unknown>("/key/info", { ...auth, query: a }),
    ),
    operation("write", "key")("key_create", "创建虚拟 Key", object(keyFields), (a) =>
      apiClient.post<unknown>("/key/generate", { ...auth, body: a satisfies Partial<Schemas["GenerateKeyRequest"]> }),
    ),
    operation("write", "key")("key_update", "更新虚拟 Key", object({ key: hash, ...keyFields }), (a) =>
      apiClient.post<unknown>("/key/update", { ...auth, body: a satisfies Partial<Schemas["UpdateKeyRequest"]> }),
    ),
    operation("delete", "key")(
      "key_delete",
      "删除虚拟 Key",
      object({ keys: z.array(hash).min(1).max(20) }),
      (a) => apiClient.post<unknown>("/key/delete", { ...auth, body: a satisfies Schemas["KeyRequest"] }),
    ),
    operation("write", "key")("key_block", "封禁虚拟 Key", object({ key: hash }), (a) =>
      apiClient.post<unknown>("/key/block", { ...auth, body: a satisfies Schemas["BlockKeyRequest"] }),
    ),
    operation("write", "key")("key_unblock", "解封虚拟 Key", object({ key: hash }), (a) =>
      apiClient.post<unknown>("/key/unblock", { ...auth, body: a satisfies Schemas["BlockKeyRequest"] }),
    ),
    operation("read", "team")("teams_list", "列出 Team", object(teamsListFields), (a) =>
      apiClient.get<unknown>("/v2/team/list", { ...auth, query: a }),
    ),
    operation("read", "team")("team_info", "查看 Team 及其成员", object({ team_id: text }), (a) =>
      apiClient.get<unknown>("/team/info", { ...auth, query: { ...a, key_limit: 20 } }),
    ),
    operation("write", "team")("team_create", "创建 Team", object(teamFields), (a) =>
      apiClient.post<unknown>("/team/new", { ...auth, body: a satisfies Partial<Schemas["NewTeamRequest"]> }),
    ),
    operation("write", "team")("team_update", "更新 Team", object({ team_id: text, ...teamFields }), (a) =>
      apiClient.post<unknown>("/team/update", { ...auth, body: a satisfies Schemas["UpdateTeamRequest"] }),
    ),
    operation("delete", "team")(
      "team_delete",
      "删除 Team",
      object({ team_ids: z.array(text).min(1).max(20) }),
      (a) => apiClient.post<unknown>("/team/delete", { ...auth, body: a satisfies Schemas["DeleteTeamRequest"] }),
    ),
    operation("write", "team")("team_member_add", "添加 Team 成员", object(teamMemberAddFields), (a) =>
      apiClient.post<unknown>("/team/member_add", { ...auth, body: a satisfies Schemas["TeamMemberAddRequest"] }),
    ),
    operation("write", "team")("team_member_update", "更新 Team 成员", object(teamMemberUpdateFields), (a) =>
      apiClient.post<unknown>("/team/member_update", {
        ...auth,
        body: a satisfies Schemas["TeamMemberUpdateRequest"],
      }),
    ),
    operation("delete", "team")(
      "team_member_delete",
      "移除 Team 成员",
      object({ team_id: text, user_id: text }),
      (a) =>
        apiClient.post<unknown>("/team/member_delete", {
          ...auth,
          body: a satisfies Schemas["TeamMemberDeleteRequest"],
        }),
    ),
    operation("read", "user")(
      "users_list",
      "列出用户",
      object({ page, page_size: pageSize, search: optionalText }),
      (a) => apiClient.get<unknown>("/user/list", { ...auth, query: a }),
    ),
    operation("read", "user")("user_info", "查看用户", object({ user_id: text }), (a) =>
      apiClient.get<unknown>("/v2/user/info", { ...auth, query: a }),
    ),
    operation("write", "user", { auto_create_key: false })(
      "user_create",
      "创建用户（不创建 Key）",
      object({ user_id: optionalText, ...userFields }),
      (a) => apiClient.post<unknown>("/user/new", { ...auth, body: a satisfies Partial<Schemas["NewUserRequest"]> }),
    ),
    operation("write", "user")("user_update", "更新用户", object({ user_id: text, ...userFields }), (a) =>
      apiClient.post<unknown>("/user/update", { ...auth, body: a satisfies Partial<Schemas["UpdateUserRequest"]> }),
    ),
    operation("delete", "user")(
      "user_delete",
      "删除用户",
      object({ user_ids: z.array(text).min(1).max(20) }),
      (a) => apiClient.post<unknown>("/user/delete", { ...auth, body: a satisfies Schemas["DeleteUserRequest"] }),
    ),
    operation("read", "budget")(
      "budgets_list",
      "列出 Budget",
      object({ page, page_size: pageSize, search: optionalText }),
      (a) =>
        apiClient.get<unknown>("/management/v1/budgets", {
          ...auth,
          query: { page: a.page, page_size: a.page_size, q: a.search },
        }),
    ),
    operation("read", "budget")("budget_info", "查看 Budget", object({ budgets: z.array(text).min(1).max(20) }), (a) =>
      apiClient.post<unknown>("/budget/info", { ...auth, body: a satisfies Schemas["BudgetRequest"] }),
    ),
    operation("write", "budget")(
      "budget_create",
      "创建 Budget",
      object({ budget_id: optionalText, ...limits }),
      (a) => apiClient.post<unknown>("/budget/new", { ...auth, body: a satisfies Schemas["BudgetNewRequest"] }),
    ),
    operation("write", "budget")("budget_update", "更新 Budget", object({ budget_id: text, ...limits }), (a) =>
      apiClient.post<unknown>("/budget/update", { ...auth, body: a satisfies Schemas["BudgetNewRequest"] }),
    ),
    operation("delete", "budget")("budget_delete", "删除 Budget", object({ id: text }), (a) =>
      apiClient.post<unknown>("/budget/delete", { ...auth, body: a satisfies Schemas["BudgetDeleteRequest"] }),
    ),
    operation("read", "spend")(
      "spend_report",
      "按日期和分组查看 Spend（需要企业版许可证）",
      dated(spendReportFields),
      (a) => apiClient.get<unknown>("/global/spend/report", { ...auth, query: a }),
    ),
    operation("read", "spend")(
      "team_spend_report",
      "查看 Team 的 Spend（按 Model 与 Key，需要企业版许可证）",
      dated({ team_id: text }),
      (a) => apiClient.get<unknown>("/team/spend/report", { ...auth, query: a }),
    ),
    operation("read", "spend")(
      "key_spend_report",
      "查看 Key 的 Spend（按 Model，需要企业版许可证）",
      dated({ api_key: hash }),
      (a) => apiClient.get<unknown>("/key/spend/report", { ...auth, query: a }),
    ),
    operation("read", "log")(
      "request_logs",
      "列出请求成本、耗时和状态（不含提示词与响应）",
      dated(requestLogsFields),
      (a) =>
        apiClient.get<unknown>("/spend/logs/ui", {
          ...auth,
          query: { ...a, start_date: `${a.start_date} 00:00:00`, end_date: `${a.end_date} 23:59:59` },
        }),
    ),
  ];
}
