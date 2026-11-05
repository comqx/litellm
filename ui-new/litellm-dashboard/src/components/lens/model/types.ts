import type {
  Activity,
  Finding,
  InFlight,
  Job,
  Lens,
  LensList,
  Review,
  ReviewVerdict,
  Sample,
  Settings,
  Signal,
  SignalConfig,
  ToolCount,
  Worker,
  WorkerCreated,
} from "./contract";

export type {
  Activity,
  Finding,
  InFlight,
  Job,
  Lens,
  LensList,
  Review,
  ReviewVerdict,
  Sample,
  Settings,
  Signal,
  SignalConfig,
  ToolCount,
  Worker,
  WorkerCreated,
};

export type IssueBrief = NonNullable<Finding["brief"]>;

export type ActivitySelection = Pick<Settings, "source"> &
  Partial<
    Pick<
      Settings,
      | "service"
      | "agent_name"
      | "filters"
      | "lookback_hours"
      | "sample_percent"
      | "sample_size"
      | "team_id"
      | "execution_ids"
    >
  >;

export interface RunWindow {
  agent_name?: string;
  start?: string;
  end?: string;
  lookback_hours?: number;
}

export interface AnalysisModelInfo {
  model_group: string;
  providers: string[];
  mode?: string | null;
  supported_openai_params?: string[] | null;
}
