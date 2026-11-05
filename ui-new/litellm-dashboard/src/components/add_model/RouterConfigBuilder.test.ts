import { describe, expect, it } from "vitest";
import { serializeRouterConfig } from "./RouterConfigBuilder";

describe("serializeRouterConfig", () => {
  it("rejects a cleared route model and preserves selected route settings", () => {
    expect(() => serializeRouterConfig({ routes: [{ name: null }] })).toThrow("请为每条路由选择一个 Model");
    const config = { routes: [{ name: "model-silver", utterances: [], description: "", score_threshold: 0 }] };
    expect(JSON.parse(serializeRouterConfig(config))).toEqual(config);
  });
});
