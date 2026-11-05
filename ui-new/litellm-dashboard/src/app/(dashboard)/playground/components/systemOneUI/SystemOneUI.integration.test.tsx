import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemOneUI from "./SystemOneUI";
import type { SystemOneResponse } from "./lib/schemas";
import type { OpenAIDecisionsResponse } from "./lib/openAIDecisions";
import { curlPayload } from "./lib/curlCommand";

interface ModelGroupInfo {
  model_group: string;
  mode: string;
}

const DECISION_AND_CHAT_MODELS: ModelGroupInfo[] = [
  { model_group: "gpt-5.5", mode: "chat" },
  { model_group: "jev-latest", mode: "evaluation" },
  { model_group: "pplx-decider", mode: "evaluation" },
];

const responseBody: SystemOneResponse = {
  model: "jev-1.13.0",
  answers: {
    department: {
      type: "choice",
      choice: "technical",
      confidence: 0.9,
      probabilities: { technical: 0.9, billing: 0.1 },
    },
  },
};

const render = (ui: ReactElement) =>
  rtlRender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );

const modelGroupInfoResponse = (groups: ModelGroupInfo[]) =>
  ({ ok: true, status: 200, text: async () => JSON.stringify({ data: groups }) }) as Response;

const EXPIRED_KEY_RESPONSE = {
  ok: false,
  status: 401,
  text: async () =>
    JSON.stringify({ error: { message: "Authentication Error - Expired Key.", type: "expired_key", code: "401" } }),
} as Response;

const isModelLookup = (input: RequestInfo | URL) => String(input).endsWith("/model_group/info");

const lookupAuthHeaders = (calls: Parameters<typeof fetch>[]) =>
  calls.map(([, init]) => Object.values((init?.headers ?? {}) as Record<string, string>));

const readCurlPayload = async () => {
  await userEvent.click(screen.getByRole("tab", { name: "cURL" }));
  const payload = curlPayload(screen.getByLabelText("cURL 请求").textContent ?? "");
  await userEvent.click(screen.getByRole("tab", { name: "表单" }));
  return JSON.parse(payload ?? "") as Record<string, unknown>;
};

const selectEndpoint = async (endpoint: "/v1/decisions" | "/v1/systemone") => {
  screen.getByRole("combobox", { name: "决策端点" }).focus();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: endpoint, exact: true }));
};

const selectPreset = async (label: string) => {
  screen.getByRole("combobox", { name: "示例" }).focus();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: label }));
};

const createResponse = (body: SystemOneResponse | OpenAIDecisionsResponse, status = 200, errorText = "") =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (status >= 200 && status < 300 ? JSON.stringify(body) : errorText),
  }) as Response;

