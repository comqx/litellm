import { fireEvent, renderWithProviders, screen } from "../../../tests/test-utils";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import OpeningPromptEditor, { OpeningPromptTierSource } from "./OpeningPromptEditor";

const { getAutoRouterAssembledPromptCall } = vi.hoisted(() => ({
  getAutoRouterAssembledPromptCall: vi.fn(),
}));

vi.mock("@/components/networking", () => ({ getAutoRouterAssembledPromptCall }));
vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: () => ({ accessToken: "sk-test" }),
}));

const tierRows = [
  { id: "SIMPLE", name: "SIMPLE", definition: "", models: ["haiku"] },
  { id: "audit", name: "AUDIT", definition: "security review", models: ["opus"] },
];

const customSource: OpeningPromptTierSource = { kind: "custom", tierRows };

const renderEditor = (classificationPrompt?: string, tierSource: OpeningPromptTierSource = customSource) => {
  const onChange = vi.fn();
  renderWithProviders(
    <OpeningPromptEditor
      classificationPrompt={classificationPrompt}
      classificationExamples={undefined}
      onChange={onChange}
      tierSource={tierSource}
      contextWindowSize={3}
    />,
  );
  return onChange;
};

beforeEach(() => {
  vi.clearAllMocks();
  getAutoRouterAssembledPromptCall.mockResolvedValue(
    "Route for payments.\n\nTiers:\n- SIMPLE: greetings, chitchat\n- AUDIT: security review",
  );
});

