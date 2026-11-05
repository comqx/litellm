import { describe, expect, it } from "vitest";
import { navAccountDisplayName } from "./navDisplayName";

describe("navAccountDisplayName", () => {
  it("should map default_user_id placeholder to 账户", () => {
    expect(navAccountDisplayName("x@y.com", "ignored")).toBe("x@y.com");
  });

  it("should map default_user_id placeholder to Account", () => {
    expect(navAccountDisplayName(null, "default_user_id")).toBe("账户");
    expect(navAccountDisplayName(null, "DEFAULT_USER_ID")).toBe("账户");
  });

  it("should show a sensible token when user id is non-placeholder", () => {
    expect(navAccountDisplayName(null, "user-uuid-123")).toBe("user-uuid-123");
  });
});
