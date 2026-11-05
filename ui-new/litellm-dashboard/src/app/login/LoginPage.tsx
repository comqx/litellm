"use client";

import { useLogin } from "@/app/(dashboard)/hooks/login/useLogin";
import { useUIConfig } from "@/app/(dashboard)/hooks/uiConfig/useUIConfig";
import LoadingScreen from "@/components/common_components/LoadingScreen";
import { exchangeLoginCode, getProxyBaseUrl, switchToWorkerUrl } from "@/components/networking";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";
import { clearTokenCookies, getCookieFromDocument } from "@/utils/cookieUtils";
import { isJwtExpired } from "@/utils/jwtUtils";
import {
  consumeReturnUrl,
  getLoginUrl,
  getReturnUrl,
  isDashboardReturnUrl,
  isValidReturnUrl,
} from "@/utils/returnUrlUtils";
import { uiHref } from "@/utils/uiHref";
import { CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { z } from "zod/v4";
import { useWorker } from "@/hooks/useWorker";
import { PRODUCT_ADMIN_CONSOLE_DESCRIPTION, PRODUCT_NAME } from "@/lib/productBranding";
import { BrandLockup } from "./BrandLockup";
import { GatewayHub } from "./GatewayHub";

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginFrame({ children }: { children: ReactNode }) {
  return (
    <div className="login-shell dark">
      <header className="login-top">
        <BrandLockup />
      </header>
      <div className="login-body">
        <section className="login-hero">
          <p className="login-kicker">企业控制台</p>
          <h2 className="login-title">{PRODUCT_NAME}</h2>
          <p className="login-lead">在统一策略下治理算力与服务访问：鉴权、计量与合规，再路由至各类模型与能力。</p>
          <GatewayHub />
        </section>
        <main className="login-panel">
          <div className="login-card">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SsoEnabledNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <Alert variant="info" className="mt-4">
      <Info />
      <AlertTitle>
        已启用单点登录（SSO）。当前不再在打开本页时自动跳转到 SSO 登录流程。如需恢复自动跳转，请在环境变量中设置{" "}
        <code className="bg-muted px-1 py-0.5 rounded-sm text-xs">AUTO_REDIRECT_UI_LOGIN_TO_SSO=true</code>。
      </AlertTitle>
      <AlertAction>
        <Button variant="ghost" size="icon-sm" aria-label="关闭" onClick={() => setDismissed(true)}>
          <X className="size-4" />
        </Button>
      </AlertAction>
    </Alert>
  );
}

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { data: uiConfig, isLoading: isConfigLoading } = useUIConfig();
  const loginMutation = useLogin();
  const router = useRouter();
  const { workers, selectWorker } = useWorker();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const workerFieldId = useId();
  const form = useZodForm(loginSchema, { defaultValues: { username: "", password: "" } });

  // Pre-select worker from URL param (e.g. /ui/login?worker=team-b)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerParam = params.get("worker");
    if (workerParam) {
      setSelectedWorkerId(workerParam);
    }
  }, []);

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    // Check if admin UI is disabled
    if (uiConfig && uiConfig.admin_ui_disabled) {
      setIsLoading(false);
      return;
    }

    // Cross-origin SSO: worker redirected back with a single-use code.
    // Exchange it for the JWT via the worker's /v3/login/exchange endpoint.
    const params = new URLSearchParams(window.location.search);
    const rawSsoCode = params.get("code");
    // Validate the SSO code is a plausible OAuth authorization code (alphanumeric
    // plus common URL-safe chars) so that arbitrary user input cannot trigger the
    // exchange endpoint.
    const ssoCode = rawSsoCode && /^[a-zA-Z0-9._~+/=-]+$/.test(rawSsoCode) ? rawSsoCode : null;
    if (ssoCode) {
      const rawWorkerUrl = localStorage.getItem("litellm_worker_url");
      // Validate the stored worker URL: only allow http(s) URLs.
      const workerUrl = rawWorkerUrl && /^https?:\/\/.+/.test(rawWorkerUrl) ? rawWorkerUrl : null;
      exchangeLoginCode(ssoCode, workerUrl).then(() => {
        params.delete("code");
        const cleanSearch = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ""));
        window.location.assign(uiHref(""));
      });
      return;
    }

    // If switching workers on a control plane, clear the old token and show login
    const switchingWorker = params.has("worker");
    if (switchingWorker && uiConfig?.is_control_plane) {
      clearTokenCookies();
      setIsLoading(false);
      return;
    }

    const rawToken = getCookieFromDocument("token");
    if (rawToken && !isJwtExpired(rawToken)) {
      const returnUrl = consumeReturnUrl();
      if (returnUrl && isDashboardReturnUrl(returnUrl)) {
        window.location.replace(returnUrl);
        return;
      }
      router.replace("/ui");
      return;
    }

    if (uiConfig && uiConfig.auto_redirect_to_sso) {
      // For SSO, pass the return URL to the SSO endpoint
      const returnUrl = getReturnUrl();
      let ssoUrl = `${getProxyBaseUrl()}/sso/key/generate`;
      if (returnUrl && isValidReturnUrl(returnUrl)) {
        ssoUrl += `?redirect_to=${encodeURIComponent(returnUrl)}`;
      }
      router.push(ssoUrl);
      return;
    }

    setIsLoading(false);
  }, [isConfigLoading, router, uiConfig]);

  const handleSubmit = ({ username, password }: LoginFormValues) => {
    // If a worker is selected, point proxyBaseUrl at it before login
    const selectedWorker = workers.find((w) => w.worker_id === selectedWorkerId);
    if (selectedWorker) {
      switchToWorkerUrl(selectedWorker.url);
    }

    loginMutation.mutate(
      { username, password, useV3: !!selectedWorker },
      {
        onSuccess: (data) => {
          // Update the worker context with the selected worker
          if (selectedWorker) {
            selectWorker(selectedWorker.worker_id);
            window.location.assign(uiHref(""));
          } else {
            const returnUrl = consumeReturnUrl();
            const serverUrl = data.redirect_url;
            const destination =
              returnUrl && isDashboardReturnUrl(returnUrl)
                ? returnUrl
                : serverUrl && isDashboardReturnUrl(serverUrl)
                  ? serverUrl
                  : uiHref("");
            window.location.assign(destination);
          }
        },
        onError: () => {
          // Reset proxyBaseUrl on login failure
          if (selectedWorker) {
            switchToWorkerUrl(null);
          }
        },
      },
    );
  };

  const error = loginMutation.error instanceof Error ? loginMutation.error.message : null;
  const isLoginLoading = loginMutation.isPending;

  if (isConfigLoading || isLoading) {
    return <LoadingScreen />;
  }

  // Show disabled message if admin UI is disabled
  if (uiConfig && uiConfig.admin_ui_disabled) {
    return (
      <LoginFrame>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">管理控制台当前不可用</p>
        <div className="mt-6">
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>管理控制台已停用</AlertTitle>
            <AlertDescription>
              <p className="text-sm">管理员已停用 Admin UI。如需重新启用，请修改以下环境变量：</p>
              <p className="mt-2 text-sm">
                <code className="bg-muted px-1 py-0.5 rounded-sm text-xs">DISABLE_ADMIN_UI=False</code>
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </LoginFrame>
    );
  }

  return (
    <LoginFrame>
      <TooltipProvider>
        <div className="flex w-full flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">登录</h1>
            <p className="login-subtitle mt-1.5 text-sm">使用账号进入 {PRODUCT_ADMIN_CONSOLE_DESCRIPTION}</p>
          </div>

          {error && (
            <Alert variant="error">
              <CircleAlert />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup>
              {uiConfig?.is_control_plane && workers.length > 0 && (
                <Field>
                  <FieldLabel htmlFor={workerFieldId}>Worker</FieldLabel>
                  <Select
                    items={workers.map((worker) => ({ label: worker.name, value: worker.worker_id }))}
                    value={selectedWorkerId}
                    onValueChange={(value: string | null) => setSelectedWorkerId(value)}
                  >
                    <SelectTrigger id={workerFieldId} className="h-11 w-full">
                      <SelectValue placeholder="选择要连接的 Worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.worker_id} value={worker.worker_id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <FormField control={form.control} name="username" label="用户名">
                {({ ref, ...field }) => (
                  <Input
                    {...field}
                    ref={ref}
                    placeholder="请输入用户名"
                    autoComplete="username"
                    disabled={isLoginLoading}
                    className="h-11"
                  />
                )}
              </FormField>

              <FormField control={form.control} name="password" label="密码">
                {({ ref, ...field }) => (
                  <PasswordInput
                    {...field}
                    ref={ref}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    disabled={isLoginLoading}
                    groupClassName="h-11"
                  />
                )}
              </FormField>

              <Button type="submit" size="lg" disabled={isLoginLoading} className="mt-1 h-11 w-full">
                {isLoginLoading && <UiLoadingSpinner className="size-4" role="img" aria-label="正在登录" />}
                {isLoginLoading ? "登录中…" : "登录"}
              </Button>

              <p className="login-or">或</p>

              {!uiConfig?.sso_configured ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="block w-full" />}>
                    <Button type="button" variant="outline" size="lg" disabled className="login-sso h-11 w-full">
                      使用 SSO 登录
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>请先在服务端配置 SSO，再使用 SSO 登录。</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isLoginLoading || (!!selectedWorkerId && workers.length === 0)}
                  onClick={() => {
                    const selectedWorker = workers.find((w) => w.worker_id === selectedWorkerId);
                    if (selectedWorker) {
                      // Store worker selection so useWorker hook restores it after redirect
                      localStorage.setItem("litellm_selected_worker_id", selectedWorkerId!);
                      switchToWorkerUrl(selectedWorker.url);
                    }
                    // SSO on the worker (or this instance if no worker), always
                    // include return_to so the callback redirects back here
                    const ssoBase = selectedWorker?.url ?? getProxyBaseUrl();
                    const returnTo = encodeURIComponent(getLoginUrl(window.location.origin));
                    router.push(`${ssoBase}/sso/key/generate?return_to=${returnTo}`);
                  }}
                  className="login-sso h-11 w-full"
                >
                  使用 SSO 登录
                </Button>
              )}
            </FieldGroup>
          </form>
        </div>
        {uiConfig?.sso_configured && <SsoEnabledNotice />}
      </TooltipProvider>
    </LoginFrame>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
