import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/../tests/test-utils";
import userEvent from "@testing-library/user-event";
import ContentFilterConfiguration from "./ContentFilterConfiguration";

vi.mock("@/components/networking", () => ({
  validateBlockedWordsFile: vi.fn(),
  getCategoryYaml: vi.fn(),
}));

const PREBUILT = [
  { name: "us_ssn", display_name: "US Social Security Number", category: "PII Patterns", description: "d" },
];

describe("ContentFilterConfiguration", () => {
  const handlers = {
    onPatternAdd: vi.fn(),
    onPatternRemove: vi.fn(),
    onPatternActionChange: vi.fn(),
    onBlockedWordAdd: vi.fn(),
    onBlockedWordRemove: vi.fn(),
    onBlockedWordUpdate: vi.fn(),
  };

  const renderConfig = (overrides = {}) =>
    renderWithProviders(
      <ContentFilterConfiguration
        prebuiltPatterns={PREBUILT}
        categories={["PII Patterns"]}
        selectedPatterns={[]}
        blockedWords={[]}
        accessToken="test-token"
        {...handlers}
        {...overrides}
      />,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the pattern and keyword sections", () => {
    renderConfig();

    expect(screen.getByText("Pattern 检测")).toBeInTheDocument();
    expect(
      screen.getByText("使用 Regex Pattern 检测敏感信息（SSN、信用卡、API Key 等）"),
    ).toBeInTheDocument();
    expect(screen.getByText("拦截关键词")).toBeInTheDocument();
    expect(screen.getByText("阻止或掩码特定的敏感词语和短语")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add prebuilt pattern/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add custom regex/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add keyword/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload yaml file/i })).toBeInTheDocument();
  });

  it("should show the empty states for patterns and keywords", () => {
    renderConfig();

    expect(screen.getByText("尚未添加 Pattern。")).toBeInTheDocument();
    expect(screen.getByText("尚未添加关键词。")).toBeInTheDocument();
  });

  it("should open the prebuilt pattern modal", async () => {
    const user = userEvent.setup();
    renderConfig();

    expect(screen.queryByText("Pattern 类型")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add prebuilt pattern/i }));

    expect(await screen.findByText("Pattern 类型")).toBeInTheDocument();
  });

  it("should open the custom regex modal", async () => {
    const user = userEvent.setup();
    renderConfig();

    expect(screen.queryByText("添加自定义 Regex Pattern")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add custom regex/i }));

    expect(await screen.findByText("添加自定义 Regex Pattern")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., ID-[0-9]{6}")).toBeInTheDocument();
  });

  it("should open the keyword modal", async () => {
    const user = userEvent.setup();
    renderConfig();

    expect(screen.queryByText("添加拦截关键词")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add keyword/i }));

    expect(await screen.findByText("添加拦截关键词")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入敏感关键词或短语")).toBeInTheDocument();
  });

  it("should list already selected patterns and keywords", () => {
    renderConfig({
      selectedPatterns: [
        {
          id: "pattern-1",
          type: "prebuilt" as const,
          name: "us_ssn",
          display_name: "US Social Security Number",
          action: "BLOCK" as const,
        },
      ],
      blockedWords: [{ id: "word-1", keyword: "secret", action: "MASK" as const, description: "Sensitive" }],
    });

    expect(screen.getByText("US Social Security Number")).toBeInTheDocument();
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.queryByText("尚未添加 Pattern。")).not.toBeInTheDocument();
    expect(screen.queryByText("尚未添加关键词。")).not.toBeInTheDocument();
  });

  it("should show only the keyword section when the keywords step is requested", () => {
    renderConfig({ showStep: "keywords" });

    expect(screen.getByText("拦截关键词")).toBeInTheDocument();
    expect(screen.queryByText("Pattern 检测")).not.toBeInTheDocument();
  });

  it("should show only the pattern section when the patterns step is requested", () => {
    renderConfig({ showStep: "patterns" });

    expect(screen.getByText("Pattern 检测")).toBeInTheDocument();
    expect(screen.queryByText("拦截关键词")).not.toBeInTheDocument();
  });
});