describe("OpeningPromptEditor with an edited tier set", () => {
  it("shows the prompt the proxy assembled rather than one rebuilt in the browser", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));

    // The blank SIMPLE row inherits criteria that live only in the backend, so a preview built here
    // could not show them. Asserting the rendered text comes from the response is what pins that.
    expect(await screen.findByLabelText("组装后的分类器提示词")).toHaveTextContent(
      "- SIMPLE: greetings, chitchat",
    );
  });

  it("sends a blank built-in definition as an absent description, which is what inherits the criteria", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    await screen.findByLabelText("组装后的分类器提示词");

    expect(getAutoRouterAssembledPromptCall).toHaveBeenCalledWith(
      "sk-test",
      3,
      { tierDefinitions: [{ name: "SIMPLE" }, { name: "AUDIT", description: "security review" }] },
      { classificationPrompt: "", classificationExamples: "" },
    );
  });

  it("previews the draft being typed, not only the saved prompt", async () => {
    renderEditor("saved opening");
    fireEvent.click(screen.getByRole("button", { name: "编辑自定义提示词" }));
    await screen.findByLabelText("组装后的分类器提示词");

    fireEvent.change(screen.getByLabelText("分类指令"), {
      target: { value: "edited opening" },
    });

    await vi.waitFor(() =>
      expect(getAutoRouterAssembledPromptCall).toHaveBeenLastCalledWith("sk-test", 3, expect.anything(), {
        classificationPrompt: "edited opening",
        classificationExamples: "",
      }),
    );
  });

  it("ignores a stale response that resolves after a newer one", async () => {
    let resolveFirst: (text: string) => void = () => {};
    getAutoRouterAssembledPromptCall
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce("assembled from the edited draft");
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    await vi.waitFor(() => expect(getAutoRouterAssembledPromptCall).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("分类指令"), {
      target: { value: "edited" },
    });
    expect(await screen.findByLabelText("组装后的分类器提示词")).toHaveTextContent(
      "assembled from the edited draft",
    );

    resolveFirst("assembled from the stale draft");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByLabelText("组装后的分类器提示词")).toHaveTextContent("assembled from the edited draft");
  });

  it("keeps the editor usable when the preview cannot be fetched", async () => {
    getAutoRouterAssembledPromptCall.mockRejectedValue(new Error("boom"));
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));

    expect(await screen.findByRole("button", { name: "保存提示词" })).toBeEnabled();
    expect(screen.queryByLabelText("组装后的分类器提示词")).not.toBeInTheDocument();
  });

  it("saves the draft as the router's opening instructions", () => {
    const onChange = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    fireEvent.change(screen.getByLabelText("分类指令"), {
      target: { value: "  my rubric  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));

    expect(onChange).toHaveBeenCalledWith({ classificationPrompt: "my rubric", classificationExamples: undefined });
  });

  it("clears the prompt rather than saving whitespace, so the router keeps the built-in opening", () => {
    const onChange = renderEditor("saved opening");
    fireEvent.click(screen.getByRole("button", { name: "重置为默认值" }));

    expect(onChange).toHaveBeenCalledWith({ classificationPrompt: undefined, classificationExamples: undefined });
  });
});

describe("OpeningPromptEditor on a built-in tier set", () => {
  const builtInSource: OpeningPromptTierSource = {
    kind: "builtIn",
    tierLabels: { SIMPLE: "Cheap" },
    classificationRubric: "agentic",
  };

  it("asks the proxy for the built-in rubric by labels and preset, never by tier definitions", async () => {
    // A built-in router has no tier_definitions to send: its bullets come from the four criteria the
    // backend owns, named by the operator's labels, so the request must carry those two instead.
    renderEditor(undefined, builtInSource);
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    await screen.findByLabelText("组装后的分类器提示词");

    expect(getAutoRouterAssembledPromptCall).toHaveBeenCalledWith(
      "sk-test",
      3,
      { tierLabels: { SIMPLE: "Cheap" }, classificationRubric: "agentic" },
      { classificationPrompt: "", classificationExamples: "" },
    );
  });

  it("names the base rubric outside the editor and explains how to customize the sections", () => {
    renderEditor(undefined, builtInSource);
    expect(screen.getByText("编辑过的层级集合会替换评分标准")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自定义提示词" })).toBeInTheDocument();
    expect(screen.getByText("基础评分标准提供", { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    expect(screen.getByRole("combobox", { name: "基础评分标准" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "分类指令" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "校准示例" })).toBeInTheDocument();
  });

  it("locks the base rubric when the tier set restricts it, rather than offering a pick the save rejects", () => {
    renderEditor(undefined, { ...builtInSource, rubricRestriction: "编辑过的层级集合会替换评分标准" });
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));

    expect(screen.getByRole("combobox", { name: "基础评分标准" })).toBeDisabled();
    expect(screen.getByText("编辑过的层级集合会替换评分标准")).toBeInTheDocument();
  });

  // The picker is a Base UI combobox, so it only responds to real pointer input; fireEvent leaves the
  // selection untouched and would make either assertion below pass without exercising the pick.
  const pickRubric = async (name: string) => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "自定义提示词" }));
    await user.click(await screen.findByRole("combobox", { name: "基础评分标准" }));
    await user.click(await screen.findByRole("option", { name }));
    return user;
  };

  it("cancels a rubric change without writing it through to the form", async () => {
    const onChange = renderEditor(undefined, builtInSource);
    const user = await pickRubric("对话");
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Agentic rubric")).toBeInTheDocument();
  });

  it("describes the rubric being previewed, not the one still saved", async () => {
    renderEditor(undefined, builtInSource);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "自定义提示词" }));
    expect(screen.getByText("将常规安装", { exact: false })).toBeInTheDocument();

    await user.click(await screen.findByRole("combobox", { name: "基础评分标准" }));
    await user.click(await screen.findByRole("option", { name: "对话" }));

    expect(screen.getByText("去掉了工程示例", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("将常规安装", { exact: false })).not.toBeInTheDocument();
  });

  it("commits a selected rubric with the section drafts on Save", async () => {
    const onChange = renderEditor(undefined, builtInSource);
    const user = await pickRubric("对话");
    await user.click(screen.getByRole("button", { name: "保存提示词" }));

    expect(onChange).toHaveBeenCalledWith({
      classificationRubric: "chat",
      classificationPrompt: undefined,
      classificationExamples: undefined,
    });
  });

  it("labels the trigger as an edit once the operator has written a prompt", () => {
    renderEditor("my opening", builtInSource);
    expect(screen.getByRole("button", { name: "编辑自定义提示词" })).toBeInTheDocument();
    expect(screen.getByText("Custom opening on the Agentic rubric")).toBeInTheDocument();
  });

  it("saves the draft as the router's opening instructions", () => {
    const onChange = renderEditor(undefined, builtInSource);
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    fireEvent.change(screen.getByLabelText("分类指令"), {
      target: { value: "  grade difficulty  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));

    expect(onChange).toHaveBeenCalledWith({
      classificationRubric: "agentic",
      classificationPrompt: "grade difficulty",
      classificationExamples: undefined,
    });
  });

  it("clears the prompt rather than saving whitespace, so the router keeps the built-in rubric", () => {
    const onChange = renderEditor(undefined, builtInSource);
    fireEvent.click(screen.getByRole("button", { name: "自定义提示词" }));
    fireEvent.change(screen.getByLabelText("分类指令"), {
      target: { value: "   \n " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));

    expect(onChange).toHaveBeenCalledWith({
      classificationRubric: "agentic",
      classificationPrompt: undefined,
      classificationExamples: undefined,
    });
  });
});
