import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MCPSemanticFilterTestPanel from "./MCPSemanticFilterTestPanel";
import { TestResult } from "./semanticFilterTestUtils";

vi.mock("@/components/common_components/ModelSelector", () => ({
  default: ({ onChange, value, labelText, disabled }: any) => (
    <div>
      <label htmlFor="model-selector">{labelText ?? "选择模型"}</label>
      <select id="model-selector" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="gpt-4o">gpt-4o</option>
        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
      </select>
    </div>
  ),
}));

const buildProps = (overrides: Partial<React.ComponentProps<typeof MCPSemanticFilterTestPanel>> = {}) => ({
  accessToken: "test-token",
  testQuery: "",
  setTestQuery: vi.fn(),
  testModel: "gpt-4o",
  setTestModel: vi.fn(),
  isTesting: false,
  onTest: vi.fn(),
  filterEnabled: true,
  testResult: null as TestResult | null,
  testError: null as string | null,
  curlCommand: "curl --location 'http://localhost:4000/v1/responses'",
  ...overrides,
});

describe("MCPSemanticFilterTestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the 测试配置 card", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps()} />);
    expect(screen.getByText("测试配置")).toBeInTheDocument();
  });

  it("should show the test query textarea", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps()} />);
    expect(screen.getByPlaceholderText(/enter a test query to see which tools/i)).toBeInTheDocument();
  });

  it("should call setTestQuery when user types in the query field", () => {
    const mockSetTestQuery = vi.fn();
    render(<MCPSemanticFilterTestPanel {...buildProps({ setTestQuery: mockSetTestQuery })} />);

    const textarea = screen.getByPlaceholderText(/enter a test query to see which tools/i);
    fireEvent.change(textarea, { target: { value: "find relevant tools" } });

    expect(mockSetTestQuery).toHaveBeenCalledWith("find relevant tools");
  });

  it("should disable the 测试过滤 button when testQuery is empty", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ testQuery: "" })} />);
    expect(screen.getByRole("button", { name: /test filter/i })).toBeDisabled();
  });

  it("should disable the 测试过滤 button when filterEnabled is false", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ testQuery: "search query", filterEnabled: false })} />);
    expect(screen.getByRole("button", { name: /test filter/i })).toBeDisabled();
  });

  it("should enable the 测试过滤 button when testQuery is set and filter is enabled", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ testQuery: "search query" })} />);
    expect(screen.getByRole("button", { name: /test filter/i })).toBeEnabled();
  });

  it("should call onTest when the 测试过滤 button is clicked", async () => {
    const mockOnTest = vi.fn();
    const user = userEvent.setup();
    render(<MCPSemanticFilterTestPanel {...buildProps({ testQuery: "search query", onTest: mockOnTest })} />);

    await user.click(screen.getByRole("button", { name: /test filter/i }));
    expect(mockOnTest).toHaveBeenCalledOnce();
  });

  it("should show a warning when semantic filtering is disabled", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ filterEnabled: false })} />);
    expect(screen.getByText("语义过滤未启用")).toBeInTheDocument();
  });

  it("should not show the disabled warning when filterEnabled is true", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ filterEnabled: true })} />);
    expect(screen.queryByText("语义过滤未启用")).not.toBeInTheDocument();
  });

  it("should display selected and filtered-out counts when testResult is provided", () => {
    const testResult: TestResult = {
      totalTools: 10,
      selectedTools: 3,
      tools: ["wiki-fetch", "github-search", "slack-post"],
    };
    render(<MCPSemanticFilterTestPanel {...buildProps({ testResult })} />);

    expect(screen.getByText("已选中 3 / 10 个工具")).toBeInTheDocument();
    expect(screen.getByText("已过滤 7 个工具")).toBeInTheDocument();
    expect(screen.getByText("wiki-fetch")).toBeInTheDocument();
    expect(screen.getByText("github-search")).toBeInTheDocument();
    expect(screen.getByText("slack-post")).toBeInTheDocument();
    expect(screen.queryByText(/more selected tools not shown/i)).not.toBeInTheDocument();
  });

  it("should note how many selected tools are missing when the header list is incomplete", () => {
    const testResult: TestResult = {
      totalTools: 40,
      selectedTools: 8,
      tools: ["metrics_mcp-node_query_by_id", "metrics_mcp-latency_query_api", "inventory_mcp-site_lookup"],
    };
    render(<MCPSemanticFilterTestPanel {...buildProps({ testResult })} />);

    expect(screen.getByText("另有 5 个已选工具未在此列出")).toBeInTheDocument();
  });

  it("should surface a zero filtered-out count when the filter selected every tool", () => {
    const testResult: TestResult = {
      totalTools: 207,
      selectedTools: 207,
      tools: ["tool-a", "tool-b"],
    };
    render(<MCPSemanticFilterTestPanel {...buildProps({ testResult })} />);

    expect(screen.getByText("已选中 207 / 207 个工具")).toBeInTheDocument();
    expect(screen.getByText("已过滤 0 个工具")).toBeInTheDocument();
  });

  it("should not render the results section when testResult is null", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ testResult: null })} />);
    expect(screen.queryByText("结果")).not.toBeInTheDocument();
  });

  it("should render an error banner with the backend message when testError is set", () => {
    const testError =
      "MCP semantic tool filtering could not run: embedding model 'text-embedding-3-small' exceeded its context window while embedding the user query. Switch to an embedding model with a larger context window, or disable semantic tool filtering.";
    render(<MCPSemanticFilterTestPanel {...buildProps({ testError })} />);

    expect(screen.getByText("语义过滤未执行")).toBeInTheDocument();
    expect(screen.getByText(testError)).toBeInTheDocument();
  });

  it("should not render the error banner when testError is null", () => {
    render(<MCPSemanticFilterTestPanel {...buildProps({ testError: null })} />);
    expect(screen.queryByText("语义过滤未执行")).not.toBeInTheDocument();
  });

  it("should show the curl command in the API 用法 tab", async () => {
    const user = userEvent.setup();
    const curlCommand =
      'curl --location "http://localhost:4000/v1/responses" --header "Authorization: Bearer $LITELLM_MASTER_KEY"';
    render(<MCPSemanticFilterTestPanel {...buildProps({ curlCommand })} />);

    await user.click(screen.getByRole("tab", { name: "API 用法" }));

    expect(screen.getByText(curlCommand)).toBeInTheDocument();
  });
});
