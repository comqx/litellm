import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor, within } from "../../../../../../tests/test-utils";
import {
  GuardrailInformation,
  makeBedrockResponse,
  makeEntity,
  makeGuardrailInformation,
} from "@/components/logs/detail/sections/GuardrailViewer/__tests__/fixtures";
import GuardrailViewer from "@/components/logs/detail/sections/GuardrailViewer/GuardrailViewer";

// We will mock child components selectively for some tests to assert prop passthrough,
// but also run an integration-style render without mocks.
const PresidioPath = "@/components/logs/detail/sections/GuardrailViewer/PresidioDetectedEntities";
const BedrockPath = "@/components/logs/detail/sections/GuardrailViewer/BedrockGuardrailDetails";

const skippedPreCall: Partial<GuardrailInformation> = {
  guardrail_status: "not_run",
  guardrail_mode: "pre_call",
  guardrail_response: "no scannable content after message scoping",
  start_time: null,
  end_time: null,
  duration: null,
};

const untimedPreCall: Partial<GuardrailInformation> = {
  guardrail_name: "conduct",
  guardrail_status: "success",
  guardrail_mode: "pre_call",
  start_time: null,
  end_time: null,
  duration: null,
};

const timedPreCall: Partial<GuardrailInformation> = {
  guardrail_name: "timed-pre-rail",
  guardrail_status: "success",
  guardrail_mode: "pre_call",
  start_time: 1_700_000_000,
  end_time: 1_700_000_000.1,
  duration: 0.1,
};

const latePreCall: Partial<GuardrailInformation> = {
  guardrail_name: "late-pre-rail",
  guardrail_status: "success",
  guardrail_mode: "pre_call",
  start_time: 1_700_000_500,
  end_time: 1_700_000_500.1,
  duration: 0.1,
};

const untimedPostCall: Partial<GuardrailInformation> = {
  guardrail_name: "untimed-post-rail",
  guardrail_status: "success",
  guardrail_mode: "post_call",
  start_time: null,
  end_time: null,
  duration: null,
};

const ranPostCall: Partial<GuardrailInformation> = {
  guardrail_name: "ran-rail",
  guardrail_status: "success",
  guardrail_mode: "post_call",
  start_time: 1_700_000_000,
  end_time: 1_700_000_000.25,
  duration: 0.25,
};