describe("SystemOneUI integration", () => {
  const mockFetch = vi.fn<typeof fetch>();
  const mockModelLookup = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    mockFetch.mockReset();
    mockModelLookup.mockReset();
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      isModelLookup(input) ? mockModelLookup(input, init) : mockFetch(input, init),
    );
    mockFetch.mockResolvedValue(createResponse(responseBody));
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    document.cookie = "token=; path=/; max-age=0";
  });

  it("switches between example presets and reads Custom once the request is edited", async () => {
    render(<SystemOneUI accessToken="session-key" />);
    const input = screen.getByRole("textbox", { name: "输入" }) as HTMLTextAreaElement;
    const example = input.value;
    const picker = screen.getByRole("combobox", { name: "示例" });
    expect(picker).toHaveTextContent("Triage a bug report");

    fireEvent.change(input, { target: { value: "Something else" } });
    expect(picker).toHaveTextContent("自定义");
    await selectPreset("Triage a bug report");
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue(example);
    expect(picker).toHaveTextContent("Triage a bug report");

    await selectPreset("Score a sales lead");
    expect(picker).toHaveTextContent("Score a sales lead");
    expect(await readCurlPayload()).toMatchObject({ questions: { fit: { type: "score" } } });
  });

  it("clears the whole request and lets a preset be picked from nothing", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);
    const clear = screen.getByRole("button", { name: "清空" });
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveDisplayValue(/streaming responses/);

    await user.click(clear);
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue("");
    expect(screen.queryAllByRole("group", { name: /问题 / })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
    expect(clear).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "示例" })).toHaveTextContent("自定义");

    await selectPreset("Route a support ticket");
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveDisplayValue(/charged twice/);
    expect(screen.getAllByRole("group", { name: /问题 / })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
  });

  it("keeps the preset label after picking a model and keeps that model when clearing", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    render(<SystemOneUI accessToken="session-key" />);
    const modelPicker = screen.getByRole("combobox", { name: "决策模型" });
    await waitFor(() => expect(modelPicker).toHaveValue("jev-latest"));
    const picker = screen.getByRole("combobox", { name: "示例" });

    await user.clear(modelPicker);
    await user.type(modelPicker, "p");
    await user.click(await screen.findByRole("option", { name: "pplx-decider" }));
    expect(picker).toHaveTextContent("Triage a bug report");
    expect(await readCurlPayload()).toMatchObject({ model: "pplx-decider" });

    await user.click(screen.getByRole("button", { name: "清空" }));
    expect(await readCurlPayload()).toEqual({ model: "pplx-decider", state: "", questions: {} });
    await selectPreset("Score a sales lead");
    expect(await readCurlPayload()).toMatchObject({ model: "pplx-decider", questions: { fit: { type: "score" } } });
  });

  it("offers the same presets on /v1/decisions in the OpenAI shape and clears to an empty input", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);
    await selectEndpoint("/v1/decisions");
    await selectPreset("Moderate a forum comment");
    const payload = await readCurlPayload();
    expect(payload.input).toMatch(/stream=false/);
    expect(payload.questions).toEqual([
      { type: "predicate", name: "breaks_rules", instructions: "Does this comment break the community guidelines?" },
    ]);

    await user.click(screen.getByRole("button", { name: "清空" }));
    expect(await readCurlPayload()).toEqual({ input: "", questions: [] });
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
  });

  it("offers both literal proxy endpoints without TypeSafe or product prefixes", async () => {
    render(<SystemOneUI accessToken="session-key" />);

    expect(screen.getByRole("combobox", { name: "决策端点" })).toHaveTextContent("/v1/systemone");
    screen.getByRole("combobox", { name: "决策端点" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(await screen.findByRole("option", { name: "/v1/decisions", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "/v1/systemone", exact: true })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByText(/TypeSafe/)).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("link", { name: "如何调用 /v1/decisions 与 /v1/systemone" })).toHaveAttribute(
      "href",
      "https://docs.litellm.ai/docs/decisions",
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens on /v1/systemone with the first decision model the key can call", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    render(<SystemOneUI accessToken="session-key" />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("jev-latest"));
    expect(lookupAuthHeaders(mockModelLookup.mock.calls)).toEqual([expect.arrayContaining(["Bearer session-key"])]);
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText("所选选项")).toBeInTheDocument();
    expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/systemone$/);
    expect(mockFetch.mock.calls[0]?.[0]).not.toMatch(/typesafe/);
    expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      model: "jev-latest",
      questions: { has_repro_steps: { type: "noul" } },
    });
  });

  it("sends each endpoint's real shape and switches existing responses between cards and JSON without resending", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    render(<SystemOneUI accessToken="session-key" />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("jev-latest"));
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "An outage" } });

    await selectEndpoint("/v1/decisions");
    expect(screen.getByRole("textbox", { name: "输入" })).not.toHaveValue("An outage");
    expect(await readCurlPayload()).toMatchObject({
      input: expect.any(String),
      questions: expect.arrayContaining([expect.objectContaining({ type: "predicate" })]),
    });
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "An outage" } });
    const response: OpenAIDecisionsResponse = {
      model: "jev-latest",
      answers: [{ name: "has_repro_steps", type: "predicate", probability: 0.95 }],
      usage: { input_tokens: 10, output_tokens: 1, total_tokens: 11 },
    };
    mockFetch.mockResolvedValueOnce(createResponse(response));
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("meter", { name: "是 概率" })).toHaveAttribute("aria-valuenow", "95");
    expect(screen.queryByRole("region", { name: "决策模型响应 JSON" })).not.toBeInTheDocument();
    expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/decisions$/);
    expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      model: "jev-latest",
      input: "An outage",
      questions: expect.arrayContaining([expect.objectContaining({ type: "predicate" })]),
    });

    await user.click(screen.getByRole("tab", { name: "cURL" }));
    const result = screen.getByRole("region", { name: "决策模型响应 JSON" });
    expect(result).toHaveTextContent('"probability": 0.95');
    expect(result).toHaveTextContent('"answers": [');
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "表单" }));
    expect(screen.getByRole("meter", { name: "是 概率" })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await selectEndpoint("/v1/systemone");
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue("An outage");
    expect(screen.queryByRole("region", { name: "决策模型结果" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("所选选项")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "technical 概率" })).toHaveAttribute("aria-valuenow", "90");
    await user.click(screen.getByRole("tab", { name: "cURL" }));
    expect(screen.getByRole("region", { name: "决策模型响应 JSON" })).toHaveTextContent('"choice": "technical"');
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]?.[0]).toMatch(/\/v1\/systemone$/);
    expect(JSON.parse(mockFetch.mock.calls[1]?.[1]?.body as string)).toMatchObject({
      model: "jev-latest",
      state: "An outage",
    });

    await selectEndpoint("/v1/decisions");
    expect(await readCurlPayload()).toMatchObject({ input: "An outage" });
    await selectPreset("Triage a bug report");
    expect(screen.getByRole("textbox", { name: "输入" })).not.toHaveValue("An outage");
    await selectEndpoint("/v1/systemone");
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue("An outage");
  });

  it("validates /v1/decisions independently and preserves an invalid draft across switches", async () => {
    render(<SystemOneUI accessToken="session-key" />);
    await selectEndpoint("/v1/decisions");
    await userEvent.click(screen.getByRole("button", { name: "清空" }));
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
    await selectEndpoint("/v1/systemone");
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
    await selectEndpoint("/v1/decisions");
    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("offers a Decisions form that sends input and typed questions and mirrors them in cURL", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(
      createResponse({
        model: "jev-latest",
        answers: [],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      }),
    );
    render(<SystemOneUI accessToken="session-key" />);
    await selectEndpoint("/v1/decisions");
    expect(screen.getByRole("tab", { name: "表单" })).toHaveAttribute("aria-selected", "true");
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "Login is broken" } });
    const firstQuestion = within(screen.getByRole("group", { name: "问题 1" }));
    fireEvent.change(firstQuestion.getByRole("textbox", { name: "问题名称" }), { target: { value: "team" } });
    fireEvent.change(firstQuestion.getByRole("textbox", { name: "说明" }), {
      target: { value: "Which team owns this?" },
    });
    fireEvent.change(firstQuestion.getByRole("textbox", { name: "选项 1 值" }), {
      target: { value: "infra" },
    });
    fireEvent.change(screen.getByLabelText("安全标识符"), {
      target: { value: "qa-session" },
    });
    const payload = (await readCurlPayload()) as { questions: unknown[] };
    expect(payload).toMatchObject({ input: "Login is broken", safety_identifier: "qa-session" });
    const expectedQuestion = {
      name: "team",
      type: "choice",
      instructions: "Which team owns this?",
      choices: expect.arrayContaining([expect.objectContaining({ value: "infra" })]),
    };
    expect(payload.questions[0]).toMatchObject(expectedQuestion);
    expect(payload).not.toHaveProperty("state");
    await user.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/decisions$/);
    expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)).toEqual(payload);
    expect(await screen.findByRole("button", { name: "原始响应" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "cURL" }));
    expect(screen.getByRole("region", { name: "决策模型响应 JSON" })).toBeInTheDocument();
  });

  it("adds and removes Decisions questions, boolean choices and score levels without stale fields", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);
    await selectEndpoint("/v1/decisions");
    const question = (index: number) => within(screen.getByRole("group", { name: `问题 ${index}` }));
    const pick = async (control: HTMLElement, label: string) => {
      control.focus();
      await user.keyboard("{ArrowDown}");
      await user.click(await screen.findByRole("option", { name: label, exact: true }));
    };
    await user.click(screen.getByRole("button", { name: "添加问题" }));
    fireEvent.change(question(4).getByRole("textbox", { name: "说明" }), {
      target: { value: "Should we escalate?" },
    });
    await pick(question(4).getByRole("combobox", { name: "答案类型" }), "选择题");
    await user.click(question(4).getByRole("button", { name: "移除选项 1" }));
    expect(question(4).getByRole("textbox", { name: "选项 1 值" })).toHaveValue("option_2");
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
    await user.click(question(4).getByRole("button", { name: "添加选项" }));
    await pick(question(4).getByRole("combobox", { name: "选项 1 值类型" }), "false（布尔）");
    fireEvent.change(question(4).getByRole("textbox", { name: "选项 1 描述" }), {
      target: { value: "Not urgent" },
    });
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
    const choicePayload = (await readCurlPayload()) as { questions: Record<string, unknown>[] };
    const expectedChoice = {
      type: "choice",
      name: "question_1",
      instructions: "Should we escalate?",
      choices: [{ value: false, description: "Not urgent" }, { value: "option_1" }],
    };
    expect(choicePayload.questions[3]).toEqual(expectedChoice);
    await user.click(screen.getByRole("tab", { name: "表单" }));
    await pick(question(4).getByRole("combobox", { name: "答案类型" }), "评分");
    fireEvent.change(question(4).getByRole("textbox", { name: "层级 1 标签" }), { target: { value: "low" } });
    fireEvent.change(question(4).getByRole("textbox", { name: "层级 1 描述" }), {
      target: { value: "No impact" },
    });
    await user.click(question(4).getByRole("button", { name: "添加层级" }));
    await user.click(question(4).getByRole("button", { name: "移除层级 2" }));
    expect(question(4).getByRole("textbox", { name: "层级 2 标签" })).toHaveValue("2");
    await user.click(question(2).getByRole("button", { name: "移除问题 2" }));
    expect(question(3).getByRole("textbox", { name: "说明" })).toHaveValue("Should we escalate?");
    const scorePayload = (await readCurlPayload()) as { questions: Record<string, unknown>[] };
    expect(scorePayload.questions).toHaveLength(3);
    const expectedScore = {
      type: "score",
      name: "question_1",
      instructions: "Should we escalate?",
      levels: [{ label: "low", description: "No impact" }, { label: "2" }],
    };
    expect(scorePayload.questions[2]).toEqual(expectedScore);
    await user.click(screen.getByRole("tab", { name: "表单" }));
    await pick(question(3).getByRole("combobox", { name: "答案类型" }), "谓词");
    const predicatePayload = (await readCurlPayload()) as { questions: Record<string, unknown>[] };
    expect(predicatePayload.questions[2]).toEqual({
      type: "predicate",
      name: "question_1",
      instructions: "Should we escalate?",
    });
  });

  it.each(["success", "error"])("cancels the previous endpoint request and ignores a late %s", async (outcome) => {
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(pending.promise);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    rtlRender(
      <QueryClientProvider client={queryClient}>
        <SystemOneUI accessToken="session-key" />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByRole("button", { name: "取消请求" });
    await selectEndpoint("/v1/decisions");
    expect(mockFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    await act(async () => {
      if (outcome === "success") {
        pending.resolve(createResponse({ model: "stale-model", answers: {} }));
      } else {
        pending.reject(new Error("Stale request failed"));
      }
      await pending.promise.catch(() => undefined);
    });
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("stale-model")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "表单" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
  });

  it("offers only decision models and writes the picked one into the request", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    render(<SystemOneUI accessToken="session-key" />);
    const picker = await screen.findByRole("combobox", { name: "决策模型" });

    await user.clear(picker);
    await user.type(picker, "p");
    expect(await screen.findByRole("option", { name: "pplx-decider" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "gpt-5.5" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "pplx-decider" }));

    expect(await readCurlPayload()).toMatchObject({
      model: "pplx-decider",
      questions: { has_repro_steps: { type: "noul" } },
    });
    await user.click(screen.getByRole("button", { name: "发送" }));
    await user.click(screen.getByRole("tab", { name: "表单" }));
    expect(await screen.findByText("所选选项")).toBeInTheDocument();
    expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string).model).toBe("pplx-decider");
  });

  it("routes a configured TypeSafe model through the same proxy endpoint", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(
      modelGroupInfoResponse([{ model_group: "typesafe/jev-latest", mode: "evaluation" }]),
    );
    render(<SystemOneUI accessToken="session-key" />);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("typesafe/jev-latest"),
    );

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText("所选选项")).toBeInTheDocument();
    expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/systemone$/);
    expect(mockFetch.mock.calls[0]?.[0]).not.toMatch(/\/typesafe\//);
    expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string).model).toBe("typesafe/jev-latest");
  });

  it("links to Add Model when the key cannot call any decision model", async () => {
    render(<SystemOneUI accessToken="session-key" />);

    expect(await screen.findByRole("link", { name: "添加决策模型" })).toHaveAttribute(
      "href",
      "/ui/models-and-endpoints",
    );
    expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveAttribute(
      "placeholder",
      "尚无决策模型",
    );
  });

  it("looks up a typed virtual key's decision models once, after typing settles", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    render(<SystemOneUI accessToken={null} disabledPersonalKeyCreation />);

    await user.type(screen.getByLabelText("虚拟密钥", { exact: true }), "sk-typed-key");

    await waitFor(() => expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("jev-latest"));
    expect(lookupAuthHeaders(mockModelLookup.mock.calls)).toEqual([expect.arrayContaining(["Bearer sk-typed-key"])]);
  });

  it("keeps the admin signed in when a typed virtual key has expired", async () => {
    document.cookie = "token=ui-session; path=/";
    mockModelLookup.mockResolvedValue(EXPIRED_KEY_RESPONSE);
    render(<SystemOneUI accessToken={null} disabledPersonalKeyCreation />);

    fireEvent.change(screen.getByLabelText("虚拟密钥", { exact: true }), { target: { value: "sk-expired" } });

    await waitFor(() => expect(mockModelLookup).toHaveBeenCalled());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.cookie).toContain("token=ui-session");
    expect(screen.getByRole("combobox", { name: "决策端点" })).toHaveTextContent("/v1/systemone");
  });

  it("keeps an edited request in place when decision models load afterwards", async () => {
    const models = Promise.withResolvers<Response>();
    mockModelLookup.mockReturnValue(models.promise);
    render(<SystemOneUI accessToken="session-key" />);
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "edited" } });

    await act(async () => {
      models.resolve(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByRole("textbox", { name: "输入" })).toHaveValue("edited");
    expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("");
  });

  it.each(["/v1/decisions", "/v1/systemone"] as const)(
    "omits model while discovery is pending on %s",
    async (endpoint) => {
      const models = Promise.withResolvers<Response>();
      mockModelLookup.mockReturnValue(models.promise);
      mockFetch.mockResolvedValueOnce(
        createResponse({
          model: "jev-latest",
          answers: endpoint === "/v1/decisions" ? [] : {},
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        }),
      );
      render(<SystemOneUI accessToken="session-key" />);
      if (endpoint === "/v1/decisions") {
        await selectEndpoint(endpoint);
      }
      await userEvent.click(screen.getByRole("button", { name: "发送" }));
      expect(await screen.findByText("jev-latest")).toBeInTheDocument();
      expect(mockFetch.mock.calls[0]?.[0]).toMatch(new RegExp(`${endpoint}$`));
      expect(JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty("model");
      await act(async () => {
        models.resolve(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
        await models.promise;
      });
      expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("");
    },
  );

  it("shows a read-only cURL command for the proxy with a key placeholder instead of the real key", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("customProxyBaseUrl", "https://proxy.example/");
    render(<SystemOneUI accessToken="session-key" />);
    await user.click(screen.getByRole("tab", { name: "cURL" }));

    const command = screen.getByLabelText("cURL 请求");
    expect(command).toHaveTextContent("curl -X POST 'https://proxy.example/v1/systemone'");
    expect(command).toHaveTextContent("Authorization: Bearer $LITELLM_API_KEY");
    expect(command).not.toHaveTextContent("session-key");
    expect(JSON.parse(curlPayload(command.textContent ?? "") ?? "")).toMatchObject({
      questions: { has_repro_steps: { type: "noul" } },
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 cURL" })).toBeInTheDocument();

    await selectEndpoint("/v1/decisions");
    expect(screen.getByLabelText("cURL 请求")).toHaveTextContent("https://proxy.example/v1/decisions");
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
  });

  it("keeps Send below the form and shows results only after a request", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);

    const send = screen.getByRole("button", { name: "发送" });
    const editor = screen.getByRole("region", { name: "决策模型请求编辑器" });
    const form = within(editor).getByRole("textbox", { name: "输入" });
    expect(form.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("region", { name: "决策模型结果" })).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    await user.click(send);

    const results = await screen.findByRole("region", { name: "决策模型结果" });
    expect(within(results).getByText("校准概率")).toBeInTheDocument();
    expect(editor.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(within(editor).getByRole("textbox", { name: "输入" }), { target: { value: "Edited state" } });
    expect(screen.queryByRole("region", { name: "决策模型结果" })).not.toBeInTheDocument();
  });

  it("sends to /v1/systemone even without discovered models and renders calibrated answers", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("customProxyBaseUrl", "https://stale.example.com/");
    render(<SystemOneUI accessToken="session-key" />);
    sessionStorage.setItem("customProxyBaseUrl", "https://tenant.example.com/");

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findAllByText("technical")).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe("https://tenant.example.com/v1/systemone");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(Object.values(options?.headers as Record<string, string>)).toContain("Bearer session-key");
    expect(JSON.parse(options?.body as string)).toMatchObject({
      questions: { has_repro_steps: { type: "noul" } },
    });
    expect(JSON.parse(options?.body as string)).not.toHaveProperty("model");
  });

  it("uses the requested model when the response omits it", async () => {
    const user = userEvent.setup();
    mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
    mockFetch.mockResolvedValueOnce(
      createResponse({
        answers: responseBody.answers,
      }),
    );
    render(<SystemOneUI accessToken="session-key" />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("jev-latest"));

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText("jev-latest")).toBeInTheDocument();
    expect(screen.getByText("所选选项")).toBeInTheDocument();
  });

  it("sends a native request without model so the proxy can select its default", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "An outage" } });
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("jev-1.13.0")).toBeInTheDocument();
    expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/systemone$/);
    const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
    expect(body).toMatchObject({ state: "An outage" });
    expect(body).not.toHaveProperty("model");
  });

  it.each(["success", "error"])("ignores a late %s after editing the request", async (outcome) => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(pending.promise);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    rtlRender(
      <QueryClientProvider client={queryClient}>
        <SystemOneUI accessToken="session-key" />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByRole("button", { name: "取消请求" });
    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), { target: { value: "A new request" } });
    expect(mockFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();

    await act(async () => {
      if (outcome === "success") {
        pending.resolve(createResponse({ model: "stale-model", answers: { stale: { type: "noul", noul: 1 } } }));
      } else {
        pending.reject(new Error("Stale request failed"));
      }
      await pending.promise.catch(() => undefined);
    });
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(screen.queryByText("stale-model")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale request failed")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("100% yes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("jev-1.13.0")).toBeInTheDocument();
    expect(screen.getByText("所选选项")).toBeInTheDocument();
    expect(mockFetch.mock.calls[1]?.[0]).toMatch(/\/v1\/systemone$/);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses a custom virtual key when personal key creation is disabled", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken={null} disabledPersonalKeyCreation />);
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("虚拟密钥", { exact: true }), {
      target: { value: "test-virtual-key" },
    });
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("所选选项")).toBeInTheDocument();
    expect(Object.values(mockFetch.mock.calls[0]?.[1]?.headers ?? {})).toContain("Bearer test-virtual-key");
  });

  it("renders upstream errors inline", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(createResponse(responseBody, 401, "Virtual key rejected"));
    render(<SystemOneUI accessToken="session-key" />);

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Virtual key rejected");
  });

  it("renders malformed success responses inline", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          model: "jev-1.13.0",
          answers: {
            department: {
              type: "choice",
              choice: "technical",
              probabilities: null,
            },
          },
        }),
    } as Response);
    render(<SystemOneUI accessToken="session-key" />);

    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("/v1/systemone response has an invalid shape.");
    expect(screen.queryByText("jev-1.13.0")).not.toBeInTheDocument();
  });

  it("clears a previous answer when the request editor changes", async () => {
    const user = userEvent.setup();
    render(<SystemOneUI accessToken="session-key" />);

    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("所选选项")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "输入" }), {
      target: { value: "A different support request" },
    });

    expect(screen.queryByText("所选选项")).not.toBeInTheDocument();
    expect(screen.queryByText("jev-1.13.0")).not.toBeInTheDocument();
  });

  it("clears the answer when the UI session key changes", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const view = rtlRender(
      <QueryClientProvider client={queryClient}>
        <SystemOneUI accessToken="session-key" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("所选选项")).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <SystemOneUI accessToken="new-session-key" />
      </QueryClientProvider>,
    );

    await waitForElementToBeRemoved(() => screen.queryByText("所选选项"));
  });

  it("aborts an in-flight request when cancelled", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Request aborted", "AbortError")), {
            once: true,
          });
        }),
    );
    render(<SystemOneUI accessToken="session-key" />);

    await user.click(screen.getByRole("button", { name: "发送" }));
    await user.click(await screen.findByRole("button", { name: "取消请求" }));

    expect(mockFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
  });

  describe("request form", () => {
    const question = (name: string) => within(screen.getByRole("group", { name: `问题 ${name}` }));
    const sentBody = () => JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);

    async function pickAnswerType(user: ReturnType<typeof userEvent.setup>, name: string, type: string) {
      question(name).getByRole("combobox", { name: "答案类型" }).focus();
      await user.keyboard("{ArrowDown}");
      await user.click(await screen.findByRole("option", { name: type }));
    }

    const fill = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });

    function rename(field: HTMLElement, name: string) {
      fill(field, name);
      fireEvent.blur(field);
    }

    it("explains the yes / no answer type option", async () => {
      const user = userEvent.setup();
      render(<SystemOneUI accessToken="session-key" />);

      question("has_repro_steps").getByRole("combobox", { name: "答案类型" }).focus();
      await user.keyboard("{ArrowDown}");
      expect(await screen.findByRole("option", { name: "是 / 否" })).toHaveAttribute(
        "title",
        "模型返回答案为「是」的概率",
      );
      expect(screen.getByRole("option", { name: "选择题" })).not.toHaveAttribute("title");
    });

    it("sends a choice and a yes/no question built in the form without opening JSON", async () => {
      const user = userEvent.setup();
      render(<SystemOneUI accessToken="session-key" />);
      const input = screen.getByRole("textbox", { name: "输入" });
      fill(input, "The login page is blank after the upgrade");
      for (const name of ["area", "has_repro_steps", "severity"]) {
        await user.click(screen.getByRole("button", { name: `移除问题 ${name}` }));
      }

      await user.click(screen.getByRole("button", { name: "添加问题" }));
      rename(question("question_1").getByRole("textbox", { name: "问题名称" }), "team");
      fill(question("team").getByRole("textbox", { name: "说明" }), "Which team owns this?");
      const [first, second] = question("team").getAllByRole("textbox", { name: "选项标签" });
      rename(first, "frontend");
      rename(second, "backend");
      fill(question("team").getByRole("textbox", { name: "frontend 的描述" }), "Dashboard and UI");
      await user.click(question("team").getByRole("button", { name: "添加选项" }));
      rename(question("team").getAllByRole("textbox", { name: "选项标签" })[2], "infra");
      fill(question("team").getByRole("textbox", { name: "infra 的描述" }), "Deploys");

      await user.click(screen.getByRole("button", { name: "添加问题" }));
      await pickAnswerType(user, "question_1", "是 / 否");
      rename(question("question_1").getByRole("textbox", { name: "问题名称" }), "urgent");
      fill(question("urgent").getByRole("textbox", { name: "说明" }), "Is this blocking users?");
      fill(question("urgent").getByLabelText("「是」表示"), "Nobody can log in");

      await user.click(screen.getByRole("button", { name: "发送" }));

      expect(await screen.findByText("所选选项")).toBeInTheDocument();
      expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/systemone$/);
      expect(sentBody()).toEqual({
        state: "The login page is blank after the upgrade",
        questions: {
          team: {
            type: "choice",
            instructions: "Which team owns this?",
            criteria: { frontend: "Dashboard and UI", backend: "", infra: "Deploys" },
          },
          urgent: { type: "noul", instructions: "Is this blocking users?", criteria: { true: "Nobody can log in" } },
        },
      });
      expect(Object.keys(sentBody().questions)).toEqual(["team", "urgent"]);
      expect(Object.keys(sentBody().questions.team.criteria)).toEqual(["frontend", "backend", "infra"]);
    });

    it("edits score levels and keeps instructions when a question changes type", async () => {
      const user = userEvent.setup();
      mockModelLookup.mockResolvedValue(modelGroupInfoResponse(DECISION_AND_CHAT_MODELS));
      render(<SystemOneUI accessToken="session-key" />);
      await waitFor(() => expect(screen.getByRole("combobox", { name: "决策模型" })).toHaveValue("jev-latest"));

      const level = question("severity").getByRole("textbox", { name: "层级 0" });
      fill(level, "Typo");
      await user.click(question("severity").getByRole("button", { name: "移除层级 4" }));
      await user.click(question("severity").getByRole("button", { name: "添加层级" }));
      fill(question("severity").getByRole("textbox", { name: "层级 4" }), "Data loss");
      await pickAnswerType(user, "has_repro_steps", "选择题");
      await user.click(question("has_repro_steps").getByRole("button", { name: "添加选项" }));
      await user.click(question("area").getByRole("button", { name: "移除选项 docs" }));

      await user.click(screen.getByRole("button", { name: "发送" }));

      expect(await screen.findByText("所选选项")).toBeInTheDocument();
      expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/v1\/systemone$/);
      expect(sentBody().model).toBe("jev-latest");
      expect(sentBody().questions.severity.criteria).toEqual([
        "Typo",
        "Minor bug with an easy workaround",
        "Broken feature with a workaround",
        "Broken feature with no workaround",
        "Data loss",
      ]);
      expect(sentBody().questions.has_repro_steps).toEqual({
        type: "choice",
        instructions: "Does the issue include steps someone could follow to reproduce it?",
        criteria: { option_1: "", option_2: "", option_3: "" },
      });
      expect(Object.keys(sentBody().questions.area.criteria)).toEqual(["backend", "sdk", "ui"]);
    });

    it("refuses an empty or taken question name and trims a new one", async () => {
      const user = userEvent.setup();
      render(<SystemOneUI accessToken="session-key" />);
      const name = question("severity").getByRole("textbox", { name: "问题名称" });
      expect(name).toHaveAttribute("aria-invalid", "false");

      fill(name, "area");
      expect(name).toHaveAttribute("aria-invalid", "true");
      expect(question("severity").getByText("「area」已被使用")).toBeInTheDocument();
      fireEvent.blur(name);
      expect(name).toHaveValue("severity");

      fill(name, "");
      expect(question("severity").getByText("请输入名称")).toBeInTheDocument();
      fireEvent.blur(name);
      expect(name).toHaveValue("severity");

      rename(name, "  impact  ");
      expect(question("impact").getByRole("textbox", { name: "问题名称" })).toHaveValue("impact");
      await user.click(screen.getByRole("button", { name: "添加问题" }));
      await user.click(screen.getByRole("button", { name: "添加问题" }));
      const json = (await readCurlPayload()) as { questions: Record<string, unknown> };
      expect(Object.keys(json.questions)).toEqual(["area", "has_repro_steps", "impact", "question_1", "question_2"]);
    });
  });
});
