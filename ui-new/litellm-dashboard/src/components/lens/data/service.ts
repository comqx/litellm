import { z } from "zod";
import type { ApiClient } from "@/lib/http/client";
import { getAuthHeaderName } from "@/lib/http/runtime";
import type { Client } from "openapi-fetch";
import type { components, paths } from "@/lib/http/schema";
import { liveDatasetsApi, type DatasetsApi } from "../datasets/client";
import type {
  ActivitySelection,
  AnalysisModelInfo,
  Finding,
  Job,
  Lens,
  LensList,
  Review,
  RunWindow,
  Sample,
  Settings,
  SignalConfig,
  WorkerCreated,
} from "../model/types";

export type ExecutionContent = {
  readonly content: string;
  readonly offset: number;
  readonly has_more: boolean;
};
export type FindingStatus = Finding["status"];

const keySchema = z.object({ token: z.string(), key_alias: z.string().nullable().optional() });
const keyPageSchema = z.object({ keys: z.array(keySchema), total_pages: z.number() });
const keyInfoFields = {
  key_alias: z.string().nullable().optional(),
  models: z.array(z.string()),
  max_budget: z.number().nullable(),
  budget_duration: z.string().nullable().optional(),
  rpm_limit: z.number().nullable().optional(),
  tpm_limit: z.number().nullable().optional(),
  expires: z.string().nullable().optional(),
  status: z.string().optional(),
};
const keyInfoSchema = z.object({ info: z.object(keyInfoFields) });
export type Key = z.infer<typeof keySchema>;
export type KeyPage = z.infer<typeof keyPageSchema>;
export type KeyInfo = z.infer<typeof keyInfoSchema>["info"];

export type ReviewPage = { reviews: readonly Review[]; reviewed: number };

export interface AnalysisKeyRequest {
  readonly model: string;
  readonly budget: number;
}

export type ActivityAvailability = { traces: boolean; requests: boolean };
export type WatchAllResult = { watching: readonly string[]; skipped: readonly string[] };

export interface LensApi {
  /** Partitions query caches between backends (one token, or the demo). */
  readonly scope: string;
  readonly datasets: DatasetsApi;
  lenses(): Promise<LensList>;
  activity(): Promise<ActivityAvailability>;
  runs(lensId: string, offset: number): Promise<Job[]>;
  run(lensId: string, jobId: string): Promise<Job>;
  reviews(lensId: string, jobId: string, after: number): Promise<ReviewPage>;
  execution(lensId: string, executionId: string, offset: number): Promise<ExecutionContent>;
  sample(selection: ActivitySelection, offset: number, asOf: string): Promise<Sample>;
  agents(): Promise<string[]>;
  models(): Promise<{ data: { id: string }[] }>;
  modelDetails(): Promise<{ data: AnalysisModelInfo[] }>;
  keys(alias: string, page: number, signal: AbortSignal): Promise<KeyPage>;
  keyInfo(keyId: string): Promise<KeyInfo>;
  saveLens(id: string | undefined, settings: Settings): Promise<Lens>;
  startRun(lensId: string, request?: RunWindow): Promise<void>;
  watchAll(): Promise<WatchAllResult>;
  signalConfig(): Promise<SignalConfig>;
  saveSignalConfig(config: SignalConfig): Promise<SignalConfig>;
  cancelRun(lensId: string): Promise<void>;
  reviewFinding(lensId: string, findingId: string, status: FindingStatus, reason: string): Promise<void>;
  registerWorker(analysisKeyId: string): Promise<WorkerCreated>;
  setWorkerBillingKey(workerId: string, analysisKeyId: string): Promise<void>;
  revokeWorker(workerId: string): Promise<void>;
  generateAnalysisKey(request: AnalysisKeyRequest): Promise<{ token_id?: string }>;
  deleteKeys(keys: readonly string[]): Promise<void>;
}

type LensClient = Client<paths>;

async function required<T>(request: Promise<{ data?: unknown }>): Promise<T> {
  const { data } = await request;
  if (data === undefined) throw new Error("The proxy returned an empty response");
  return data as T;
}

async function sent(request: Promise<unknown>): Promise<void> {
  await request;
}

