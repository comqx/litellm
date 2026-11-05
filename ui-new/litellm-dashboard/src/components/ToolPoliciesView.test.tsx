import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../tests/test-utils";
import ToolPoliciesView from "./ToolPoliciesView";

const can = vi.fn();
vi.mock("@/app/(dashboard)/hooks/useCan", () => ({
  default: (...args: unknown[]) => can(...args),
}));

vi.mock("@/components/ToolDetail", () => ({
  ToolDetail: ({ toolName, onBack }: { toolName: string; onBack: () => void }) => (
    <div>
      <span>Detail: {toolName}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock("@/components/ToolPolicies/ToolPoliciesPanel", () => ({
  ToolPoliciesPanel: function ToolPoliciesPanelMock({ onSelectTool }: { onSelectTool: (name: string) => void }) {
    return (
      <div>
        <span>工具策略 Overview</span>
        <button onClick={() => onSelectTool("my-tool")}>Select Tool</button>
      </div>
    );
  },
}));

describe("ToolPoliciesView", () => {
  beforeEach(() => {
    can.mockReset().mockReturnValue(true);
  });

  it("should show an admin-only notice instead of the overview when the caller lacks access", () => {
    can.mockReturnValue(false);
    renderWithProviders(<ToolPoliciesView accessToken="token" />);

    expect(screen.getByText(/only available to admin users/i)).toBeInTheDocument();
    expect(screen.queryByText("工具策略 Overview")).not.toBeInTheDocument();
  });

  it("should render the overview by default", () => {
    renderWithProviders(<ToolPoliciesView accessToken="token" />);

    expect(screen.getByText("工具策略 Overview")).toBeInTheDocument();
  });

  it("should navigate to tool detail when a tool is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolPoliciesView accessToken="token" />);

    await user.click(screen.getByRole("button", { name: /select tool/i }));

    expect(screen.getByText("Detail: my-tool")).toBeInTheDocument();
    expect(screen.queryByText("工具策略 Overview")).not.toBeInTheDocument();
  });

  it("should navigate back to overview when back is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolPoliciesView accessToken="token" />);

    await user.click(screen.getByRole("button", { name: /select tool/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(screen.getByText("工具策略 Overview")).toBeInTheDocument();
    expect(screen.queryByText("Detail: my-tool")).not.toBeInTheDocument();
  });
});
