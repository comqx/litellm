"use client";

import { ArrowRight, ArrowUpRight, Check, Copy, KeyRound, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/http/schema";
import { createApiClient, type RequestOptions } from "@/lib/http/client";
import { useTimeout } from "usehooks-ts";

import { cn } from "@/lib/cva.config";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyToClipboard } from "@/utils/dataUtils";

import anthropicLogo from "../../../../../public/assets/logos/anthropic.svg";
import openaiLogo from "../../../../../public/assets/logos/openai_small.svg";
import otelLogo from "../../../../../public/assets/logos/opentelemetry.svg";
import { agentTraceCall, apiClient, getProxyBaseUrl } from "../../../networking";
import { ActiveDot } from "../../traces/ui/ActiveDot";
import { sampleTraceExport } from "./sampleTrace";
import { FRAMEWORKS, frameworkSnippet, type FrameworkGuide } from "./tracingSetupGuides";
import type { TraceSummary } from "../../traces/types";

const COPIED_RESET_MS = 1500;
const DOCS_URL = "https://docs.litellm.ai/docs/proxy/lens";
const DEPLOYMENT_URL = `${DOCS_URL}/deployment`;
const EXAMPLE_MODEL = "openai/gpt-6.1-sol";
const SAMPLE_TRACE_POLL_MS = 1000;
export const TRACING_KEY_REQUEST = { name: "Agent tracing" } as const;
const SAMPLE_TRACE_POLL_ATTEMPTS = 15;

type Installer = "pip" | "uv";
type CodingAgent = "Claude Code" | "Codex";

const PY_INSTALL: Record<Installer, (packages: string) => string> = {
  pip: (packages) => `pip install ${packages}`,
  uv: (packages) => `uv add ${packages}`,
};

export const tracingEnvSnippet = (proxyUrl: string, tracingKey: string | null = null): string =>
  [
    `export LITELLM_TRACING_KEY="${tracingKey ?? "<your tracing key>"}"`,
    `export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="${proxyUrl}/v1/traces"`,
    `export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer $LITELLM_TRACING_KEY"`,
    'export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"',
    'export OTEL_METRICS_EXPORTER="none"',
    'export OTEL_LOGS_EXPORTER="none"',
  ].join("\n");

export const codingAgentPrompt = (proxyUrl: string, traceUrl: string, guide: FrameworkGuide, model: string): string =>
  [
    `Send this ${guide.label} project's OpenTelemetry traces to LiteLLM.`,
    "Keep the existing model configuration, authentication, and application behavior. Never hardcode keys. Read the model key from LITELLM_API_KEY and the dedicated tracing key from LITELLM_TRACING_KEY.",
    "Set the trace destination wherever this project loads environment variables:",
    tracingEnvSnippet(traceUrl),
    guide.install ?? `Install and enable the ${guide.plugin?.label}: ${guide.plugin?.url}`,
    guide.plugin?.instruction ??
      "Initialize OpenTelemetry before creating the agent. If the app already configures a tracer provider, keep it and point its exporter at the destination above instead.",
    "Adapt this example to the existing application, replacing research_agent with the agent's name:",
    frameworkSnippet(guide, proxyUrl, model, traceUrl),
    guide.note ?? "",
    "运行 the agent once and confirm its named run appears in Lens > 追踪.",
  ]
    .filter(Boolean)
    .join("\n\n");

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;

export const codingAgentCommand = (agent: CodingAgent, prompt: string): string =>
  `${agent === "Claude Code" ? "claude" : "codex"} ${shellQuote(prompt)}`;

export const maskSecret = (secret: string): string =>
  secret.length > 10 ? `${secret.slice(0, 5)}${"•".repeat(16)}${secret.slice(-4)}` : "•".repeat(secret.length);

export const otlpEndpoints = (proxyUrl: string): readonly (readonly [string, string, boolean])[] => [
  ["追踪端点", `${proxyUrl}/v1/traces`, true],
  ["认证头", "Authorization: Bearer <Lens 追踪密钥>", true],
  ["协议", "OTLP/HTTP（protobuf 或 JSON）", false],
];

