import { isAdminRole } from "@/utils/roles";
import { useQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/molecules/logo/Logo";
import { toast } from "@/lib/toast";
import { createSearchTool, fetchAvailableSearchProviders } from "@/components/networking";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";
import SearchConnectionTest from "./SearchConnectionTest";
import { buildSearchToolPayload } from "./searchToolPayload";
import { AvailableSearchProvider, SearchTool } from "./types";
import bingLogo from "../../../../../public/assets/logos/bing.png";
import dataforseoLogo from "../../../../../public/assets/logos/dataforseo.png";
import exaAiLogo from "../../../../../public/assets/logos/exa_ai.png";
import googlePseLogo from "../../../../../public/assets/logos/google_pse.png";
import nimbleLogo from "../../../../../public/assets/logos/nimble.png";
import parallelAiLogo from "../../../../../public/assets/logos/parallel_ai.png";
import perplexityLogo from "../../../../../public/assets/logos/perplexity.png";
import tavilyLogo from "../../../../../public/assets/logos/tavily.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const searchProviderLogoMap: Record<string, string> = {
  perplexity: perplexityLogo.src,
  tavily: tavilyLogo.src,
  parallel_ai: parallelAiLogo.src,
  exa_ai: exaAiLogo.src,
  google_pse: googlePseLogo.src,
  dataforseo: dataforseoLogo.src,
  nimble: nimbleLogo.src,
  bing_grounding: bingLogo.src,
};

interface SearchProviderLabelProps {
  providerName: string;
  displayName: string;
}

export const SearchProviderLabel: React.FC<SearchProviderLabelProps> = ({ providerName, displayName }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <Logo src={searchProviderLogoMap[providerName]} label={displayName} className="w-5 h-5 object-contain" />
    <span>{displayName}</span>
  </div>
);

const createSearchToolShape = {
  search_tool_name: z
    .string()
    .min(1, "请输入 Search Tool 名称")
    .regex(/^[a-zA-Z0-9_-]+$/, "名称只能包含字母、数字、连字符和下划线"),
  search_provider: z
    .string()
    .nullable()
    .pipe(z.string({ error: "请选择搜索 Provider" }).min(1, "请选择搜索 Provider")),
  api_key: z.string().optional(),
  description: z.string().optional(),
};

const createSearchToolSchema = z.object(createSearchToolShape);

type CreateSearchToolFormValues = z.infer<typeof createSearchToolSchema>;

const EMPTY_VALUES: z.input<typeof createSearchToolSchema> = { search_tool_name: "", search_provider: null };

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

interface CreateSearchToolProps {
  userRole: string;
  accessToken: string | null;
  onCreateSuccess: (newSearchTool: SearchTool) => void;
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
}

