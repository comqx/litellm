import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { modelPatchUpdateCall } from "./networking";
import { toast } from "@/lib/toast";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Alert, AlertTitle } from "@/components/shared/Alert";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";

const updateCredentialsSchema = z.object({
  api_key: z.string().min(1, "请输入新的 API 密钥"),
});

type UpdateCredentialsValues = z.infer<typeof updateCredentialsSchema>;

const EMPTY_VALUES: UpdateCredentialsValues = { api_key: "" };

interface UpdateModelCredentialsModalProps {
  open: boolean;
  onCancel: () => void;
  accessToken: string;
  modelId: string;
  onUpdated: () => void;
}

export default function UpdateModelCredentialsModal({
  open,
  onCancel,
  accessToken,
  modelId,
  onUpdated,
}: UpdateModelCredentialsModalProps) {
  const form = useZodForm(updateCredentialsSchema, { defaultValues: EMPTY_VALUES });
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    form.reset(EMPTY_VALUES);
    onCancel();
  };

  const handleSubmit = async (values: UpdateCredentialsValues) => {
    const apiKey = values.api_key?.trim();
    if (!apiKey) {
      toast.fromError("请输入新的 API 密钥");
      return;
    }
    setIsSaving(true);
    try {
      await modelPatchUpdateCall(
        accessToken,
        { litellm_params: { api_key: apiKey }, model_info: { id: modelId } },
        modelId,
      );
      toast.success("API 密钥已更新");
      form.reset(EMPTY_VALUES);
      onUpdated();
      onCancel();
    } catch (error) {
      console.error("Error updating API key:", error);
      toast.fromError("更新 API 密钥失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>更新 API 密钥</DialogTitle>
        </DialogHeader>
        <span className="block mb-4 text-sm text-muted-foreground">
          更新此模型的 API 密钥。只会提交新密钥，其余部署配置保持不变。
        </span>
        <Alert variant="warning" className="mb-4">
          <TriangleAlert />
          <AlertTitle>
            这里只轮换 API 密钥。使用 Azure AD 令牌、AWS 凭证或 Vertex 服务账号 JSON 认证的模型暂不支持，请先在该模型的 LiteLLM 参数里修改。
          </AlertTitle>
        </Alert>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <FormField control={form.control} name="api_key" label="新 API 密钥">
              {({ ref, ...field }) => (
                <PasswordInput {...field} ref={ref} placeholder="填写新的 API 密钥" autoComplete="new-password" />
              )}
            </FormField>
          </FieldGroup>
          <div className="flex justify-end items-center mt-4 gap-2.5">
            <Button type="button" variant="outline" onClick={close}>
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <UiLoadingSpinner className="size-4" />}
              更新 API 密钥
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
