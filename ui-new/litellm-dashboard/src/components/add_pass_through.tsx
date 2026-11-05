"use client";

import React, { useState } from "react";
import { CircleHelp, Info, Plug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { createPassThroughEndpoint } from "./networking";
import NumericalInput from "./shared/numerical_input";
import KeyValueInput, { type KeyValuePair } from "./key_value_input";
import QueryParamInput from "./query_param_input";
import { passThroughItem } from "./PassThroughSettings/PassThroughSettings";
import RoutePreview from "./route_preview";
import { toast } from "@/lib/toast";
import PassThroughSecuritySection from "./common_components/PassThroughSecuritySection";
import PassThroughGuardrailsSection from "./common_components/PassThroughGuardrailsSection";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useZodForm } from "@/lib/forms/useZodForm";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const HTTP_METHOD_OPTIONS = HTTP_METHODS.map((method) => ({ label: method, value: method }));

type GuardrailSettings = Record<string, { request_fields?: string[]; response_fields?: string[] } | null>;

const keyValuePairsSchema = z.array(z.tuple([z.string(), z.string()]));

const passThroughFormSchema = z.object({
  path: z.string().min(1, "请填写路径").regex(/^\//, "路径必须以 / 开头"),
  target: z
    .string()
    .min(1, "请填写目标 URL")
    .pipe(z.url({ error: "请输入有效的 URL" })),
  methods: z.array(z.string()).optional(),
  include_subpath: z.boolean(),
  headers: keyValuePairsSchema.refine((pairs) => pairs.some(([name]) => name !== ""), {
    error: "请配置请求头",
  }),
  default_query_params: keyValuePairsSchema.optional(),
  auth: z.boolean().optional(),
  timeout: z.string().optional(),
  cost_per_request: z.string().optional(),
});

type PassThroughFormValues = z.output<typeof passThroughFormSchema>;

const emptyFormValues = {
  path: "",
  target: "",
  methods: undefined,
  include_subpath: true,
  headers: [],
  default_query_params: undefined,
  auth: undefined,
  timeout: undefined,
  cost_per_request: undefined,
} as unknown as PassThroughFormValues;

const labelWithHint = (label: React.ReactNode, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

const optionalText = (raw: string): string | undefined => (raw === "" ? undefined : raw);

const toRecord = (pairs: readonly KeyValuePair[]): Record<string, string> =>
  Object.fromEntries(pairs.filter(([name]) => name !== ""));

const optionalRecord = (pairs: readonly KeyValuePair[] | undefined): Record<string, string> | undefined => {
  const record = toRecord(pairs ?? []);
  return Object.keys(record).length > 0 ? record : undefined;
};

interface AddFallbacksProps {
  accessToken: string;
  passThroughItems: passThroughItem[];
  setPassThroughItems: React.Dispatch<React.SetStateAction<passThroughItem[]>>;
  premiumUser?: boolean;
}

const AddPassThroughEndpoint: React.FC<AddFallbacksProps> = ({
  accessToken,
  setPassThroughItems,
  passThroughItems,
  premiumUser = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [guardrails, setGuardrails] = useState<GuardrailSettings>({});
  const form = useZodForm(passThroughFormSchema, { defaultValues: emptyFormValues });

  const pathValue = useWatch({ control: form.control, name: "path" });
  const targetValue = useWatch({ control: form.control, name: "target" });
  const includeSubpath = useWatch({ control: form.control, name: "include_subpath" });
  const selectedMethods = useWatch({ control: form.control, name: "methods" }) ?? [];

  const handleCancel = () => {
    form.reset(emptyFormValues);
    setGuardrails({});
    setIsModalVisible(false);
  };

  const addPassThrough = async (values: PassThroughFormValues) => {
    setIsLoading(true);
    try {
      const formValues = {
        path: values.path,
        target: values.target,
        methods: values.methods,
        include_subpath: values.include_subpath,
        headers: toRecord(values.headers),
        default_query_params: optionalRecord(values.default_query_params),
        ...(premiumUser ? { auth: values.auth } : {}),
        timeout: values.timeout,
        cost_per_request: values.cost_per_request,
        ...(Object.keys(guardrails).length > 0 ? { guardrails } : {}),
      };

      const response = await createPassThroughEndpoint(accessToken, formValues);
      const createdEndpoint = response.endpoints[0];

      setPassThroughItems([...passThroughItems, createdEndpoint]);

      toast.success("透传端点创建成功");
      form.reset(emptyFormValues);
      setGuardrails({});
      setIsModalVisible(false);
    } catch (error) {
      toast.fromError("创建透传端点失败：" + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div>
        <Button className="mx-auto mb-4 mt-4" onClick={() => setIsModalVisible(true)}>
          + 添加透传端点
        </Button>
        <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="top-8 max-h-[calc(100dvh-4rem)] translate-y-0 overflow-y-auto sm:max-w-[1000px]">
            <DialogHeader>
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <Plug className="size-5 text-info" />
                <DialogTitle className="text-xl font-semibold text-foreground">添加透传端点</DialogTitle>
              </div>
            </DialogHeader>
            <div className="mt-6">
              <Alert variant="info" className="mb-6">
                <Info />
                <AlertTitle>什么是透传端点？</AlertTitle>
                <AlertDescription>
                  将 LiteLLM 代理上的请求转发到任意外部 API。适用于自定义模型、图像生成 API，或任何希望通过 LiteLLM 代理的服务。
                </AlertDescription>
              </Alert>

              <form onSubmit={form.handleSubmit(addPassThrough)} className="space-y-6">
                <Card className="block p-5">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">路由配置</h3>
                  <p className="mb-5 text-sm text-muted-foreground">
                    配置发往你域名的请求如何转发到目标 API
                  </p>

                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="path"
                      label="路径前缀"
                      description="示例：/bria、/adobe-photoshop、/elasticsearch"
                    >
                      {({ value, onChange, ...field }) => (
                        <Input
                          {...field}
                          placeholder="bria"
                          value={value ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            onChange(raw && !raw.startsWith("/") ? "/" + raw : raw);
                          }}
                        />
                      )}
                    </FormField>

                    <FormField
                      control={form.control}
                      name="target"
                      label="目标 URL"
                      description="示例：https://engine.prod.bria-api.com"
                    >
                      {({ value, ...field }) => (
                        <Input {...field} placeholder="https://engine.prod.bria-api.com" value={value ?? ""} />
                      )}
                    </FormField>

                    <FormField
                      control={form.control}
                      name="methods"
                      label={labelWithHint(
                        "HTTP 方法（可选）",
                        "选择特定 HTTP 方法。留空则支持全部方法（GET、POST、PUT、DELETE、PATCH）。同一路径对不同方法需要不同目标时很有用。",
                      )}
                      description={
                        selectedMethods.length === 0
                          ? "支持全部 HTTP 方法（默认）"
                          : `仅 ${selectedMethods.join("、")} 请求会路由到此端点`
                      }
                    >
                      {({ value, onChange, ref: _ref, ...field }) => (
                        <Select multiple items={HTTP_METHOD_OPTIONS} value={value ?? []} onValueChange={onChange}>
                          <SelectTrigger {...field} className="w-full">
                            <SelectValue placeholder="选择方法（留空表示全部）">
                              {(selected: string[]) =>
                                selected.length === 0 ? "选择方法（留空表示全部）" : selected.join(", ")
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {HTTP_METHODS.map((method) => (
                              <SelectItem key={method} value={method} title={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">包含子路径</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          将所有子路径转发到目标 API（REST API 推荐开启）
                        </div>
                      </div>
                      <FormField control={form.control} name="include_subpath">
                        {({ value, onChange, ref: _ref, ...field }) => (
                          <Switch {...field} checked={value} onCheckedChange={onChange} />
                        )}
                      </FormField>
                    </div>
                  </div>
                </Card>

                <RoutePreview pathValue={pathValue} targetValue={targetValue} includeSubpath={includeSubpath} />

                <Card className="block p-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">请求头</h3>
                  <p className="mb-6 text-sm text-muted-foreground">添加到发往目标 API 的每个请求中的 Header</p>

                  <FormField
                    control={form.control}
                    name="headers"
                    label={labelWithHint("认证请求头", "随请求转发的认证及其他 Header")}
                    description={
                      <>
                        <span className="mb-1 block font-medium">添加认证令牌及其他必需 Header</span>
                        <span className="block">常见示例：auth_token、Authorization、x-api-key</span>
                      </>
                    }
                  >
                    {({ value, onChange }) => <KeyValueInput value={value} onChange={onChange} />}
                  </FormField>
                </Card>

                <Card className="block p-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">默认查询参数</h3>
                  <p className="mb-6 text-sm text-muted-foreground">自动附加到发往目标 API 的每个请求的查询参数</p>

                  <FormField
                    control={form.control}
                    name="default_query_params"
                    label={labelWithHint(
                      "默认查询参数（可选）",
                      "将添加到所有请求的查询参数。客户端传入的值会覆盖默认值。",
                    )}
                    description={
                      <>
                        <span className="mb-1 block font-medium">随所有 GET、POST、PUT、PATCH 请求发送</span>
                        <span className="block">
                          客户端参数覆盖默认值。示例：version=v1、format=json、key=default
                        </span>
                      </>
                    }
                  >
                    {({ value, onChange }) => <QueryParamInput value={value} onChange={onChange} />}
                  </FormField>
                </Card>

                <FormField control={form.control} name="auth">
                  {({ value, onChange }) => (
                    <PassThroughSecuritySection
                      premiumUser={premiumUser}
                      authEnabled={value ?? false}
                      onAuthChange={onChange}
                    />
                  )}
                </FormField>

                <PassThroughGuardrailsSection accessToken={accessToken} value={guardrails} onChange={setGuardrails} />

                <Card className="block p-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">性能</h3>
                  <p className="mb-6 text-sm text-muted-foreground">配置此端点的上游请求超时</p>

                  <FormField
                    control={form.control}
                    name="timeout"
                    label={labelWithHint(
                      "请求超时（秒）",
                      "等待上游 API 响应的最长时间。留空则使用 general_settings.pass_through_request_timeout（默认 600 秒）。",
                    )}
                    description="上游较慢时可提高该值（例如长耗时 LLM 调用可设为 1200）"
                  >
                    {({ value, onChange, ref: _ref, ...field }) => (
                      <NumericalInput
                        {...field}
                        min={1}
                        step={1}
                        placeholder="600"
                        value={value ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          onChange(optionalText(event.target.value))
                        }
                      />
                    )}
                  </FormField>
                </Card>

                <Card className="block p-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">计费</h3>
                  <p className="mb-6 text-sm text-muted-foreground">可选：为此端点跟踪请求成本</p>

                  <FormField
                    control={form.control}
                    name="cost_per_request"
                    label={labelWithHint(
                      "单次请求成本 (USD)",
                      "可选：记录发往此端点的每次请求成本",
                    )}
                    description="每次请求到此端点所记的费用"
                  >
                    {({ value, onChange, ref: _ref, ...field }) => (
                      <NumericalInput
                        {...field}
                        min={0}
                        step={0.001}
                        placeholder="2.0000"
                        value={value ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          onChange(optionalText(event.target.value))
                        }
                      />
                    )}
                  </FormField>
                </Card>

                <div className="flex items-center justify-end space-x-3 border-t border-border pt-6">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    取消
                  </Button>
                  <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading && <UiLoadingSpinner className="size-4" />}
                    {isLoading ? "创建中…" : "添加透传端点"}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AddPassThroughEndpoint;
