export type Priority = "high" | "medium" | "low";
export type FindingKind = "issue" | "pattern";
export type ActivitySource = "traces" | "requests" | "both";
export type StepKind = "model" | "stage" | "error";
export type ActivityPhase = "load" | "review" | "group" | "reconcile" | "investigate";
export type ToolName =
  | "model"
  | "read"
  | "search"
  | "python"
  | "catalog"
  | "review_catalog"
  | "read_reviews"
  | "search_reviews"
  | "history"
  | "checkpoint";

export interface IssueBrief {
  problem: string;
  user_goal: string;
  what_happened: string;
  test_cases: { input: string; expected: string }[];
}

export interface FindingEvidence {
  execution_id: string;
  span_id: string;
  quote: string;
  role: "support" | "counterexample";
}

export interface Finding {
  id: string;
  check_id: string;
  check_ids: string[];
  investigation_runs: unknown[];
  merged_finding_ids: string[];
  title: string;
  description: string;
  suggestion: string;
  kind: FindingKind;
  priority?: Priority;
  status: string;
  reason: string;
  revision: number;
  first_seen: string;
  last_seen: string;
  limitation: string;
  occurrences: string[];
  evidence: FindingEvidence[];
  brief?: IssueBrief;
}

export interface Reservation {
  month: string;
  amount: number;
  expires_at?: string;
}

export interface Check {
  id: string;
  instruction: string;
  enabled: boolean;
}

export interface ActivityFilter {
  key: string;
  value: string;
}

export interface Settings {
  name: string;
  agent_name: string;
  context: string;
  checks: Check[];
  source: ActivitySource;
  service: string;
  filters?: ActivityFilter[];
  team_id: string;
  execution_ids: string[];
  lookback_hours: number;
  sample_size: number | null;
  sample_percent: number;
  concurrency: number;
  monthly_budget: number;
  interval_minutes: number;
  enabled: boolean;
  model: string;
}

export interface ExecutionMetadata {
  key: string;
  value?: string;
}

export interface SampleExecution {
  id: string;
  trace_ref: string;
  metadata: ExecutionMetadata[];
  root_seen: boolean;
  service: string;
  source: ActivitySource;
  trace_id: string;
  team_id: string;
  name: string;
  start_time: string;
  span_count: number;
}

export interface Assessment {
  execution_id: string;
  cannot_assess: boolean;
  issue_checks: string[];
  pattern_checks: string[];
}

export interface ReviewVerdict {
  check_id: string;
  kind: FindingKind;
  summary: string;
}

export interface Review {
  execution_id: string;
  trace_id: string;
  name: string;
  agent: string;
  model: string;
  at: string;
  duration_ms: number;
  content_version: string;
  reused: boolean;
  consolidated: boolean;
  partial: boolean;
  cannot_assess: boolean;
  reasoning: string;
  spans: unknown[];
  tool_calls: ToolCount[];
  verdicts: ReviewVerdict[];
}

export interface Coverage {
  eligible: number;
  selected: number;
  screened: number;
  investigated: number;
  inconclusive: number;
  grouping_batches: number;
  grouped_batches: number;
  candidates: number;
  partial: number;
  unassessable: number;
  failed_tasks: number;
  reused: number;
  reusable: number;
}

export interface Sample {
  eligible: number;
  selected: number;
  executions: SampleExecution[];
  next_offset?: number | null;
}

export interface Step {
  at: string;
  kind: StepKind;
  label: string;
  model?: string;
  purpose?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
}

export interface InFlight {
  execution_id: string;
  agent: string;
  trace_id: string;
  started_at: string;
}

export interface ToolCount {
  name: ToolName;
  calls: number;
}

export interface Activity {
  id: string;
  phase: ActivityPhase;
  label: string;
  started_at: string;
  finished?: boolean;
  execution_ids: string[];
  operations?: ToolName[];
  tool_calls?: ToolCount[];
}

export interface Job {
  id: string;
  findings?: Finding[];
  settings: Settings;
  revision: number;
  review_versions: unknown[];
  assessments: Assessment[];
  attempts: number;
  steps: Step[];
  reviews: Review[];
  reviewed: number;
  reading?: InFlight[];
  activities?: Activity[];
  trigger: string;
  error: string;
  cost: number;
  coverage: Coverage;
  status: string;
  stage: string;
  created_at: string;
  finished_at: string;
  start: string;
  end: string;
  sample?: Sample;
  worker_id?: string;
}

export interface LensScope {
  all_teams: boolean;
  api_key_hash: string;
  team_id: string;
}

export interface Lens {
  id: string;
  version: number;
  reservations: Reservation[];
  last_scan_at?: string;
  revision: number;
  spent: number;
  scope: LensScope;
  settings: Settings;
  created_at: string;
  next_run_at: string;
  budget_month: string;
  findings: Finding[];
  jobs: Job[];
}

export interface Worker {
  id: string;
  name: string;
  last_seen: string;
  scope: LensScope;
  revoked: boolean;
  analysis_key_id: string | null;
}

export interface WorkerCreated {
  token: string;
  image: string;
  worker: Worker;
}

export interface LensList {
  lenses: Lens[];
  workers: Worker[];
  tracing_enabled: boolean;
}

export interface Signal {
  id: string;
  name: string;
  question: string;
}

export interface SignalConfig {
  model?: string;
  threshold?: number;
  signals?: Signal[];
}
