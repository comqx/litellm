export interface DatasetToolCall {
  name: string;
  arguments: string;
}

export interface DatasetMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name: string;
  tool_calls: DatasetToolCall[];
}

export interface CaseSource {
  trace_id: string;
  trace_ref: string;
  span_id: string;
  finding_id: string;
  lens_id: string;
}

export interface DatasetCase {
  id: string;
  messages: DatasetMessage[];
  reply: string;
  tool_calls: DatasetToolCall[];
  expected: string;
  included: boolean;
  source: CaseSource;
  agent_version: string;
}

export interface Dataset {
  id: string;
  name: string;
  agent_name: string;
  team_id: string;
  created_at: string;
  revision: number;
  created_by: string;
  cases: DatasetCase[];
}

export interface DatasetSummary {
  id: string;
  name: string;
  agent_name: string;
  revision: number;
  case_count: number;
  updated_at: string;
}

export interface DatasetCreate {
  name: string;
  agent_name?: string;
}

export type BuildSource =
  | { kind: "text"; text: string }
  | { kind: "finding"; finding_ids: string[]; lens_id: string }
  | { kind: "trace"; trace_id: string; trace_ref?: string; span_id?: string };

export interface BuildRequest {
  sources: BuildSource[];
  dataset_id?: string;
}

export type SkipReason = "duplicate" | "no_content" | "too_large" | "over_limit" | "invalid";

export interface SkippedCase {
  source: CaseSource;
  reason: SkipReason;
}

export interface BuildResult {
  cases: DatasetCase[];
  skipped: SkippedCase[];
}

export interface RevisionSave {
  base_revision: number;
  cases: DatasetCase[];
}

export interface EvalCases {
  dataset_id: string;
  revision: number;
  cases: DatasetCase[];
}
