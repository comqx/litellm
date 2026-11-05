import React, { useState, useEffect } from "react";
import { z } from "zod";
import { Policy, PolicyCreateRequest, PolicyUpdateRequest } from "@/components/policies/types";
import { Guardrail } from "@/components/guardrails/types";
import { getResolvedGuardrails, modelAvailableCall } from "@/components/networking";
import { toast } from "@/lib/toast";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/table_cells/status_badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";
import { CircleHelp, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";

interface AddPolicyFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenFlowBuilder: () => void;
  accessToken: string | null;
  editingPolicy?: Policy | null;
  existingPolicies: Policy[];
  availableGuardrails: Guardrail[];
  createPolicy: (accessToken: string, policyData: any) => Promise<any>;
  updatePolicy: (accessToken: string, policyId: string, policyData: any) => Promise<any>;
}

type ModelConditionType = "model" | "regex";

const policyShape = {
  policy_name: z
    .string()
    .min(1, "请输入 Policy 名称")
    .regex(/^[a-zA-Z0-9_-]+$/, "Policy 名称只能包含字母、数字、连字符和下划线"),
  description: z.string(),
  inherit: z.string().nullable(),
  guardrails_add: z.array(z.string()),
  guardrails_remove: z.array(z.string()),
  model_condition: z.string().nullable(),
};

const policySchema = z.object(policyShape);

type PolicyFormValues = z.infer<typeof policySchema>;

const EMPTY_VALUES: PolicyFormValues = {
  policy_name: "",
  description: "",
  inherit: null,
  guardrails_add: [],
  guardrails_remove: [],
  model_condition: null,
};

const toFormValues = (policy: Policy): PolicyFormValues => ({
  policy_name: policy.policy_name,
  description: policy.description ?? "",
  inherit: policy.inherit ?? null,
  guardrails_add: policy.guardrails_add || [],
  guardrails_remove: policy.guardrails_remove || [],
  model_condition: policy.condition?.model ?? null,
});

const buildPolicyRequest = (values: PolicyFormValues): PolicyCreateRequest | PolicyUpdateRequest => ({
  policy_name: values.policy_name,
  description: values.description || undefined,
  inherit: values.inherit || undefined,
  guardrails_add: values.guardrails_add,
  guardrails_remove: values.guardrails_remove,
  condition: values.model_condition ? { model: values.model_condition } : undefined,
});

const parentGuardrails = (policy: Policy, existingPolicies: Policy[]): string[] => {
  const inherited = policy.inherit
    ? (() => {
        const grandparent = existingPolicies.find((candidate) => candidate.policy_name === policy.inherit);
        return grandparent ? parentGuardrails(grandparent, existingPolicies) : [];
      })()
    : [];
  const resolved = new Set<string>([...inherited, ...(policy.guardrails_add ?? [])]);
  (policy.guardrails_remove ?? []).forEach((guardrail) => resolved.delete(guardrail));
  return Array.from(resolved);
};

const resolveGuardrails = (values: PolicyFormValues, existingPolicies: Policy[]): string[] => {
  const parentPolicy = values.inherit
    ? existingPolicies.find((policy) => policy.policy_name === values.inherit)
    : undefined;
  const resolved = new Set<string>([
    ...(parentPolicy ? parentGuardrails(parentPolicy, existingPolicies) : []),
    ...values.guardrails_add,
  ]);
  values.guardrails_remove.forEach((guardrail) => resolved.delete(guardrail));
  return Array.from(resolved).sort();
};

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

const SectionHeading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="text-sm font-semibold text-foreground">{label}</span>
    <Separator className="flex-1" />
  </div>
);

interface ModePickerProps {
  selected: "simple" | "flow_builder";
  onSelect: (mode: "simple" | "flow_builder") => void;
}

