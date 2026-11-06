import { ApiError } from "@/lib/http/client";

const MISSING_ROUTES_KEY = "litellm_missing_proxy_routes";

const readMissingRoutes = (): readonly string[] => {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(MISSING_ROUTES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

export const proxyRouteMissing = (path: string): boolean => readMissingRoutes().includes(path);

export const rememberMissingProxyRoute = (path: string): void => {
  if (typeof sessionStorage === "undefined" || proxyRouteMissing(path)) return;
  sessionStorage.setItem(MISSING_ROUTES_KEY, JSON.stringify([...readMissingRoutes(), path]));
};

export const isMissingProxyRoute = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

export async function whenProxyRoute<T>(path: string, present: () => Promise<T>, absent: T): Promise<T> {
  if (proxyRouteMissing(path)) return absent;
  try {
    return await present();
  } catch (error) {
    if (!isMissingProxyRoute(error)) throw error;
    rememberMissingProxyRoute(path);
    return absent;
  }
}