function CodeBlock({
  code,
  display = code,
  tabs,
  wrap = false,
  copyLabel = "复制",
}: {
  code: string;
  display?: string;
  tabs?: React.ReactNode;
  wrap?: boolean;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  useTimeout(() => setCopied(false), copied ? COPIED_RESET_MS : null);
  const copy = async () => setCopied(await copyToClipboard(code));
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/30">
      <div className="flex h-9 items-center border-b border-border px-3">
        {tabs}
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copyLabel}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <pre
        className={cn(
          "m-0 px-4 py-3 font-mono text-xs leading-5 text-foreground",
          wrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto",
        )}
      >
        <code>{display}</code>
      </pre>
    </div>
  );
}

function FileLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-foreground">{children}</span>;
}

function LineTabs<T extends string>({
  value,
  options,
  onChange,
  logos,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  logos?: Partial<Record<T, string>>;
}) {
  return (
    <div role="tablist" className="flex h-9 items-end gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "-mb-px inline-flex h-9 items-center gap-1.5 border-b-2 text-xs",
            value === option
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {logos?.[option] && <img src={logos[option]} alt="" className="size-3.5" />}
          {option}
        </button>
      ))}
    </div>
  );
}

function Step({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "waiting" }
  | { kind: "ready"; trace: TraceSummary }
  | { kind: "failed"; message: string };

const SEND_LABEL: Record<Exclude<SendState["kind"], "ready">, string> = {
  idle: "发送测试追踪",
  sending: "发送中…",
  waiting: "等待追踪到达…",
  failed: "发送测试追踪",
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function waitForTrace(accessToken: string, traceId: string): Promise<TraceSummary | null> {
  for (let attempt = 0; attempt < SAMPLE_TRACE_POLL_ATTEMPTS; attempt++) {
    try {
      return (await agentTraceCall(accessToken, traceId)).summary;
    } catch {
      await delay(SAMPLE_TRACE_POLL_MS);
    }
  }
  return null;
}

function SendTestTrace({
  accessToken,
  traceUrl,
  tracingKey,
  onOpenTrace,
}: {
  accessToken: string;
  traceUrl: string;
  tracingKey: string | null;
  onOpenTrace: (trace: TraceSummary) => void;
}) {
  const [state, setState] = useState<SendState>({ kind: "idle" });
  const send = async () => {
    setState({ kind: "sending" });
    const sample = sampleTraceExport(Date.now());
    try {
      if (!tracingKey) throw new Error("请先生成追踪密钥");
      const client = createApiClient({ getBaseUrl: () => traceUrl });
      const options: RequestOptions = {
        credentials: "omit",
        redirect: "error",
        accessToken: tracingKey,
        body: sample.body,
        signal: AbortSignal.timeout(15000),
      };
      await client.post("/v1/traces", options);
    } catch {
      setState({ kind: "failed", message: "无法发送测试追踪。" });
      return;
    }
    setState({ kind: "waiting" });
    const trace = await waitForTrace(accessToken, sample.traceId);
    setState(
      trace
        ? { kind: "ready", trace }
        : { kind: "failed", message: "已发送，但尚未在 Lens 中显示。请稍后再试。" },
    );
  };
  if (state.kind === "ready") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span role="status" className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
          <Check aria-hidden="true" className="size-4" /> 已收到测试追踪
        </span>
        <Button onClick={() => onOpenTrace(state.trace)}>
          查看追踪 <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    );
  }
  const busy = state.kind === "sending" || state.kind === "waiting";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => void send()} disabled={busy || !tracingKey || !traceUrl}>
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="size-4" />
        )}
        {SEND_LABEL[state.kind]}
      </Button>
      {state.kind === "failed" && <p className="text-sm text-destructive">{state.message}</p>}
    </div>
  );
}