const modeCardClass = (isSelected: boolean) =>
  [
    "relative flex-1 cursor-pointer rounded-xl border-2 px-5 py-6 transition-all",
    isSelected ? "border-info bg-info/10" : "border-border bg-background",
  ].join(" ");

const modeIconClass = (isSelected: boolean) =>
  [
    "mb-4 flex size-10 items-center justify-center rounded-[10px]",
    isSelected ? "bg-info/15 text-info" : "bg-muted text-muted-foreground",
  ].join(" ");

const ModePicker: React.FC<ModePickerProps> = ({ selected, onSelect }) => (
  <div className="flex gap-4 py-2">
    <div onClick={() => onSelect("simple")} className={modeCardClass(selected === "simple")}>
      <div className={modeIconClass(selected === "simple")}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 7h8M8 12h8M8 17h5" />
        </svg>
      </div>
      <span className="mb-1 block text-[15px] font-semibold text-foreground">简单模式</span>
      <span className="block text-[13px] text-muted-foreground">从列表中选择护栏，全部并行运行。</span>
    </div>

    <div onClick={() => onSelect("flow_builder")} className={modeCardClass(selected === "flow_builder")}>
      <Badge variant="secondary" className="absolute top-3 right-3 text-[10px] font-semibold">
        新
      </Badge>
      <div className={modeIconClass(selected === "flow_builder")}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <span className="mb-1 block text-[15px] font-semibold text-foreground">流程构建器</span>
      <span className="block text-[13px] text-muted-foreground">定义步骤、条件和错误响应。</span>
    </div>
  </div>
);