describe("GuardrailViewer", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("shows header, status pill, and duration", () => {
    const data = makeGuardrailInformation({ duration: 1.23456, guardrail_status: "success" });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText("护栏与策略合规")).toBeInTheDocument();
    // header shows passed count
    expect(screen.getByText(/1 已通过/)).toBeInTheDocument();
    // The passed badge in the evaluation card
    expect(screen.getByText("通过")).toBeInTheDocument();

    // duration displays in ms format: Math.round(1.23456 * 1000) = 1235
    expect(screen.getByText("1235ms")).toBeInTheDocument();
  });

  it("renders guardrail_flagged as FLAGGED (warning), not FAILED", () => {
    const data = makeGuardrailInformation({
      guardrail_name: "cc-flag",
      guardrail_status: "guardrail_flagged",
      guardrail_provider: "custom_code",
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText(/0 已通过/)).toBeInTheDocument();
    expect(screen.getByText(/1 已标记/)).toBeInTheDocument();
    const badges = screen.getAllByText("已标记");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0]).toHaveClass("text-warning");
    expect(screen.queryByText("失败")).not.toBeInTheDocument();
  });

  it("renders not_run as NOT RUN (muted) and keeps it out of the evaluated and passed counts", async () => {
    const user = userEvent.setup();
    const data = makeGuardrailInformation(skippedPreCall);
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText(/已评估 0 个护栏/)).toBeInTheDocument();
    expect(screen.getByText(/0 已通过/)).toHaveClass("text-muted-foreground");
    expect(screen.getByText(/1 未运行/)).toBeInTheDocument();
    const badge = screen.getByText("未运行");
    expect(badge).toHaveClass("text-muted-foreground");
    expect(screen.queryByText("失败")).not.toBeInTheDocument();
    expect(screen.queryByText(/^T\+/)).not.toBeInTheDocument();

    await user.click(screen.getByText("pii-rail"));
    expect(screen.getByText("no scannable content after message scoping")).toBeInTheDocument();
  });

  it("anchors the lifecycle timeline on timed entries when an untimed not_run entry sorts first", () => {
    const skipped = makeGuardrailInformation({ ...skippedPreCall, guardrail_name: "skipped-rail" });
    const ran = makeGuardrailInformation(ranPostCall);
    renderWithProviders(<GuardrailViewer data={[skipped, ran]} />);

    expect(screen.getByText(/已评估 1 个护栏/)).toBeInTheDocument();
    expect(screen.getByText("请求已接收").parentElement).toHaveTextContent("T+0ms");
    expect(screen.getByText(/调用后护栏：ran-rail/).parentElement).toHaveTextContent("T+250ms");
    expect(screen.getByText("响应已返回").parentElement).toHaveTextContent("T+251ms");
    expect(screen.queryByText(/调用前护栏：skipped-rail/)).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("keeps a guardrail that ran without any timing on the lifecycle", () => {
    renderWithProviders(<GuardrailViewer data={makeGuardrailInformation(untimedPreCall)} />);

    expect(screen.getByText("请求已接收")).toBeInTheDocument();
    expect(screen.getByText(/调用前护栏：conduct/)).toBeInTheDocument();
    expect(screen.getByText("LLM 调用")).toBeInTheDocument();
    expect(screen.getByText("响应已返回")).toBeInTheDocument();
    expect(screen.queryByText(/^T\+/)).not.toBeInTheDocument();
  });

  it("keeps an untimed guardrail ahead of a timed one recorded after it in the same phase", () => {
    const untimed = makeGuardrailInformation(untimedPreCall);
    const timedPre = makeGuardrailInformation(timedPreCall);
    renderWithProviders(<GuardrailViewer data={[untimed, timedPre]} />);

    const rows = screen.getAllByTestId("lifecycle-row");
    const rowIndex = (label: RegExp): number => rows.findIndex((r) => within(r).queryByText(label) !== null);
    const untimedIndex = rowIndex(/调用前护栏：conduct/);
    const timedIndex = rowIndex(/调用前护栏：timed-pre-rail/);

    expect(untimedIndex).toBeGreaterThanOrEqual(0);
    expect(timedIndex).toBeGreaterThanOrEqual(0);
    expect(untimedIndex).toBeLessThan(timedIndex);
  });

  it("orders each phase on its own clock when a later pre-call outlives an earlier post-call", () => {
    const latePre = makeGuardrailInformation(latePreCall);
    const untimedPost = makeGuardrailInformation(untimedPostCall);
    const earlyPost = makeGuardrailInformation(ranPostCall);
    renderWithProviders(<GuardrailViewer data={[latePre, untimedPost, earlyPost]} />);

    const rows = screen.getAllByTestId("lifecycle-row");
    const rowIndex = (label: RegExp): number => rows.findIndex((r) => within(r).queryByText(label) !== null);
    const untimedIndex = rowIndex(/调用后护栏：untimed-post-rail/);
    const earlyIndex = rowIndex(/调用后护栏：ran-rail/);

    expect(untimedIndex).toBeGreaterThanOrEqual(0);
    expect(earlyIndex).toBeGreaterThanOrEqual(0);
    expect(untimedIndex).toBeLessThan(earlyIndex);
  });

  it("anchors offsets on the timed entries and gives the untimed one no fabricated offset", () => {
    const untimed = makeGuardrailInformation(untimedPreCall);
    const ran = makeGuardrailInformation(ranPostCall);
    renderWithProviders(<GuardrailViewer data={[untimed, ran]} />);

    const lifecycleRow = (label: string | RegExp): HTMLElement => {
      const row = screen.getAllByTestId("lifecycle-row").find((r) => within(r).queryByText(label) !== null);
      if (row === undefined) throw new Error(`no lifecycle row labelled ${label}`);
      return row;
    };

    expect(within(lifecycleRow("请求已接收")).getByText("T+0ms")).toBeInTheDocument();
    expect(within(lifecycleRow(/调用后护栏：ran-rail/)).getByText("T+250ms")).toBeInTheDocument();
    expect(within(lifecycleRow("响应已返回")).getByText("T+251ms")).toBeInTheDocument();

    const untimedRow = within(lifecycleRow(/调用前护栏：conduct/));
    expect(untimedRow.getByText("—")).toBeInTheDocument();
    expect(untimedRow.queryByText(/^T\+/)).not.toBeInTheDocument();
  });

  it("calculates and displays masked entity totals", async () => {
    const user = userEvent.setup();
    const data = makeGuardrailInformation({
      masked_entity_count: { EMAIL_ADDRESS: 2, PHONE_NUMBER: 1 },
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    // In collapsed state, the match count badge is visible
    expect(screen.getByText("3 已匹配")).toBeInTheDocument();

    // Expand the evaluation card to see entity details
    await user.click(screen.getByText("pii-rail"));
    // summary chips for each entry inside expanded card
    expect(screen.getByText("EMAIL_ADDRESS: 2")).toBeInTheDocument();
    expect(screen.getByText("PHONE_NUMBER: 1")).toBeInTheDocument();
  });

  it("hides matched badge when count is zero/empty", () => {
    const data = makeGuardrailInformation({ masked_entity_count: {} });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.queryByText(/已匹配/)).not.toBeInTheDocument();
  });

  it("toggles evaluation card open/closed on click", async () => {
    const user = userEvent.setup();
    const data = makeGuardrailInformation({
      masked_entity_count: { EMAIL_ADDRESS: 2 },
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    // Initially collapsed — masked entity details not visible
    expect(screen.queryByText("EMAIL_ADDRESS: 2")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText("pii-rail"));
    expect(screen.getByText("EMAIL_ADDRESS: 2")).toBeInTheDocument();

    // Click again to collapse
    await user.click(screen.getByText("pii-rail"));
    await waitFor(() => {
      expect(screen.queryByText("EMAIL_ADDRESS: 2")).not.toBeInTheDocument();
    });
  });

  it("defaults to presidio provider when guardrail_provider is undefined", async () => {
    vi.doMock(PresidioPath, () => ({
      __esModule: true,
      default: ({ entities }: any) => <div data-testid="presidio-mock">presidio {entities?.length}</div>,
    }));
    const { default: Component } = await import("@/components/logs/detail/sections/GuardrailViewer/GuardrailViewer");

    const data = makeGuardrailInformation({
      guardrail_provider: undefined,
      guardrail_response: [makeEntity(), makeEntity()],
    });
    renderWithProviders(<Component data={data} />);

    // Expand the card to see provider-specific content
    const user = userEvent.setup();
    await user.click(screen.getByText("pii-rail"));
    expect(screen.getByTestId("presidio-mock")).toHaveTextContent("presidio 2");
  });

  it('renders PresidioDetectedEntities when provider="presidio" and response has entities', async () => {
    vi.doMock(PresidioPath, () => ({
      __esModule: true,
      default: ({ entities }: any) => <div data-testid="presidio-mock">count:{entities?.length}</div>,
    }));
    const { default: Component } = await import("@/components/logs/detail/sections/GuardrailViewer/GuardrailViewer");

    const data = makeGuardrailInformation({
      guardrail_provider: "presidio",
      guardrail_response: [makeEntity()],
    });
    renderWithProviders(<Component data={data} />);

    // Expand the card to see provider-specific content
    const user = userEvent.setup();
    await user.click(screen.getByText("pii-rail"));
    expect(screen.getByTestId("presidio-mock")).toHaveTextContent("count:1");
  });

  it('renders BedrockGuardrailDetails when provider="bedrock"', async () => {
    vi.doMock(BedrockPath, () => ({
      __esModule: true,
      default: ({ response }: any) => <div data-testid="bedrock-mock">{response?.action ?? "no-action"}</div>,
    }));
    const { default: Component } = await import("@/components/logs/detail/sections/GuardrailViewer/GuardrailViewer");

    const data = makeGuardrailInformation({
      guardrail_provider: "bedrock",
      guardrail_response: makeBedrockResponse({ action: "GUARDRAIL_INTERVENED" }),
    });
    renderWithProviders(<Component data={data} />);

    // Expand the card to see provider-specific content
    const user = userEvent.setup();
    await user.click(screen.getByText("pii-rail"));
    expect(screen.getByTestId("bedrock-mock")).toHaveTextContent("GUARDRAIL_INTERVENED");
  });

  it("unknown provider renders neither Presidio nor Bedrock details", async () => {
    const user = userEvent.setup();
    const data = makeGuardrailInformation({
      guardrail_provider: "unknown",
    });
    renderWithProviders(<GuardrailViewer data={data} />);
    // Header still present
    expect(screen.getByText("护栏与策略合规")).toBeInTheDocument();

    // Expand the card
    await user.click(screen.getByText("pii-rail"));
    // No Presidio or Bedrock sections
    expect(screen.queryByText(/检测到的实体/)).not.toBeInTheDocument();
    expect(screen.queryByText(/原始 Bedrock 护栏响应/)).not.toBeInTheDocument();
  });

  it("renders without crashing when guardrail_mode is null", () => {
    const data = makeGuardrailInformation({ guardrail_mode: null });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText("护栏与策略合规")).toBeInTheDocument();
    // Null mode should display as dash
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders without crashing when guardrail_mode is an object", () => {
    const data = makeGuardrailInformation({
      guardrail_mode: { default: "pre_call", tags: {} },
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText("护栏与策略合规")).toBeInTheDocument();
    expect(screen.getByText("PRE-CALL")).toBeInTheDocument();
  });

  it("renders without crashing when guardrail_mode is an array and shows in both timeline buckets", () => {
    const data = makeGuardrailInformation({
      guardrail_mode: ["pre_call", "post_call"],
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    expect(screen.getByText("护栏与策略合规")).toBeInTheDocument();
    // Mode badge shows first element formatted
    expect(screen.getByText("PRE-CALL")).toBeInTheDocument();
    // Entry should appear in both pre-call and post-call timeline sections
    expect(screen.getByText(/调用前护栏：/)).toBeInTheDocument();
    expect(screen.getByText(/调用后护栏：/)).toBeInTheDocument();
  });

  it("integration: renders with real Bedrock details without mocks", async () => {
    const user = userEvent.setup();
    const data = makeGuardrailInformation({
      guardrail_provider: "bedrock",
      guardrail_response: makeBedrockResponse({
        action: "NONE",
        outputs: [{ text: "ok" }],
      }),
    });
    renderWithProviders(<GuardrailViewer data={data} />);

    // Expand the card to reveal Bedrock details
    await user.click(screen.getByText("pii-rail"));

    // Bedrock summary bits
    expect(screen.getByText("输出")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
