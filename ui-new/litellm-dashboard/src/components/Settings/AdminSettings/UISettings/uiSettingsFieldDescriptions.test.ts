import { describe, expect, it } from "vitest";

import { getUiSettingsFieldDescription, uiSettingsFieldDescriptions } from "./uiSettingsFieldDescriptions";

describe("uiSettingsFieldDescriptions", () => {
  it("should expose a Chinese description for every mapped UI settings field", () => {
    Object.keys(uiSettingsFieldDescriptions).forEach((key) => {
      const description = getUiSettingsFieldDescription(key as keyof typeof uiSettingsFieldDescriptions);
      expect(description.length).toBeGreaterThan(0);
      expect(description).toMatch(/[\u4e00-\u9fff]/);
    });
  });
});
