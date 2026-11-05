import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http/client";
import { currentUserEndsSession } from "./useCurrentUser";

describe("currentUserEndsSession", () => {
  it("keeps the session when the current-user route is missing", () => {
    expect(currentUserEndsSession(new ApiError("Not Found", 404, { detail: "Not Found" }))).toBe(false);
  });

  it("ends the session when the proxy rejects the token", () => {
    expect(currentUserEndsSession(new ApiError("unauthorized", 401, {}))).toBe(true);
    expect(currentUserEndsSession(new ApiError("forbidden", 403, {}))).toBe(true);
  });

  it("keeps the session for an empty or non-HTTP failure", () => {
    expect(currentUserEndsSession(new Error("Current user response is empty"))).toBe(false);
    expect(currentUserEndsSession(null)).toBe(false);
  });
});
