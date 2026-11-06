// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/client";
import { proxyRouteMissing, whenProxyRoute } from "./missingProxyRoute";

describe("whenProxyRoute", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("calls the route until the proxy says it does not exist, then stops", async () => {
    const present = vi.fn(async () => {
      throw new ApiError("Not Found", 404, { detail: "Not Found" });
    });

    await expect(whenProxyRoute("/health/deployment_warnings", present, "absent")).resolves.toBe("absent");
    await expect(whenProxyRoute("/health/deployment_warnings", present, "absent")).resolves.toBe("absent");

    expect(present).toHaveBeenCalledOnce();
    expect(proxyRouteMissing("/health/deployment_warnings")).toBe(true);
  });

  it("keeps calling a route that failed for another reason", async () => {
    const present = vi.fn(async () => {
      throw new ApiError("unavailable", 503, {});
    });

    await expect(whenProxyRoute("/telemetry/settings", present, "absent")).rejects.toBeInstanceOf(ApiError);
    await expect(whenProxyRoute("/telemetry/settings", present, "absent")).rejects.toBeInstanceOf(ApiError);

    expect(present).toHaveBeenCalledTimes(2);
  });
});
