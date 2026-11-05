import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KeywordModal from "./KeywordModal";

describe("KeywordModal", () => {
  const handlers = {
    onKeywordChange: vi.fn(),
    onActionChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onAdd: vi.fn(),
    onCancel: vi.fn(),
  };

  const renderModal = (overrides: Partial<React.ComponentProps<typeof KeywordModal>> = {}) =>
    render(<KeywordModal visible keyword="" action="BLOCK" description="" {...handlers} {...overrides} />);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the keyword, action and description fields", async () => {
    renderModal();

    expect(await screen.findByText("添加拦截关键词")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入敏感关键词或短语")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("说明该关键词为何敏感")).toBeInTheDocument();
    expect(screen.getByText("描述（可选）")).toBeInTheDocument();
    expect(screen.getByText("选择检测到该关键词时 Guardrail 应采取的操作")).toBeInTheDocument();
  });

  it("should report keyword edits", async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(await screen.findByPlaceholderText("输入敏感关键词或短语"), {
      target: { value: "s" },
    });

    expect(handlers.onKeywordChange).toHaveBeenCalledWith("s");
  });

  it("should report description edits", async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(await screen.findByPlaceholderText("说明该关键词为何敏感"), {
      target: { value: "x" },
    });

    expect(handlers.onDescriptionChange).toHaveBeenCalledWith("x");
  });

  it("should report the chosen action", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("combobox"));
    const maskOptions = await screen.findAllByText("掩码");
    await user.click(maskOptions[maskOptions.length - 1]);

    expect(handlers.onActionChange).toHaveBeenCalled();
    expect(handlers.onActionChange.mock.calls[0][0]).toBe("MASK");
  });

  it("should show the current keyword and description values", async () => {
    renderModal({ keyword: "secret", description: "sensitive term" });

    expect(await screen.findByDisplayValue("secret")).toBeInTheDocument();
    expect(screen.getByDisplayValue("sensitive term")).toBeInTheDocument();
  });

  it("should add and cancel through the footer buttons", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: "添加" }));
    expect(handlers.onAdd).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it("should not render its content when not visible", () => {
    renderModal({ visible: false });

    expect(screen.queryByText("添加拦截关键词")).not.toBeInTheDocument();
  });

  it("should not raise the dialog above the portalled popup layer its Action select renders into", async () => {
    renderModal();
    await screen.findByText("添加拦截关键词");

    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content).not.toBeNull();
    expect(Array.from(content!.classList).filter((cls) => cls.startsWith("z-"))).toEqual(["z-popup"]);
  });
});
