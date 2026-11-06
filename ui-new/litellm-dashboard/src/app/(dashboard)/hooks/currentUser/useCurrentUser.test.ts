import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { ApiError } from "@/lib/http/client";
import { currentUserEndsSession, useCurrentUser } from "./useCurrentUser";

const { getCurrentUserRequest } = vi.hoisted(() => ({
  getCurrentUserRequest: vi.fn(),
}));

vi.mock("@/lib/http/api", () => ({
  fetchClient: {
    GET: getCurrentUserRequest,
  },
}));

vi.mock("@/lib/http/missingProxyRoute", () => ({
  proxyRouteMissing: () => false,
  rememberMissingProxyRoute: () => undefined,
  isMissingProxyRoute: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 404,
}));

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

describe("useCurrentUser", () => {
  const wrapperFor = (client: QueryClient) => {
    const Wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    return Wrapper;
  };

  it("does not refetch a failed current user when another subscriber mounts", async () => {
    getCurrentUserRequest.mockReset();
    getCurrentUserRequest.mockRejectedValue(new ApiError("Not Found", 404, { detail: "Not Found" }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = wrapperFor(client);
    const first = renderHook(() => useCurrentUser("token", "Authorization"), { wrapper });

    await waitFor(() => expect(first.result.current.isError).toBe(true));
    const callsAtRest = getCurrentUserRequest.mock.calls.length;
    expect(first.result.current.fetchStatus).toBe("idle");

    getCurrentUserRequest.mockImplementation(() => new Promise(() => undefined));
    renderHook(() => useCurrentUser("token", "Authorization"), { wrapper });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getCurrentUserRequest).toHaveBeenCalledTimes(callsAtRest);
    expect(first.result.current.status).toBe("error");
    expect(first.result.current.fetchStatus).toBe("idle");
  });
});
