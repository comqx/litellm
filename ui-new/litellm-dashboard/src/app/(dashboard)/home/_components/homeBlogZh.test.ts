import { describe, expect, it } from "vitest";
import { homeBlogTextZh } from "./homeBlogZh";

describe("homeBlogTextZh", () => {
  it("translates what's new card summaries", () => {
    expect(
      homeBlogTextZh(
        "Half the price of GPT-6.1 Sol at $1 / $5 per 1M tokens, 50.3% on Terminal-Bench 4.0, 1.05M context.",
      ),
    ).toContain("GPT-6.1 Sol 半价");
    expect(
      homeBlogTextZh(
        "Jev 1.14 reads PNG and JPEG images, answers box questions with coordinates, and takes long-context requests on LiteLLM.",
      ),
    ).toContain("Jev 1.14");
    expect(
      homeBlogTextZh(
        "Typed yes/no, choice and score answers as probabilities, from 9 providers on /v1/decisions and /v1/systemone.",
      ),
    ).toContain("/v1/decisions");
  });

  it("translates updates feed titles and descriptions", () => {
    expect(homeBlogTextZh("Release cadence changes and an LTS version pilot")).toBe("发布节奏调整与 LTS 版本试点");
    expect(homeBlogTextZh("Introducing the LiteLLM Private Registry")).toBe("LiteLLM 私有镜像仓库发布");
  });

  it("falls back to the original text when no mapping exists", () => {
    expect(homeBlogTextZh("Untitled post")).toBe("Untitled post");
  });
});
