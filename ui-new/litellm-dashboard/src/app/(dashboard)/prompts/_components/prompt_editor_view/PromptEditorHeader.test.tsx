import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PromptEditorHeader from "./PromptEditorHeader";

vi.mock("./PromptCodeSnippets", () => ({
  default: ({ environment }: { environment?: string }) => <button data-environment={environment}>获取代码</button>,
}));

describe("PromptEditorHeader", () => {
  it("preserves navigation, naming, and save actions", () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    const onNameChange = vi.fn();
    render(
      <PromptEditorHeader
        promptName="welcome"
        onNameChange={onNameChange}
        onBack={onBack}
        onSave={onSave}
        isSaving={false}
        accessToken="token"
        environment="development"
        onEnvironmentChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("welcome"), { target: { value: "greeting" } });
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onNameChange).toHaveBeenCalledWith("greeting");
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it.each([
    ["development", "开发"],
    ["staging", "预发"],
    ["production", "生产"],
  ])("shows the %s environment by its human label", (environment, label) => {
    render(
      <PromptEditorHeader
        promptName="welcome"
        onNameChange={vi.fn()}
        onBack={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        accessToken="token"
        environment={environment}
        onEnvironmentChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "环境" })).toHaveTextContent(label);
    expect(screen.getByRole("button", { name: "获取代码" })).toHaveAttribute("data-environment", environment);
  });
});