function TraceReceipt({
  connected,
  checked,
  checking,
  onCheck,
}: {
  connected: boolean;
  checked: boolean;
  checking: boolean;
  onCheck: () => void;
}) {
  const missingAfterCheck = checked && !checking && !connected;
  return (
    <section className="mt-6 border-t pt-6" aria-label="追踪连接状态">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p role="status" className="text-sm font-medium">
            {connected ? "追踪已连接" : "等待首条追踪"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">运行一次智能体后，追踪会显示在这里。</p>
        </div>
        <Button variant="outline" onClick={onCheck} disabled={checking}>
          {checking && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {checking ? "检查中…" : "检查追踪"}
        </Button>
      </div>
      {missingAfterCheck && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          尚未收到追踪。请检查智能体环境变量中的 Lens 地址与追踪密钥，并查看导出相关日志是否有错误。
        </p>
      )}
    </section>
  );
}

function TracingKey({
  accessToken,
  tracingKey,
  onCreated,
}: {
  accessToken: string;
  tracingKey: string | null;
  onCreated: (key: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [pendingActivation, setPendingActivation] = useState(false);
  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const result = await apiClient.post<{ key?: string; active?: boolean }>("/lens/tracing/keys", {
        accessToken,
        body: TRACING_KEY_REQUEST,
      });
      if (!result.key) throw new Error("代理未返回新密钥");
      setPendingActivation(!result.active);
      onCreated(result.key);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法创建密钥");
    } finally {
      setCreating(false);
    }
  };
  if (tracingKey) {
    return (
      <div className="space-y-2">
        {pendingActivation && (
          <p role="status" className="text-sm text-muted-foreground">
            密钥已保存。Lens 尚未确认。服务连接后，密钥会在 30 秒内同步。
          </p>
        )}
        <CodeBlock code={tracingKey} display={maskSecret(tracingKey)} tabs={<FileLabel>你的追踪密钥</FileLabel>} />
        <p className="text-sm text-muted-foreground">
          为安全起见已隐藏显示。复制可得到完整密钥，下方环境变量步骤也会包含该密钥。此密钥仅用于发送追踪与检查投递；模型调用仍需智能体自己的密钥。离开页面前请妥善保存。
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => void create()} disabled={creating}>
        {creating ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <KeyRound aria-hidden="true" className="size-4" />
        )}
        生成追踪密钥
      </Button>
      <span className="text-sm text-muted-foreground">请使用专用的 Lens 密钥进行追踪。</span>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function EndpointValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useTimeout(() => setCopied(false), copied ? COPIED_RESET_MS : null);
  const copy = async () => setCopied(await copyToClipboard(value));
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`复制 ${value}`}
      className="group inline-flex min-w-0 items-center gap-2 text-left font-mono text-xs text-foreground"
    >
      <span className="break-all">{value}</span>
      {copied ? (
        <Check aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  );
}

function Endpoints({ proxyUrl, children }: { proxyUrl: string; children?: React.ReactNode }) {
  return (
    <section className="mt-6" aria-labelledby="otel-endpoints">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="otel-endpoints" className="inline-flex items-center gap-2 text-sm font-medium">
          <img src={otelLogo.src} alt="" className="size-5" />
          连接详情
        </h3>
        {children}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 rounded-md border bg-muted/30 p-4 md:grid-cols-2">
        {otlpEndpoints(proxyUrl).map(([label, value, copyable]) => (
          <div key={label} className={cn("min-w-0", label === "追踪端点" && "md:col-span-2")}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5">
              {copyable ? <EndpointValue value={value} /> : <span className="text-xs">{value}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const CODING_AGENT_LOGOS: Record<CodingAgent, string> = {
  "Claude Code": anthropicLogo.src,
  Codex: openaiLogo.src,
};

function setupTitle(enabled: boolean, connected: boolean) {
  if (!enabled) return "设置 Lens";
  return connected ? "连接其他智能体" : "连接你的智能体";
}

interface ConnectAgentProps {
  accessToken: string;
  onOpenTrace: (trace: TraceSummary) => void;
  connected: boolean;
  checked: boolean;
  checking: boolean;
  onCheck: () => void;
  readOnly: boolean;
  canMintTracingKey: boolean;
  framework: string;
  setFramework: (framework: string) => void;
  installer: Installer;
  setInstaller: (installer: Installer) => void;
  tracingKey: string | null;
  setTracingKey: (key: string) => void;
}

export function useLensService(accessToken: string) {
  return useQuery({
    queryKey: ["lens-service", accessToken],
    queryFn: () => apiClient.get<components["schemas"]["ServiceConnection"]>("/lens/service", { accessToken }),
    refetchInterval: 15000,
  });
}

function EnableTracing({
  connection,
  checking,
  onCheck,
}: {
  connection: components["schemas"]["ServiceConnection"];
  checking: boolean;
  onCheck: () => void;
}) {
  const configured = connection.configured ?? connection.connected;
  let message = "Lens 已连接。请设置对外追踪地址，以便智能体知道将追踪发往何处。";
  if (!configured) {
    message = "在现有 Helm 或 Docker 部署中启用 Lens。它与 LiteLLM 并行运行并存储追踪数据。";
  } else if (!connection.connected) {
    message =
      "Lens 已配置，但 LiteLLM 无法连接。请确认 Lens 服务正在运行，且双方使用相同的服务密钥。";
  } else if (!connection.status.storage_ready) {
    message = "Lens 已连接，但追踪存储不可用。请检查 ClickHouse 连接。";
  }
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{configured ? "检查 Lens 连接" : "安装 Lens"}</p>
      <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      {!configured && (
        <p className="text-sm text-muted-foreground">
          {connection.release ? (
            <>
              请使用 Lens <code>{connection.release}</code> 以匹配当前 LiteLLM 部署。
            </>
          ) : (
            "请使用与当前 LiteLLM 部署相同版本的 Lens。"
          )}{" "}
          部署会连接各服务并提供追踪存储。
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <a
          className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
          href={`${DEPLOYMENT_URL}#using-helm`}
          target="_blank"
          rel="noreferrer"
        >
          Helm 设置 <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
        <a
          className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
          href={`${DEPLOYMENT_URL}#using-docker`}
          target="_blank"
          rel="noreferrer"
        >
          Docker 设置 <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
      <Button variant="outline" onClick={onCheck} disabled={checking}>
        {checking && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {checking ? "检查中…" : "检查设置"}
      </Button>
    </div>
  );
}

function CodingAgentSetup({
  proxyUrl,
  traceUrl,
  guide,
  model,
}: {
  proxyUrl: string;
  traceUrl: string;
  guide: FrameworkGuide;
  model: string;
}) {
  const [codingAgent, setCodingAgent] = useState<CodingAgent>("Claude Code");
  const [copied, setCopied] = useState<string | null>(null);
  const command = codingAgentCommand(codingAgent, codingAgentPrompt(proxyUrl, traceUrl, guide, model));
  useTimeout(() => setCopied(null), copied === null ? null : COPIED_RESET_MS);
  const copy = async () => {
    if (await copyToClipboard(command)) setCopied(command);
  };
  return (
    <section className="mt-6" aria-labelledby="connect-project">
      <h3 id="connect-project" className="text-sm font-medium">
        连接你的项目
      </h3>
      <div className="mt-3 overflow-hidden rounded-md border">
        <div className="border-b bg-muted/30 px-4">
          <LineTabs
            value={codingAgent}
            options={["Claude Code", "Codex"]}
            onChange={(value) => {
              setCodingAgent(value);
              setCopied(null);
            }}
            logos={CODING_AGENT_LOGOS}
          />
        </div>
        <div className="p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            在智能体项目目录中运行以下设置命令。追踪使用 <code className="text-xs">LITELLM_TRACING_KEY</code>
            ，模型密钥保持独立。
          </p>
          <Button className="mt-3" onClick={() => void copy()}>
            {copied === command ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied === command ? "已复制" : "复制设置命令"}
          </Button>
          <details className="mt-3">
            <summary className="w-fit cursor-pointer text-xs text-muted-foreground">查看命令</summary>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-5">
              <code>{command}</code>
            </pre>
          </details>
        </div>
      </div>
    </section>
  );
}

function ConnectAgent({
  accessToken,
  onOpenTrace,
  connected,
  checked,
  checking,
  onCheck,
  readOnly,
  canMintTracingKey,
  framework,
  setFramework,
  installer,
  setInstaller,
  tracingKey,
  setTracingKey,
}: ConnectAgentProps) {
  const proxyUrl = getProxyBaseUrl().replace(/\/$/, "");
  const connection = useLensService(accessToken);
  const traceUrl = connection.data?.url ?? "";
  const guide = FRAMEWORKS.find((f) => f.id === framework) ?? FRAMEWORKS[0];
  const install = guide.install?.startsWith("pip install ")
    ? PY_INSTALL[installer](guide.install.slice("pip install ".length))
    : guide.install;
  const model = EXAMPLE_MODEL;
  const quickstart = frameworkSnippet(guide, proxyUrl, model, traceUrl);
  if (!traceUrl)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {connection.isPending
          ? "正在检查 Lens 连接…"
          : "请在 LiteLLM 上设置 LITELLM_LENS_PUBLIC_URL 为智能体可访问的 Lens 地址，然后重启 LiteLLM。"}
      </p>
    );
  return (
    <>
      {!connection.data?.connected && (
        <p role="alert" className="text-sm text-destructive">
          Lens 服务不可用。请检查服务 URL 与共享密钥。
        </p>
      )}
      {connection.data?.connected && !connection.data.status.storage_ready && (
        <p role="alert" className="text-sm text-destructive">
          Lens 已连接，但 ClickHouse 不可用。
        </p>
      )}
      <div className="mt-6 space-y-2">
        <label id="tracing-framework" className="block text-sm font-medium">
          智能体框架
        </label>
        <Select
          value={framework}
          onValueChange={(value) => {
            if (value) setFramework(value);
          }}
        >
          <SelectTrigger aria-labelledby="tracing-framework" className="w-full">
            <SelectValue>
              <img src={guide.logo} alt="" className="size-4 shrink-0 object-contain" />
              {guide.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FRAMEWORKS.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <img src={f.logo} alt="" className="size-4 shrink-0 object-contain" />
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Step title="创建追踪密钥">
        {canMintTracingKey && !readOnly ? (
          <TracingKey accessToken={accessToken} tracingKey={tracingKey} onCreated={setTracingKey} />
        ) : (
          <p className="text-sm text-muted-foreground">请向代理管理员索取专用的 Lens 追踪密钥。</p>
        )}
      </Step>
      <div className="mt-6 border-t pt-6">
        {install && (
          <Step title="安装依赖">
            <CodeBlock
              code={install}
              wrap
              tabs={
                guide.language === "typescript" ? (
                  <FileLabel>npm</FileLabel>
                ) : (
                  <LineTabs value={installer} options={["pip", "uv"]} onChange={setInstaller} />
                )
              }
            />
          </Step>
        )}
        {guide.plugin && (
          <Step title="启用插件">
            <p className="text-sm leading-6 text-muted-foreground">
              安装并启用{" "}
              <a className="underline underline-offset-4" href={guide.plugin.url} target="_blank" rel="noreferrer">
                {guide.plugin.label}
              </a>
              。{guide.plugin.instruction}
            </p>
          </Step>
        )}
        <Step title="配置环境">
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            {tracingKey ? (
              <>
                追踪使用上方密钥。请将 <code>LITELLM_API_KEY</code> 设为具备模型访问权限的密钥。
              </>
            ) : (
              <>
                将 <code>LITELLM_TRACING_KEY</code> 设为 Lens 追踪密钥，<code>LITELLM_API_KEY</code> 仍用于模型调用。
              </>
            )}
          </p>
          <CodeBlock
            copyLabel="复制追踪配置"
            code={tracingEnvSnippet(traceUrl, tracingKey)}
            display={tracingEnvSnippet(traceUrl, tracingKey && maskSecret(tracingKey))}
            tabs={<FileLabel>Shell</FileLabel>}
            wrap
          />
        </Step>
        <Step title="运行智能体">
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            {guide.existingModel ? "保留现有模型配置。" : "保存并运行以下示例。"}
            将 <code>research_agent</code> 替换为你的智能体名称。
            {!guide.existingModel && " 请使用本代理上已配置的模型。"}
          </p>
          <CodeBlock code={quickstart} tabs={<FileLabel>{guide.fileName}</FileLabel>} wrap />
          {guide.note && <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.note}</p>}
          {!guide.existingModel && (
            <div className="mt-3">
              <CodeBlock
                code={guide.language === "typescript" ? "npx tsx agent.mts" : "python agent.py"}
                tabs={<FileLabel>Shell</FileLabel>}
              />
            </div>
          )}
          <a
            href={`${DOCS_URL}/first-trace?framework=${guide.id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            在文档中查看 <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </Step>
      </div>
      <CodingAgentSetup proxyUrl={proxyUrl} traceUrl={traceUrl} guide={guide} model={model} />
      <Endpoints proxyUrl={traceUrl}>
        {!readOnly && (
          <SendTestTrace
            accessToken={accessToken}
            traceUrl={traceUrl}
            tracingKey={tracingKey}
            onOpenTrace={onOpenTrace}
          />
        )}
      </Endpoints>
      <TraceReceipt connected={connected} checked={checked} checking={checking} onCheck={onCheck} />
    </>
  );
}

type TracingSetupProps = {
  detail: string | null;
  accessToken: string;
  onOpenTrace: (trace: TraceSummary) => void;
  connected?: boolean;
  onCheck?: () => void;
  checking?: boolean;
  readOnly?: boolean;
  canMintTracingKey?: boolean;
};

export function TracingSetupFields({
  accessToken,
  onOpenTrace,
  connected = false,
  onCheck,
  checking = false,
  readOnly = false,
  canMintTracingKey = false,
}: TracingSetupProps) {
  const [framework, setFramework] = useState(FRAMEWORKS[0].id);
  const [installer, setInstaller] = useState<Installer>("pip");
  const [tracingKey, setTracingKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const connection = useLensService(accessToken);
  const check = () => {
    setChecked(true);
    void connection.refetch();
    onCheck?.();
  };
  if (connection.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        正在检查 Lens 连接…
      </p>
    );
  if (!connection.data)
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-muted-foreground">
          无法检查 Lens 连接。
        </p>
        <Button variant="outline" onClick={check}>
          重试
        </Button>
      </div>
    );
  if (!connection.data.connected || !connection.data.status.storage_ready || !connection.data.url)
    return <EnableTracing connection={connection.data} checking={checking || connection.isFetching} onCheck={check} />;
  return (
    <ConnectAgent
      framework={framework}
      setFramework={setFramework}
      installer={installer}
      setInstaller={setInstaller}
      tracingKey={tracingKey}
      setTracingKey={setTracingKey}
      accessToken={accessToken}
      onOpenTrace={onOpenTrace}
      connected={connected}
      checked={checked}
      checking={checking || connection.isFetching}
      onCheck={check}
      readOnly={readOnly}
      canMintTracingKey={canMintTracingKey}
    />
  );
}

export function TracingSetupCard(props: TracingSetupProps) {
  const connection = useLensService(props.accessToken);
  const enabled = Boolean(connection.data?.connected && connection.data.status.storage_ready && connection.data.url);

  return (
    <div className="w-full max-w-3xl pb-8" data-testid="tracing-setup-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{setupTitle(enabled, props.connected ?? false)}</h2>
        <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {enabled ? (
            <ActiveDot />
          ) : (
            <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />
          )}
          {enabled ? "追踪已启用" : "需要完成设置"}
        </span>
        <a
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm underline underline-offset-4"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
        >
          文档 <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {enabled
          ? "将智能体运行发送到 LiteLLM，即可查看输入、输出与工具调用。"
          : "连接 Lens 以开始记录智能体运行。"}
      </p>
      <TracingSetupFields {...props} />
    </div>
  );
}
