import { skipToken, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchClient } from "@/lib/http/api";
import { ApiError } from "@/lib/http/client";
import { isMissingProxyRoute, proxyRouteMissing, rememberMissingProxyRoute } from "@/lib/http/missingProxyRoute";
import { getAuthHeaderName } from "@/lib/http/runtime";
import type { components } from "@/lib/http/schema";
import { createQueryKeys } from "../common/queryKeysFactory";

export type CurrentUser = components["schemas"]["CurrentUserResponse"];

const currentUserKeys = createQueryKeys("currentUser");

export function currentUserEndsSession(error: unknown): boolean {
  // 404 means this proxy has no /management/v1/users/me route.
  // Logging that out sends a fresh sign-in straight back to the login page.
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

const currentUserPath = "/management/v1/users/me";

const getCurrentUser = async (accessToken: string, authHeaderName: string): Promise<CurrentUser> => {
  if (proxyRouteMissing(currentUserPath)) {
    throw new ApiError("Not Found", 404, { detail: "Not Found" });
  }
  try {
    const { data } = await fetchClient.GET(currentUserPath, {
      headers: { [authHeaderName]: `Bearer ${accessToken}` },
    });
    if (!data) throw new Error("Current user response is empty");
    return data;
  } catch (error) {
    if (isMissingProxyRoute(error)) rememberMissingProxyRoute(currentUserPath);
    throw error;
  }
};

export const useCurrentUser = (accessToken: string | null, authHeaderName?: string, canFetch = true) => {
  const options: UseQueryOptions<CurrentUser> = {
    queryKey: currentUserKeys.detail(accessToken ?? ""),
    queryFn:
      accessToken && canFetch ? () => getCurrentUser(accessToken, authHeaderName ?? getAuthHeaderName()) : skipToken,
    staleTime: Infinity,
    retry: false,
    // retry:false still refetches an errored query that has no data when another subscriber mounts.
    // That refetch sets isLoading, the shell unmounts, and the subscriber mounts again.
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
  return useQuery(options);
};
