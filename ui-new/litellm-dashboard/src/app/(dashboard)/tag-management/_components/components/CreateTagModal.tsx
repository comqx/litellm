"use client";

import { ChevronRight, CircleHelp } from "lucide-react";
import React from "react";
import { z } from "zod";
import BudgetDurationDropdown from "@/components/common_components/budget_duration_dropdown";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import NumericalInput from "@/components/shared/numerical_input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/lib/forms/useZodForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const labelWithHint = (label: React.ReactNode, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

interface ModelInfo {
  model_name: string;
  litellm_params: {
    model: string;
  };
  model_info: {
    id: string;
  };
}

const createTagShape = {
  tag_name: z.string().min(1, "请输入 Tag 名称"),
  description: z.string().optional(),
  allowed_llms: z.array(z.string()).optional(),
  max_budget: z.string().optional(),
  budget_duration: z.string().optional(),
};

const createTagSchema = z.object(createTagShape);

export type CreateTagFormValues = z.output<typeof createTagSchema>;

interface CreateTagModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTagFormValues) => void;
  availableModels: ModelInfo[];
}

const CreateTagModal: React.FC<CreateTagModalProps> = ({ visible, onCancel, onSubmit, availableModels }) => {
  const [budgetSectionOpen, setBudgetSectionOpen] = React.useState(false);
  const form = useZodForm(createTagSchema, { defaultValues: { tag_name: "" } });

  const modelOptions = availableModels.map((model) => ({
    label: model.model_name,
    value: model.model_info.id,
    description: model.model_info.id,
  }));

  const handleFinish = (values: CreateTagFormValues) => {
    onSubmit(budgetSectionOpen ? values : { ...values, max_budget: undefined, budget_duration: undefined });
    form.reset();
    setBudgetSectionOpen(false);
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>创建新 Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleFinish)} noValidate>
          <TooltipProvider>
            <FieldGroup>
              <FormField control={form.control} name="tag_name" label="Tag 名称">
                {({ ref, ...field }) => <Input {...field} ref={ref} />}
              </FormField>

              <FormField control={form.control} name="description" label="描述">
                {({ ref, value, ...field }) => <Textarea {...field} ref={ref} value={value ?? ""} rows={4} />}
              </FormField>

              <FormField
                control={form.control}
                name="allowed_llms"
                label={labelWithHint(
                  "Allowed Models",
                  "Select which models are allowed to process requests from this tag",
                )}
              >
                {({ value, onChange }) => (
                  <MultiSelect
                    options={modelOptions}
                    value={value}
                    onValueChange={onChange}
                    placeholder="选择 Model"
                  />
                )}
              </FormField>
            </FieldGroup>

            <Collapsible
              open={budgetSectionOpen}
              onOpenChange={setBudgetSectionOpen}
              className="mt-4 mb-4 rounded-md border border-border"
            >
              <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-base font-medium text-foreground">
                Budget & Rate Limits (Optional)
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <FieldGroup className="mt-4">
                  <FormField
                    control={form.control}
                    name="max_budget"
                    label={labelWithHint(
                      "最大预算（USD）",
                      "此 Tag 可花费的最大金额（USD）。达到上限后，携带此 Tag 的请求将被拦截",
                    )}
                  >
                    {({ ref, value, ...field }) => <NumericalInput {...field} value={value ?? ""} step={0.01} />}
                  </FormField>

                  <FormField
                    control={form.control}
                    name="budget_duration"
                    label={labelWithHint(
                      "预算重置周期",
                      "预算重置的频率。例如设置为“daily”将每 24 小时重置一次预算",
                    )}
                  >
                    {({ id, value, onChange }) => (
                      <BudgetDurationDropdown
                        id={id}
                        value={value ?? null}
                        onChange={(next) => onChange(next ?? undefined)}
                      />
                    )}
                  </FormField>
                </FieldGroup>

                <div className="mt-4 rounded-md border border-border bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    TPM/RPM limits for tags are not currently supported. If you need this feature, please{" "}
                    <a
                      href="https://github.com/BerriAI/litellm/issues/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info underline hover:text-info/80"
                    >
                      创建 GitHub issue
                    </a>
                    .
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-2.5 text-right">
              <Button type="submit">创建 Tag</Button>
            </div>
          </TooltipProvider>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTagModal;