const AddPolicyForm: React.FC<AddPolicyFormProps> = ({
  visible,
  onClose,
  onSuccess,
  onOpenFlowBuilder,
  accessToken,
  editingPolicy,
  existingPolicies,
  availableGuardrails,
  createPolicy,
  updatePolicy,
}) => {
  const form = useZodForm(policySchema, { defaultValues: EMPTY_VALUES });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedGuardrails, setResolvedGuardrails] = useState<string[]>([]);
  const [modelConditionType, setModelConditionType] = useState<ModelConditionType>("model");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [step, setStep] = useState<"pick_mode" | "simple_form">("pick_mode");
  const [selectedMode, setSelectedMode] = useState<"simple" | "flow_builder">("simple");
  const { userId, userRole } = useAuthorized();

  // Only consider it "editing" if editingPolicy has a policy_id (real existing policy)
  const isEditing = !!editingPolicy?.policy_id;

  useEffect(() => {
    if (visible && editingPolicy) {
      const modelCondition = editingPolicy.condition?.model;
      const isRegex = modelCondition && /[.*+?^${}()|[\]\\]/.test(modelCondition);
      setModelConditionType(isRegex ? "regex" : "model");

      form.reset(toFormValues(editingPolicy));

      if (editingPolicy.policy_id && accessToken) {
        loadResolvedGuardrails(editingPolicy.policy_id);
      }

      // If editing a pipeline policy, go directly to flow builder
      if (editingPolicy.pipeline) {
        onClose();
        onOpenFlowBuilder();
        return;
      }
      // If editing a simple policy, skip mode picker
      setStep("simple_form");
    } else if (visible) {
      form.reset(EMPTY_VALUES);
      setResolvedGuardrails([]);
      setModelConditionType("model");
      setSelectedMode("simple");
      setStep("pick_mode");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editingPolicy, form]);

  useEffect(() => {
    if (visible && accessToken) {
      loadAvailableModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accessToken]);

  const loadAvailableModels = async () => {
    if (!accessToken) return;
    try {
      const response = await modelAvailableCall(accessToken, userId, userRole);
      if (response?.data) {
        const models = response.data.map((m: any) => m.id || m.model_name).filter(Boolean);
        setAvailableModels(models);
      }
    } catch (error) {
      console.error("Failed to load available models:", error);
    }
  };

  const loadResolvedGuardrails = async (policyId: string) => {
    if (!accessToken) return;
    try {
      const data = await getResolvedGuardrails(accessToken, policyId);
      setResolvedGuardrails(data.resolved_guardrails || []);
    } catch (error) {
      console.error("Failed to load resolved guardrails:", error);
    }
  };

  const refreshResolvedGuardrails = (changed: Partial<PolicyFormValues>) => {
    setResolvedGuardrails(resolveGuardrails({ ...form.getValues(), ...changed }, existingPolicies));
  };

  const handleClose = () => {
    form.reset(EMPTY_VALUES);
    setStep("pick_mode");
    setSelectedMode("simple");
    onClose();
  };

  const handleModeConfirm = () => {
    if (selectedMode === "flow_builder") {
      onClose();
      onOpenFlowBuilder();
    } else {
      setStep("simple_form");
    }
  };

  const handleSubmit = async (values: PolicyFormValues) => {
    try {
      setIsSubmitting(true);

      if (!accessToken) {
        throw new Error("没有可用的访问 Token");
      }

      const data = buildPolicyRequest(values);

      if (isEditing && editingPolicy) {
        await updatePolicy(accessToken, editingPolicy.policy_id, data as PolicyUpdateRequest);
        toast.success("Policy 更新成功");
      } else {
        await createPolicy(accessToken, data as PolicyCreateRequest);
        toast.success("Policy 创建成功");
      }

      form.reset(EMPTY_VALUES);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save policy:", error);
      toast.fromError("保存 Policy 失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const guardrailOptions = availableGuardrails.map((g) => ({
    label: g.guardrail_name || g.guardrail_id,
    value: g.guardrail_name || g.guardrail_id,
  }));

  const policyOptions = existingPolicies
    .filter((p) => !editingPolicy || p.policy_id !== editingPolicy.policy_id)
    .map((p) => ({
      label: p.policy_name,
      value: p.policy_name,
    }));

  // ── Mode Picker Step ──────────────────────────────────────────────────────
  if (step === "pick_mode") {
    return (
      <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>新建 Policy</DialogTitle>
          </DialogHeader>
          <ModePicker selected={selectedMode} onSelect={setSelectedMode} />

          {selectedMode === "flow_builder" && (
            <Alert variant="info" className="mt-4 border border-info/20 bg-info/10">
              <AlertTitle>你将进入流程构建器，以可视化方式设计 Policy 逻辑。</AlertTitle>
            </Alert>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="button" onClick={handleModeConfirm}>
              {selectedMode === "flow_builder" ? "进入流程构建器" : "新建 Policy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Simple Form Step ──────────────────────────────────────────────────────
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑 Policy" : "新建 Policy"}</DialogTitle>
        </DialogHeader>
        <TooltipProvider>
          <form onSubmit={(event) => event.preventDefault()} noValidate>
            <FieldGroup>
              <FormField control={form.control} name="policy_name" label="Policy 名称">
                {({ ref, ...control }) => (
                  <Input
                    {...control}
                    ref={ref}
                    placeholder="例如：global-baseline、healthcare-compliance"
                    disabled={isEditing}
                  />
                )}
              </FormField>

              <FormField control={form.control} name="description" label="描述">
                {({ ref, ...control }) => (
                  <Textarea {...control} ref={ref} rows={2} placeholder="描述这个 Policy 的作用…" />
                )}
              </FormField>

              <SectionHeading label="继承" />

              <FormField
                control={form.control}
                name="inherit"
                label={labelWithHint(
                  "继承自",
                  "从另一个 Policy 继承 Guardrail。子 Policy 将包含父 Policy 的所有 Guardrail。",
                )}
              >
                {({ id, value, onChange }) => (
                  <SearchSelect
                    inputId={id}
                    options={policyOptions}
                    value={value}
                    onValueChange={(selected) => {
                      onChange(selected);
                      refreshResolvedGuardrails({ inherit: selected });
                    }}
                    placeholder="选择父 Policy（可选）"
                    className="h-9"
                  />
                )}
              </FormField>

              <SectionHeading label="护栏" />

              <FormField
                control={form.control}
                name="guardrails_add"
                label={labelWithHint(
                  "要添加的 Guardrail",
                  "这些 Guardrail 将应用于匹配此 Policy 的请求",
                )}
              >
                {({ value, onChange }) => (
                  <MultiSelect
                    options={guardrailOptions}
                    value={value}
                    onValueChange={(selected) => {
                      onChange(selected);
                      refreshResolvedGuardrails({ guardrails_add: selected });
                    }}
                    placeholder="选择要添加的护栏"
                  />
                )}
              </FormField>

              <FormField
                control={form.control}
                name="guardrails_remove"
                label={labelWithHint(
                  "要移除的 Guardrail",
                  "这些 Guardrail 将从继承来的 Guardrail 中移除",
                )}
              >
                {({ value, onChange }) => (
                  <MultiSelect
                    options={guardrailOptions}
                    value={value}
                    onValueChange={(selected) => {
                      onChange(selected);
                      refreshResolvedGuardrails({ guardrails_remove: selected });
                    }}
                    placeholder="选择要移除的护栏（从继承中）"
                  />
                )}
              </FormField>

              {resolvedGuardrails.length > 0 && (
                <Alert variant="info">
                  <Info />
                  <AlertTitle>解析后的 Guardrail</AlertTitle>
                  <AlertDescription>
                    <span className="mb-2 block text-muted-foreground">
                      以下为最终将生效的 Guardrail（含继承）：
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {resolvedGuardrails.map((g) => (
                        <StatusBadge key={g} tone="info" label={g} />
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <SectionHeading label="条件（可选）" />

              <Alert variant="info">
                <Info />
                <AlertTitle>Model 范围</AlertTitle>
                <AlertDescription>
                  默认情况下，此 Policy 会对所有 Model 生效。你可以在下方选择性地将其限制到特定 Model。
                </AlertDescription>
              </Alert>

              <div role="group" className="flex w-full flex-col gap-3">
                <span className="text-sm leading-snug font-medium text-foreground">Model 条件类型</span>
                <RadioGroup
                  value={modelConditionType}
                  onValueChange={(value) => {
                    setModelConditionType(value as ModelConditionType);
                    form.setValue("model_condition", "");
                  }}
                  className="flex flex-row gap-6"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="model" />
                    选择 Model
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value="regex" />
                    自定义正则表达式
                  </label>
                </RadioGroup>
              </div>

              <FormField
                control={form.control}
                name="model_condition"
                label={labelWithHint(
                  modelConditionType === "model" ? "Model（可选）" : "正则表达式（可选）",
                  modelConditionType === "model"
                    ? "选择要应用此 Policy 的特定 Model。留空则应用于所有模型。"
                    : "输入用于匹配 Model 的正则表达式（例如 gpt-4.* 或 bedrock/.*）。留空则应用于所有 Model。",
                )}
              >
                {({ ref, id, value, onChange, ...control }) =>
                  modelConditionType === "model" ? (
                    <SearchSelect
                      inputId={id}
                      options={availableModels.map((model) => ({ label: model, value: model }))}
                      value={value}
                      onValueChange={onChange}
                      placeholder="留空则应用于所有模型"
                      className="h-9"
                    />
                  ) : (
                    <Input
                      {...control}
                      id={id}
                      ref={ref}
                      value={value ?? ""}
                      onChange={onChange}
                      placeholder="留空表示应用于全部模型（例如 gpt-4.* 或 bedrock/claude-.*）"
                    />
                  )
                }
              </FormField>
            </FieldGroup>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && <UiLoadingSpinner className="size-4" />}
                {isEditing ? "更新 Policy" : "新建 Policy"}
              </Button>
            </div>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default AddPolicyForm;