const CreateSearchTool: React.FC<CreateSearchToolProps> = ({
  userRole,
  accessToken,
  onCreateSuccess,
  isModalVisible,
  setModalVisible,
}) => {
  const form = useZodForm(createSearchToolSchema, { defaultValues: EMPTY_VALUES });
  const [isLoading, setIsLoading] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestId, setConnectionTestId] = useState<string>("");
  const [watchedProvider, watchedApiKey] = useWatch({
    control: form.control,
    name: ["search_provider", "api_key"],
  });

  const { data: providersResponse, isLoading: isLoadingProviders } = useQuery({
    queryKey: ["searchProviders"],
    queryFn: () => {
      if (!accessToken) throw new Error("需要 Access Token");
      return fetchAvailableSearchProviders(accessToken);
    },
    enabled: !!accessToken && isModalVisible,
  }) as { data: { providers: AvailableSearchProvider[] }; isLoading: boolean };

  const availableProviders = providersResponse?.providers;
  const providerNames = useMemo(
    () => (availableProviders ?? []).map((provider) => provider.provider_name),
    [availableProviders],
  );
  const providerLabel = useCallback(
    (providerName: string) =>
      (availableProviders ?? []).find((provider) => provider.provider_name === providerName)?.ui_friendly_name ??
      providerName,
    [availableProviders],
  );

  const handleCreate = async (formValues: CreateSearchToolFormValues) => {
    setIsLoading(true);
    try {
      const payload = buildSearchToolPayload(formValues);

      if (accessToken != null) {
        const response = await createSearchTool(accessToken, payload);

        toast.success("Search Tool 创建成功");
        form.reset(EMPTY_VALUES);
        setModalVisible(false);
        onCreateSuccess(response);
      }
    } catch (error) {
      toast.error("创建 Search Tool 出错：" + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset(EMPTY_VALUES);
    setModalVisible(false);
  };

  const handleTestConnection = async () => {
    const isValid = await form.trigger(["search_provider", "api_key"]);
    if (!isValid) {
      toast.error("请先填写搜索 Provider 和 API Key 再测试");
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestId(`test-${Date.now()}`);
    setIsTestModalVisible(true);
  };

  if (!isAdminRole(userRole)) {
    return null;
  }

  return (
    <Dialog open={isModalVisible} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="top-8 max-h-[calc(100dvh-4rem)] translate-y-0 overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <div className="flex items-center space-x-3 pb-4 border-b border-border">
            <span className="text-2xl">🔍</span>
            <DialogTitle className="text-xl font-semibold text-foreground">添加新 Search Tool</DialogTitle>
          </div>
        </DialogHeader>
        <div className="mt-6">
          <TooltipProvider>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="search_tool_name"
                  label={labelWithHint(
                    "Search Tool 名称",
                    "用于标识此 Search Tool 配置的唯一名称（如 'perplexity-search'、'tavily-news-search'）。",
                  )}
                >
                  {({ ref, ...field }) => (
                    <Input
                      {...field}
                      ref={ref}
                      placeholder="例如 perplexity-search、my-tavily-tool"
                      className="rounded-lg"
                    />
                  )}
                </FormField>

                <FormField
                  control={form.control}
                  name="search_provider"
                  label={labelWithHint(
                    "搜索 Provider",
                    "选择要使用的搜索 Provider。每个 Provider 的能力和定价不同。",
                  )}
                >
                  {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                    <Combobox
                      items={providerNames}
                      itemToStringLabel={providerLabel}
                      value={value}
                      onValueChange={onChange}
                    >
                      <ComboboxInput
                        id={id}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedBy}
                        placeholder="选择搜索 Provider"
                        className="h-10 w-full rounded-lg"
                        disabled={isLoadingProviders}
                        showClear={value != null && value !== ""}
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>没有匹配的搜索 Provider</ComboboxEmpty>
                        <ComboboxList>
                          {(providerName: string) => (
                            <ComboboxItem key={providerName} value={providerName}>
                              <SearchProviderLabel
                                providerName={providerName}
                                displayName={providerLabel(providerName)}
                              />
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                </FormField>

                <FormField
                  control={form.control}
                  name="api_key"
                  label={labelWithHint(
                    "API Key",
                    "用于搜索 Provider 认证的 API Key。将被安全存储。",
                  )}
                >
                  {({ ref, value, ...field }) => (
                    <PasswordInput
                      {...field}
                      ref={ref}
                      value={value ?? ""}
                      placeholder="输入你的 API Key"
                      groupClassName="h-10 rounded-lg"
                    />
                  )}
                </FormField>

                <FormField control={form.control} name="description" label="描述（可选）">
                  {({ ref, value, ...field }) => (
                    <Textarea
                      {...field}
                      ref={ref}
                      value={value ?? ""}
                      rows={3}
                      placeholder="简要描述此 Search Tool 的用途"
                      className="rounded-lg"
                    />
                  )}
                </FormField>
              </FieldGroup>

              <div className="flex justify-between items-center pt-6 border-t border-border">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <a
                        className="text-sm text-info hover:underline"
                        href="https://github.com/BerriAI/litellm/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        需要帮助？
                      </a>
                    }
                  />
                  <TooltipContent>在我们的 GitHub 上获取帮助</TooltipContent>
                </Tooltip>
                <div className="flex gap-2">
                  <Button type="submit" variant="outline" onClick={handleTestConnection} disabled={isTestingConnection}>
                    {isTestingConnection && <UiLoadingSpinner className="size-4" />}
                    测试连接
                  </Button>
                  <Button type="submit" variant="outline" disabled={isLoading}>
                    {isLoading && <UiLoadingSpinner className="size-4" />}
                    添加 Search Tool
                  </Button>
                </div>
              </div>
            </form>
          </TooltipProvider>
        </div>

        <Dialog
          open={isTestModalVisible}
          onOpenChange={(open) => {
            if (!open) {
              setIsTestModalVisible(false);
              setIsTestingConnection(false);
            }
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>连接测试结果</DialogTitle>
            </DialogHeader>
            {isTestModalVisible && accessToken && (
              <SearchConnectionTest
                key={connectionTestId}
                litellmParams={{
                  search_provider: watchedProvider ?? undefined,
                  api_key: watchedApiKey,
                  api_base: undefined,
                }}
                accessToken={accessToken}
                onTestComplete={() => setIsTestingConnection(false)}
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTestModalVisible(false);
                  setIsTestingConnection(false);
                }}
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSearchTool;
