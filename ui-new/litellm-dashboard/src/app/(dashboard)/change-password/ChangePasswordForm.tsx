"use client";

import React, { useState } from "react";
import { CircleAlert } from "lucide-react";
import { z } from "zod";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { Alert, AlertTitle } from "@/components/shared/Alert";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { changePasswordCall, getProxyBaseUrl } from "@/components/networking";
import { extractProxyErrorMessage } from "@/lib/http/client";
import { useZodForm } from "@/lib/forms/useZodForm";
import { toast } from "@/lib/toast";
import { revokeSessionAndClearClientState } from "@/app/(dashboard)/hooks/useLogout";
import { getLoginUrl } from "@/utils/returnUrlUtils";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(1, "请输入新密码"),
    confirmNewPassword: z.string().min(1, "请确认新密码"),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmNewPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { accessToken, passwordResetRequired } = useAuthorized();
  const form = useZodForm(changePasswordSchema, {
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });
  const [isPending, setIsPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (values: ChangePasswordValues) => {
    if (!accessToken) return;
    setSubmitError(null);
    setIsPending(true);
    try {
      await changePasswordCall(accessToken, values.currentPassword, values.newPassword);
      if (passwordResetRequired) {
        // The session key was minted restricted; only a fresh login lifts it.
        // Revoke it server-side too (best-effort) so it doesn't sit valid
        // until the expiry reaper gets to it.
        toast.success("密码已更新，请使用新密码重新登录。");
        await revokeSessionAndClearClientState(accessToken);
        window.location.replace(getLoginUrl(getProxyBaseUrl()));
        return;
      }
      toast.success("密码已更新");
      form.reset();
    } catch (error) {
      setSubmitError(extractProxyErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <Card>
        <CardContent>
          <h3 className="text-2xl font-semibold text-foreground">修改密码</h3>
          <p className="text-sm text-muted-foreground">
            Enter your current password and choose a new one. The new password must meet this proxy&apos;s password
            policy.
          </p>

          {passwordResetRequired && (
            <Alert variant="warning" className="mt-4">
              <CircleAlert />
              <AlertTitle>
                Your password must be changed before you can use the dashboard: it was either found in a known data
                breach or set by an administrator as a temporary password. After updating it, you will be signed out to
                log in again.
              </AlertTitle>
            </Alert>
          )}

          <form className="mb-2 mt-8" onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup>
              <FormField control={form.control} name="currentPassword" label="当前密码">
                {({ ref, ...field }) => <PasswordInput {...field} ref={ref} autoComplete="current-password" />}
              </FormField>

              <FormField control={form.control} name="newPassword" label="新密码">
                {({ ref, ...field }) => <PasswordInput {...field} ref={ref} autoComplete="new-password" />}
              </FormField>

              <FormField control={form.control} name="confirmNewPassword" label="确认新密码">
                {({ ref, ...field }) => <PasswordInput {...field} ref={ref} autoComplete="new-password" />}
              </FormField>
            </FieldGroup>

            {submitError && (
              <Alert variant="error" className="mt-6">
                <CircleAlert />
                <AlertTitle>{submitError}</AlertTitle>
              </Alert>
            )}

            <div className="mt-8">
              <Button type="submit" disabled={isPending}>
                {isPending && <UiLoadingSpinner className="size-4" role="img" aria-label="加载中" />}
                修改密码
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangePasswordForm;