export function liveLensApi(client: LensClient, apiClient: ApiClient, accessToken: string): LensApi {
  const headers = { [getAuthHeaderName()]: `Bearer ${accessToken}` };
  const lens = (lens_id: string) => ({ headers, params: { path: { lens_id } } });
  const worker = (worker_id: string) => ({ headers, params: { path: { worker_id } } });
  type OpenApiCall = (path: string, init?: object) => Promise<{ data?: unknown }>;
  const http = client as unknown as {
    GET: OpenApiCall;
    POST: OpenApiCall;
    PUT: OpenApiCall;
    PATCH: OpenApiCall;
    DELETE: OpenApiCall;
  };
  return {
    scope: accessToken,
    datasets: liveDatasetsApi(client, apiClient, accessToken),
    lenses: () => required(http.GET("/lens", { headers })),
    activity: () => required(http.GET("/lens/activity/available", { headers })),
    runs: (lensId, offset) =>
      required(
        http.GET("/lens/{lens_id}/runs", { headers, params: { path: { lens_id: lensId }, query: { offset } } }),
      ),
    run: (lensId, jobId) =>
      required(
        http.GET("/lens/{lens_id}/runs/{job_id}", {
          headers,
          params: { path: { lens_id: lensId, job_id: jobId } },
        }),
      ),
    reviews: (lensId, jobId, after) =>
      required(
        http.GET("/lens/{lens_id}/runs/{job_id}/reviews", {
          headers,
          params: { path: { lens_id: lensId, job_id: jobId }, query: { after } },
        }),
      ),
    execution: (lensId, executionId, offset) =>
      required(
        http.GET("/lens/{lens_id}/executions/{execution_id}", {
          headers,
          params: { path: { lens_id: lensId, execution_id: executionId }, query: { offset } },
        }),
      ),
    sample: (selection, offset, asOf) =>
      required(
        http.POST("/lens/preview/sample", {
          headers,
          body: {
            offset,
            as_of: asOf,
            selection: {
              source: selection.source,
              service: selection.service ?? "",
              agent_name: selection.agent_name ?? "",
              filters: selection.filters ?? [],
              sample_size: selection.sample_size,
              sample_percent: selection.sample_percent ?? 100,
              team_id: selection.team_id ?? "",
              execution_ids: [],
            },
            lookback_hours: selection.lookback_hours ?? 24,
          },
        }),
      ),
    agents: () => required(http.GET("/lens/agents", { headers })),
    models: () => apiClient.get("/models", { accessToken }),
    modelDetails: () => apiClient.get("/model_group/info", { accessToken }),
    keys: async (alias, page, signal) =>
      keyPageSchema.parse(
        await apiClient.get("/key/list", {
          accessToken,
          signal,
          query: {
            page: String(page),
            size: "25",
            return_full_object: "true",
            key_alias: alias || undefined,
            substring_matching: "true",
            include_team_keys: "true",
            include_created_by_keys: "true",
            status: "active",
          },
        }),
      ),
    keyInfo: async (keyId) =>
      keyInfoSchema.parse(await apiClient.get("/key/info", { accessToken, query: { key: keyId } })).info,
    saveLens: (id, settings) =>
      required(
        id
          ? http.PUT("/lens/{lens_id}", { ...lens(id), body: settings })
          : http.POST("/lens", { headers, body: settings }),
      ),
    startRun: (lensId, request = {}) => sent(http.POST("/lens/{lens_id}/runs", { ...lens(lensId), body: request })),
    watchAll: () => required(http.POST("/lens/watch-all", { headers })),
    signalConfig: () => required(http.GET("/lens/signals", { headers })),
    saveSignalConfig: (config) => required(http.PUT("/lens/signals", { headers, body: config })),
    cancelRun: (lensId) => sent(http.POST("/lens/{lens_id}/cancel", lens(lensId))),
    reviewFinding: (lensId, findingId, status, reason) =>
      sent(
        http.PATCH("/lens/{lens_id}/findings/{finding_id}", {
          headers,
          params: { path: { lens_id: lensId, finding_id: findingId } },
          body: { status, reason },
        }),
      ),
    registerWorker: (analysisKeyId) =>
      required(
        http.POST("/lens/workers/register", {
          headers,
          body: { name: "Lens worker", analysis_key_id: analysisKeyId, managed: true },
        }),
      ),
    setWorkerBillingKey: (workerId, analysisKeyId) =>
      sent(
        http.PUT("/lens/workers/{worker_id}/billing-key", {
          ...worker(workerId),
          body: { analysis_key_id: analysisKeyId },
        }),
      ),
    revokeWorker: (workerId) => sent(http.DELETE("/lens/workers/{worker_id}", worker(workerId))),
    generateAnalysisKey: (request) =>
      apiClient.post<{ token_id?: string }>("/key/generate", {
        accessToken,
        body: {
          key_alias: "Lens analysis",
          models: [request.model],
          max_budget: request.budget,
          budget_duration: "1mo",
          metadata: { purpose: "lens" },
        },
      }),
    deleteKeys: (keys) => apiClient.post("/key/delete", { accessToken, body: { keys } }),
  };
}
