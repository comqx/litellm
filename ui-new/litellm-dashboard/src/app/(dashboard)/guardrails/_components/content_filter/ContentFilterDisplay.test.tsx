import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/../tests/test-utils";
import ContentFilterDisplay from "./ContentFilterDisplay";

const PATTERN = {
  id: "pattern-1",
  type: "prebuilt" as const,
  name: "email",
  display_name: "Email address",
  action: "BLOCK" as const,
};

const KEYWORD = {
  id: "word-1",
  keyword: "secret",
  action: "MASK" as const,
  description: "Sensitive term",
};

const CATEGORY = {
  id: "category-1",
  category: "self_harm",
  display_name: "Self Harm",
  action: "BLOCK" as const,
  severity_threshold: "high" as const,
};

describe("ContentFilterDisplay", () => {
  it("should render nothing when there is no content filter data", () => {
    const { container } = renderWithProviders(<ContentFilterDisplay patterns={[]} blockedWords={[]} categories={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render the categories section with a configured count", () => {
    renderWithProviders(<ContentFilterDisplay patterns={[]} blockedWords={[]} categories={[CATEGORY]} />);

    expect(screen.getByText("内容类别")).toBeInTheDocument();
    expect(screen.getByText("已配置 1 个类别")).toBeInTheDocument();
    expect(screen.getByText("Self Harm")).toBeInTheDocument();
    expect(screen.queryByText("Pattern 检测")).not.toBeInTheDocument();
    expect(screen.queryByText("拦截关键词")).not.toBeInTheDocument();
  });

  it("should render the patterns section with a configured count", () => {
    renderWithProviders(<ContentFilterDisplay patterns={[PATTERN]} blockedWords={[]} categories={[]} />);

    expect(screen.getByText("Pattern 检测")).toBeInTheDocument();
    expect(screen.getByText("已配置 1 个 Pattern")).toBeInTheDocument();
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.queryByText("内容类别")).not.toBeInTheDocument();
  });

  it("should render the keywords section with a configured count", () => {
    renderWithProviders(<ContentFilterDisplay patterns={[]} blockedWords={[KEYWORD]} categories={[]} />);

    expect(screen.getByText("拦截关键词")).toBeInTheDocument();
    expect(screen.getByText("已配置 1 个关键词")).toBeInTheDocument();
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.getByText("Sensitive term")).toBeInTheDocument();
  });

  it("should render every section when all three kinds of data are present", () => {
    renderWithProviders(<ContentFilterDisplay patterns={[PATTERN]} blockedWords={[KEYWORD]} categories={[CATEGORY]} />);

    expect(screen.getByText("内容类别")).toBeInTheDocument();
    expect(screen.getByText("Pattern 检测")).toBeInTheDocument();
    expect(screen.getByText("拦截关键词")).toBeInTheDocument();
  });

  it("should render category severity and action as static text in read-only mode", () => {
    renderWithProviders(
      <ContentFilterDisplay patterns={[PATTERN]} blockedWords={[KEYWORD]} categories={[CATEGORY]} readOnly={true} />,
    );

    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("BLOCK")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(2);
  });

  it("should render category severity and action as editable controls when not read-only", () => {
    renderWithProviders(
      <ContentFilterDisplay patterns={[PATTERN]} blockedWords={[KEYWORD]} categories={[CATEGORY]} readOnly={false} />,
    );

    expect(screen.queryByText("HIGH")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(3);
  });
});
