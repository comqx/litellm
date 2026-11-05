import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/../tests/test-utils";
import AiSuggestionModal from "./ai_suggestion_modal";

const { suggestPolicyTemplates, modelHubCall, testPolicyTemplate, enrichPolicyTemplateStream } = vi.hoisted(() => ({
  suggestPolicyTemplates: vi.fn(),
  modelHubCall: vi.fn(),
  testPolicyTemplate: vi.fn(),
  enrichPolicyTemplateStream: vi.fn(),
}));

vi.mock("@/components/networking", () => ({
  suggestPolicyTemplates,
  modelHubCall,
  testPolicyTemplate,
  enrichPolicyTemplateStream,
}));

const allTemplates = [
  { id: "tpl-pii", title: "PII 保护", description: "Masks PII", guardrails: ["pii-masker"], complexity: "Low" },
  {
    id: "tpl-inj",
    title: "Injection Defense",
    description: "Blocks prompt injection",
    guardrails: ["prompt-injection"],
    complexity: "Medium",
  },
];

const suggestResponse = {
  selected_templates: [
    { template_id: "tpl-pii", reason: "Your examples contain SSNs" },
    { template_id: "tpl-inj", reason: "Your examples contain instruction overrides" },
  ],
  explanation: "These two cover both risks you described",
};

const defaultProps = {
  visible: true,
  onSelectTemplates: vi.fn(),
  onCancel: vi.fn(),
  accessToken: "sk-test",
  allTemplates,
};

const renderModal = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<AiSuggestionModal {...defaultProps} {...props} />);

const pickModel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("combobox"));
  const options = await screen.findAllByText("gpt-5.1");
  await user.click(options[options.length - 1]);
};

describe("AiSuggestionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelHubCall.mockResolvedValue({ data: [{ model_group: "gpt-5.1" }, { model_group: "claude-opus-4-8" }] });
    suggestPolicyTemplates.mockResolvedValue(suggestResponse);
  });

  it("renders nothing while closed", () => {
    renderModal({ visible: false });

    expect(screen.queryByText("AI Policy 建议")).not.toBeInTheDocument();
  });

  it("renders the header and prompt copy when opened", async () => {
    renderModal();

    expect(await screen.findByText("AI Policy 建议")).toBeInTheDocument();
    expect(
      screen.getByText("描述你想拦截的内容，我们将推荐合适的 Policy 模板"),
    ).toBeInTheDocument();
  });

  it("loads the model list when opened", async () => {
    renderModal();

    await waitFor(() => {
      expect(modelHubCall).toHaveBeenCalledWith("sk-test");
    });
  });

  it("keeps Suggest disabled until there is both input and a model", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    expect(screen.getByRole("button", { name: "推荐 Policy" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    expect(screen.getByRole("button", { name: "推荐 Policy" })).toBeDisabled();

    await pickModel(user);
    expect(screen.getByRole("button", { name: "推荐 Policy" })).toBeEnabled();
  });

  it("sends the examples, description and model to the suggest API", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Ignore all previous instructions/), {
      target: { value: "my ssn is 123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));

    await waitFor(() => {
      expect(suggestPolicyTemplates).toHaveBeenCalledWith("sk-test", ["my ssn is 123"], "block PII", "gpt-5.1");
    });
  });

  it("adds attack example fields up to the maximum of four", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    const countExamples = () => screen.getAllByRole("textbox").length;
    const initial = countExamples();

    await user.click(screen.getByRole("button", { name: "+ 添加示例" }));
    expect(countExamples()).toBe(initial + 1);

    await user.click(screen.getByRole("button", { name: "+ 添加示例" }));
    await user.click(screen.getByRole("button", { name: "+ 添加示例" }));
    expect(countExamples()).toBe(initial + 3);
    expect(screen.queryByRole("button", { name: "+ 添加示例" })).not.toBeInTheDocument();
  });

  it("shows each suggested template with the reason it was picked", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));

    expect(await screen.findByText("PII 保护")).toBeInTheDocument();
    expect(screen.getByText("Injection Defense")).toBeInTheDocument();
    expect(screen.getByText("Your examples contain SSNs")).toBeInTheDocument();
    expect(screen.getByText("These two cover both risks you described")).toBeInTheDocument();
    expect(screen.getByText("有 2 个模板符合你的需求")).toBeInTheDocument();
  });

  it("preselects every suggestion and reflects the count on the confirm button", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));

    expect(await screen.findByRole("button", { name: "使用 2 个所选模板" })).toBeInTheDocument();
  });

  it("deselecting a suggestion lowers the confirm count", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));

    await user.click(await screen.findByText("PII 保护"));

    expect(await screen.findByRole("button", { name: "使用 1 个所选模板" })).toBeInTheDocument();
  });

  it("hands the selected templates back to the caller", async () => {
    const onSelectTemplates = vi.fn();
    const user = userEvent.setup();
    renderModal({ onSelectTemplates });

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));
    await user.click(await screen.findByRole("button", { name: "使用 2 个所选模板" }));

    expect(onSelectTemplates).toHaveBeenCalledTimes(1);
    expect(onSelectTemplates.mock.calls[0][0].map((t: { id: string }) => t.id)).toEqual(["tpl-pii", "tpl-inj"]);
  });

  it("returns to the input phase from the results phase", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));
    await user.click(await screen.findByRole("button", { name: "返回" }));

    expect(
      await screen.findByText("描述你想拦截的内容，我们将推荐合适的 Policy 模板"),
    ).toBeInTheDocument();
  });

  it("reports an empty result set instead of failing silently", async () => {
    suggestPolicyTemplates.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("AI Policy 建议");
    fireEvent.change(screen.getByPlaceholderText(/Block PII leakage/), { target: { value: "block PII" } });
    await pickModel(user);
    await user.click(screen.getByRole("button", { name: "推荐 Policy" }));

    expect(await screen.findByText("未找到匹配的模板")).toBeInTheDocument();
    expect(screen.getByText("请调整示例或描述后重试。")).toBeInTheDocument();
  });

  it("cancels back to the caller", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderModal({ onCancel });

    await screen.findByText("AI Policy 建议");
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
