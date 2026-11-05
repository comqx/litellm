import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelPricingSummary } from "./ModelPricingSummary";

const tokenPriced = { input_cost: "1.50", output_cost: "2.00" };

describe("ModelPricingSummary", () => {
  it("shows per-million-token rates for a token priced model", () => {
    render(<ModelPricingSummary model={tokenPriced} />);
    expect(screen.getByText("输入：$1.50/100 万 token")).toBeInTheDocument();
    expect(screen.getByText("输出：$2.00/100 万 token")).toBeInTheDocument();
  });

  it("hides $0.00 token rates and shows per-second tiers for a per-second priced model", () => {
    render(
      <ModelPricingSummary
        model={{
          input_cost: "0.00",
          output_cost: "0.00",
          output_cost_per_second: 0.1,
          output_cost_per_second_tiers: [
            { resolution: "1080p", cost: 0.12 },
            { resolution: "4k", cost: 0.3 },
          ],
        }}
      />,
    );
    expect(screen.getByText("输出：$0.10/s")).toBeInTheDocument();
    expect(screen.getByText("输出（1080p）：$0.12/s")).toBeInTheDocument();
    expect(screen.getByText("输出（4k）：$0.30/s")).toBeInTheDocument();
    expect(screen.queryByText(/1M tokens/)).not.toBeInTheDocument();
  });

  it("keeps a positive token rate next to the per-second rate", () => {
    render(
      <ModelPricingSummary
        model={{
          input_cost: "0.60",
          output_cost: "0.00",
          output_cost_per_second: 0.015,
        }}
      />,
    );
    expect(screen.getByText("输入：$0.60/100 万 token")).toBeInTheDocument();
    expect(screen.getByText("输出：$0.015/s")).toBeInTheDocument();
    expect(screen.queryByText("输出：$0.00/100 万 token")).not.toBeInTheDocument();
  });

  it("renders a dash when the model has no pricing at all", () => {
    render(<ModelPricingSummary model={{ input_cost: null, output_cost: null }} />);
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("names the fields a deployment prices itself", () => {
    render(
      <ModelPricingSummary
        model={{
          ...tokenPriced,
          model_info: { pricing_overrides: ["input_cost_per_token", "output_cost_per_token"] },
        }}
      />,
    );
    expect(screen.getByText("自定义价格")).toBeInTheDocument();
    expect(
      screen.getByText("覆盖模型价格表中的 input_cost_per_token, output_cost_per_token"),
    ).toBeInTheDocument();
  });

  it("says the price follows the cost map when nothing is overridden", () => {
    render(<ModelPricingSummary model={{ ...tokenPriced, model_info: { pricing_overrides: [] } }} />);
    expect(screen.getByText("跟随模型价格表")).toBeInTheDocument();
    expect(screen.queryByText("自定义价格")).not.toBeInTheDocument();
  });

  it("says nothing about the source when the proxy did not report it", () => {
    render(<ModelPricingSummary model={{ ...tokenPriced, model_info: {} }} />);
    expect(screen.queryByText(/cost map/)).not.toBeInTheDocument();
    expect(screen.queryByText("自定义价格")).not.toBeInTheDocument();
  });
});
