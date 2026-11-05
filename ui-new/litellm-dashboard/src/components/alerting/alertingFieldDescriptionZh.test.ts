import { describe, expect, it } from "vitest";
import { alertingFieldDescriptionZh } from "./alertingFieldDescriptionZh";

describe("alertingFieldDescriptionZh", () => {
  it("returns Chinese copy for known alerting fields", () => {
    expect(alertingFieldDescriptionZh("slack_alerting", "Enable slack alerting")).toContain("Slack");
    expect(alertingFieldDescriptionZh("daily_report_frequency", "How often the report runs")).toContain("12 小时");
    expect(alertingFieldDescriptionZh("daily_spend_per_user_threshold", "Daily spend threshold per user")).toContain(
      "UTC",
    );
  });

  it("falls back to the API description for unknown fields", () => {
    expect(alertingFieldDescriptionZh("synthetic_unknown_field", "custom english")).toBe("custom english");
  });
});
