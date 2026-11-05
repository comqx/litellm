import React from "react";
import { CircleAlert, Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { MCPServer, MCPUserEnvVarsStatus, MCPUserEnvVarSpec } from "@/components/mcp_tools/types";
import { clearMCPUserEnvVars, getMCPUserEnvVars, storeMCPUserEnvVars } from "@/components/networking";
import { toast } from "@/lib/toast";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Alert, AlertTitle } from "@/components/shared/Alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/table_cells/status_badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";

interface UserEnvVarsModalProps {
  server: MCPServer | null;
  open: boolean;
  accessToken: string | null;
  onClose: () => void;
  onSaved?: (status: MCPUserEnvVarsStatus) => void;
}

interface UserEnvVarsFormProps {
  required: readonly MCPUserEnvVarSpec[];
  isSaving: boolean;
  onCancel: () => void;
  onClear?: () => void;
  onSubmit: (values: Record<string, string>) => void;
}

const buildSchema = (required: readonly MCPUserEnvVarSpec[]) =>
  z.object(
    Object.fromEntries(
      required.map((spec) => [spec.name, spec.is_set ? z.string() : z.string().min(1, `${spec.name} 为必填项`)]),
    ),
  );

const emptyValues = (required: readonly MCPUserEnvVarSpec[]): Record<string, string> =>
  Object.fromEntries(required.map((spec) => [spec.name, ""]));

const UserEnvVarsForm: React.FC<UserEnvVarsFormProps> = ({ required, isSaving, onCancel, onClear, onSubmit }) => {
  const form = useZodForm(buildSchema(required), { defaultValues: emptyValues(required) });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {required.map((spec) => (
          <FormField
            key={spec.name}
            control={form.control}
            name={spec.name}
            description={spec.description || undefined}
            label={
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{spec.name}</span>
                {spec.is_set && <Badge variant="secondary">已设置</Badge>}
              </span>
            }
          >
            {(field) => (
              <PasswordInput
                {...field}
                disabled={isSaving}
                placeholder={
                  spec.is_set ? "输入新值以覆盖" : spec.description || `输入你的 ${spec.name}`
                }
              />
            )}
          </FormField>
        ))}
      </FieldGroup>
      <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-2">
        {onClear && (
          <Button type="button" variant="destructive" className="mr-auto" onClick={onClear} disabled={isSaving}>
            清除
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <UiLoadingSpinner className="mr-2 size-4" />}
          保存凭据
        </Button>
      </div>
    </form>
  );
};

/**
 * User-facing modal for filling in per-user MCP environment variables.
 *
 * Backed by GET / POST ``/v1/mcp/server/{id}/user-env-vars``. Each field
 * the admin marked as ``scope=user`` shows up with the admin-supplied
 * description as the placeholder.
 */
const UserEnvVarsModal: React.FC<UserEnvVarsModalProps> = ({ server, open, accessToken, onClose, onSaved }) => {
  const queryClient = useQueryClient();
  const [confirmingClear, setConfirmingClear] = React.useState(false);
  const close = () => {
    setConfirmingClear(false);
    onClose();
  };
  const queryKey = ["mcpUserEnvVars", server?.server_id];
  const {
    data: status,
    isLoading,
    isError,
  } = useQuery<MCPUserEnvVarsStatus>({
    queryKey,
    queryFn: () => getMCPUserEnvVars(accessToken!, server!.server_id),
    enabled: open && !!server && !!accessToken,
  });

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, string>) => storeMCPUserEnvVars(accessToken!, server!.server_id, values),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
      toast.success("凭据已保存");
      onSaved?.(saved);
      close();
    },
    onError: (err) => {
      toast.fromError(`保存环境变量失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearMCPUserEnvVars(accessToken!, server!.server_id),
    onSuccess: (cleared) => {
      queryClient.setQueryData(queryKey, cleared);
      toast.success("凭据已清除");
      onSaved?.(cleared);
      close();
    },
    onError: (err) => {
      toast.fromError(`清除环境变量失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const handleSave = (values: Record<string, string>) => {
    if (!server || !accessToken) return;
    const trimmed: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      trimmed[k] = (v ?? "").trim();
    }
    saveMutation.mutate(trimmed);
  };

  const displayName = server?.server_name || server?.alias || server?.server_id || "MCP Server";
  const required = status?.required ?? [];
  const isSaving = saveMutation.isPending || clearMutation.isPending;
  const canClear = !!server && !!accessToken && required.some((spec) => spec.is_set);
  const confirmClear = () => {
    setConfirmingClear(false);
    clearMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(opened) => !opened && close()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold">设置你的凭据</DialogTitle>
            <StatusBadge tone="info" label="按用户" />
          </div>
          <span className="text-xs text-muted-foreground">{displayName}</span>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <UiLoadingSpinner className="size-5" />
            </div>
          ) : isError ? (
            <Alert variant="error">
              <CircleAlert />
              <AlertTitle>加载环境变量失败</AlertTitle>
            </Alert>
          ) : required.length === 0 ? (
            <Alert variant="info">
              <Info />
              <AlertTitle>此服务器未配置按用户字段。</AlertTitle>
            </Alert>
          ) : (
            <>
              <span className="block text-sm text-muted-foreground">
                这些值仅对你可见。管理员将此 MCP Server 配置为需要这些按用户凭据。
                credentials. Saved values are never shown back; leave an already-set field blank to keep it, or enter a
                已保存的值不会回显；已设置的字段留空则保留原值，输入新值即可设置或更改。
              </span>
              <UserEnvVarsForm
                required={required}
                isSaving={isSaving}
                onCancel={close}
                onClear={canClear ? () => setConfirmingClear(true) : undefined}
                onSubmit={handleSave}
              />
            </>
          )}
        </div>
        <AlertDialog open={confirmingClear} onOpenChange={(opened) => !opened && setConfirmingClear(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>清除已保存的凭据</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes every per-user value you saved for {displayName}. Your next MCP request to this server
                向此服务器发起的下一个 MCP 请求将失败。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setConfirmingClear(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmClear}>
                清除凭据
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default UserEnvVarsModal;
