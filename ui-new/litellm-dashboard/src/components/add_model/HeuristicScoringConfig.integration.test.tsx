import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, renderWithProviders, screen, testQueryClient, chooseSelectOption } from "../../../tests/test-utils";
import { SHIPPED_SCORER_DEFAULTS } from "../../../tests/mocks/complexityScorerDefaults";
import HeuristicScoringConfig from "./HeuristicScoringConfig";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { getComplexityScorerDefaults } from "@/components/networking";

vi.mock("@/components/networking", () => ({ getComplexityScorerDefaults: vi.fn() }));

const base: ComplexityRouterConfigValue = {
  classifier_type: "heuristic",
  tiers: { SIMPLE: [], MEDIUM: [], COMPLEX: [], REASONING: [] },
};
function Editor({ initial = base }: { initial?: ComplexityRouterConfigValue }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <HeuristicScoringConfig value={value} onChange={setValue} />
      <output aria-label="Draft config">{JSON.stringify(value)}</output>
    </>
  );
}
const draft = (): ComplexityRouterConfigValue => JSON.parse(screen.getByLabelText("Draft config").textContent!);

beforeEach(() => {
  testQueryClient.clear();
  vi.mocked(getComplexityScorerDefaults).mockResolvedValue(SHIPPED_SCORER_DEFAULTS);
});

describe("combined heuristic editor", () => {
  it("adds and edits a graded dimension, rebalances builtins, preserves matcher-only edits, and removes it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Editor />);
    await user.click(screen.getByText("高级评分"));
    expect(await screen.findByRole("button", { name: "恢复默认权重" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "添加自定义维度" }));
    expect(screen.getByRole("button", { name: "恢复默认权重" })).toBeEnabled();
    expect(draft().dimension_weights?.codePresence).toBeCloseTo(0.27, 12);
    expect(draft().custom_dimensions?.[0].scoring_mode).toBe("match_count");
    expect(screen.getByRole("group", { name: "自定义维度 1" })).toContainElement(
      screen.getByLabelText("名称", { exact: true }),
    );
    fireEvent.change(screen.getByLabelText("名称", { exact: true }), { target: { value: "domain" } });
    fireEvent.change(screen.getByLabelText("关键词（每行一个）"), { target: { value: "orbitmesh\nfluxgate" } });
    fireEvent.change(screen.getByLabelText("权重", { exact: true }), { target: { value: "0.2" } });
    expect(screen.getByLabelText("代码存在度", { exact: true })).toHaveValue("0.24");
    expect(screen.getByTestId("dimension-weight-total")).toHaveTextContent("总计 1.00");
    const beforeMatchers = draft().dimension_weights;
    fireEvent.change(screen.getByLabelText("正则表达式（每行一个）"), { target: { value: "abc" } });
    await chooseSelectOption(user, screen.getByLabelText("计分方式"), "二元");
    expect(draft().dimension_weights).toEqual(beforeMatchers);
    expect(draft().custom_dimensions?.[0].scoring_mode).toBe("binary");
    await user.click(screen.getByRole("button", { name: "移除自定义维度 1" }));
    expect(draft().custom_dimensions).toBeUndefined();
    expect(draft().dimension_weights?.codePresence).toBeCloseTo(0.3, 12);
  });

  it("preserves a legacy vector on load and resets both fields only when requested", async () => {
    const legacy = {
      ...base,
      dimension_weights: { codePresence: 0.4 },
      custom_dimensions: [{ id: "stored-0", name: "domain", weight: 0.7, keywords: ["a"] }],
    };
    renderWithProviders(<Editor initial={legacy} />);
    await userEvent.click(screen.getByText("高级评分"));
    expect(await screen.findByTestId("dimension-weight-total")).toHaveTextContent("总计 1.10");
    expect(draft()).toEqual(legacy);
    expect(screen.getByLabelText("Token 数量", { exact: true })).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "恢复默认权重" }));
    expect(draft().custom_dimensions).toBeUndefined();
    expect(draft().dimension_weights).toBeUndefined();
  });

  it("drops hidden custom drafts on a fallback-only weight edit so switching back cannot exceed the budget", async () => {
    const initial: ComplexityRouterConfigValue = {
      ...base,
      classifier_type: "llm",
      classifier_fallback: "heuristic",
      custom_dimensions: [{ id: "a", name: "domain", weight: 0.7, keywords: ["a"] }],
    };
    renderWithProviders(<Editor initial={initial} />);
    await userEvent.click(screen.getByText("高级评分"));
    fireEvent.change(await screen.findByLabelText("代码存在度", { exact: true }), { target: { value: "0.5" } });
    expect(draft().custom_dimensions).toBeUndefined();
    expect(Object.values(draft().dimension_weights!).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
    expect(screen.queryByRole("button", { name: "添加自定义维度" })).not.toBeInTheDocument();
  });
});
