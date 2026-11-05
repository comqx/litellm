"use client";

import {
  useMCPToolSearchSettings,
  useUpdateMCPToolSearchSettings,
} from "@/app/(dashboard)/hooks/mcpToolSearchSettings/useMCPToolSearchSettings";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleHelp, Info, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { fetchAvailableModels, ModelGroup } from "@/components/llm_calls/fetch_models";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import {
  DEFAULT_FORM_VALUES,
  TOP_K_MAX,
  TOP_K_MIN,
  clampTopK,
  formToPayload,
  storedValuesToForm,
  ToolSearchFormValues,
} from "./toolSearchForm";

interface MCPToolSearchSettingsProps {
  accessToken: string | null;
}

const SIMILARITY_THRESHOLD_MARKS = [0, 0.3, 0.5, 0.7, 1];

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

export default function MCPToolSearchSettings({ accessToken }: MCPToolSearchSettingsProps) {
  const { data, isLoading, isError, error } = useMCPToolSearchSettings();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateMCPToolSearchSettings();
  const form = useForm<ToolSearchFormValues>({ defaultValues: DEFAULT_FORM_VALUES });
  const isDirty = form.formState.isDirty;
  const [embeddingModels, setEmbeddingModels] = useState<ModelGroup[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const storedValues = data?.values;

  useEffect(() => {
    if (!accessToken) return;
    fetchAvailableModels(accessToken)
      .then((models) => setEmbeddingModels(models.filter((model) => model.mode === "embedding")))
      .catch((fetchError: unknown) => console.error("Error fetching embedding models:", fetchError))
      .finally(() => setLoadingModels(false));
  }, [accessToken]);

  useEffect(() => {
    if (!storedValues) return;
    form.reset(storedValuesToForm(storedValues));
  }, [storedValues, form]);

  const handleSave = (formValues: ToolSearchFormValues) => {
    updateSettings(formToPayload(formValues), {
      onSuccess: () => {
        form.reset(formValues);
        toast.success("设置已更新，约 10 秒内将在所有 Pod 上生效。");
      },
      onError: (saveError) => toast.fromError(saveError),
    });
  };

  if (!accessToken) {
    return <div className="p-6 text-center text-muted-foreground">请登录后配置 MCP 工具搜索。</div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="error" className="mb-6">
        <AlertTitle>无法加载 MCP 工具搜索设置</AlertTitle>
        {error instanceof Error && <AlertDescription>{error.message}</AlertDescription>}
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <Alert variant="info" className="mb-6">
        <Info />
        <AlertTitle>原生 MCP 工具搜索</AlertTitle>
        <AlertDescription>
          Controls the <code>mcp_tool_search</code> virtual tool that native MCP clients call to discover tools. With an
          embedding model set, tools are ranked by the meaning of their name and description, so a query like
          &quot;FX&quot; finds a &quot;foreign exchange rates&quot; tool. Without one, keyword matching is used. Callers
          only ever see tools their key, team and server permissions already allow.
        </AlertDescription>
      </Alert>

      <TooltipProvider>
        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <Card className="mb-4">
            <CardHeader className="border-b">
              <CardTitle>排序</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="embedding_model"
                  label={labelWithHint(
                    "嵌入模型",
                    "从模型列表中选择用于按语义排序工具的嵌入模型。清空则回退为关键词匹配。",
                  )}
                >
                  {({ value, onChange, id }) => (
                    <SearchSelect
                      inputId={id}
                      options={embeddingModels.map((model) => ({ label: model.model_group, value: model.model_group }))}
                      value={value}
                      onValueChange={onChange}
                      allowClear
                      placeholder={loadingModels ? "正在加载模型…" : "关键词匹配（无嵌入模型）"}
                      emptyText={loadingModels ? "Loading..." : "无可用 Embedding 模型"}
                      disabled={isUpdating || loadingModels}
                    />
                  )}
                </FormField>

                <FormField
                  control={form.control}
                  name="top_k"
                  label={labelWithHint(
                    "Top K 结果",
                    "搜索返回的排序工具数量上限。工具调用中更小的 top_k 优先。核心工具不计入。",
                  )}
                >
                  {({ ref, value, onChange, onBlur, id }) => (
                    <Input
                      id={id}
                      ref={ref}
                      type="number"
                      min={TOP_K_MIN}
                      max={TOP_K_MAX}
                      value={value}
                      onChange={(event) => onChange(event.target.valueAsNumber)}
                      onBlur={() => {
                        onChange(Number.isNaN(value) ? DEFAULT_FORM_VALUES.top_k : clampTopK(value));
                        onBlur();
                      }}
                      disabled={isUpdating}
                    />
                  )}
                </FormField>

                <FormField
                  control={form.control}
                  name="similarity_threshold"
                  label={labelWithHint(
                    "相似度阈值",
                    "工具出现在语义搜索结果中的最低余弦相似度。0 表示不设下限。",
                  )}
                >
                  {({ value, onChange, id }) => (
                    <div className="w-full">
                      <Slider
                        id={id}
                        min={0}
                        max={1}
                        step={0.05}
                        value={[value]}
                        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
                        disabled={isUpdating}
                      />
                      <div className="relative mt-2 h-4 text-xs text-muted-foreground">
                        {SIMILARITY_THRESHOLD_MARKS.map((mark) => (
                          <span key={mark} className="absolute -translate-x-1/2" style={{ left: `${mark * 100}%` }}>
                            {mark.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </FormField>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="border-b">
              <CardTitle>核心工具</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="core_tools_text"
                  label={labelWithHint(
                    "始终优先返回",
                    "每行一个工具名，例如 my_server-get_rates。调用方有权使用时，会排在排序结果之前。",
                  )}
                >
                  {({ ref, value, onChange, onBlur, id }) => (
                    <Textarea
                      id={id}
                      ref={ref}
                      value={value}
                      placeholder={"my_server-get_rates\nmy_server-list_accounts"}
                      onChange={(event) => onChange(event.target.value)}
                      onBlur={onBlur}
                      disabled={isUpdating}
                    />
                  )}
                </FormField>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => void form.handleSubmit(handleSave)()}
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? <UiLoadingSpinner className="size-4" /> : <Save />}
              保存设置
            </Button>
          </div>
        </form>
      </TooltipProvider>
    </div>
  );
}
