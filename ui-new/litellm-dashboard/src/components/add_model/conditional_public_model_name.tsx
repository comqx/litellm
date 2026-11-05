import React, { useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useFormContext, useWatch } from "react-hook-form";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { validatorRules } from "../common_components/formRules";
import { MountedFormField, type MountedFormValues } from "../common_components/MountedFormField";
import { Providers } from "../provider_info_helpers";

interface ModelMapping {
  public_name: string;
  litellm_model: string;
}

const sameMappings = (left: readonly ModelMapping[], right: readonly ModelMapping[]): boolean =>
  left.length === right.length &&
  left.every(
    (mapping, index) =>
      mapping.public_name === right[index].public_name && mapping.litellm_model === right[index].litellm_model,
  );

const modelMappingsRule = {
  validator: async (_: unknown, value: unknown) => {
    if (!value || (value as ModelMapping[]).length === 0) {
      throw new Error("至少需要一个 模型映射");
    }
    const invalidMappings = (value as ModelMapping[]).filter(
      (mapping) => !mapping.public_name || mapping.public_name.trim() === "",
    );
    if (invalidMappings.length > 0) {
      throw new Error("所有 模型映射都必须有有效的公开名称");
    }
  },
};

const tooltipCodeClassName = "rounded-sm bg-background/20 px-1 py-0.5 font-mono text-xs";

const ANTHROPIC_1M_HEADERS = JSON.stringify({ extra_headers: { "anthropic-beta": "context-1m-2025-08-07" } }, null, 2);

const publicNameTooltipContent = (
  <div className="flex flex-col gap-2 text-left font-normal">
    <div>你在调用 LiteLLM 代理的 API 时指定的名称</div>
    <div>
      <strong>示例：</strong>若公开模型名为 <code className={tooltipCodeClassName}>example-name</code>
      ，并选择 LiteLLM 模型 <code className={tooltipCodeClassName}>openai/qwen-plus-latest</code>
    </div>
    <div>
      <strong>用法：</strong>调用 LiteLLM Proxy 时在{" "}
      <code className={tooltipCodeClassName}>model = &quot;example-name&quot;</code> 中使用该名称
    </div>
    <div>
      <strong>结果：</strong>LiteLLM 向提供商发送 <code className={tooltipCodeClassName}>qwen-plus-latest</code>
    </div>
  </div>
);

const PublicNameInput: React.FC<{ readonly index: number; readonly value: string }> = ({ index, value }) => {
  const form = useFormContext<MountedFormValues>();
  const selectedProvider = useWatch({ control: form.control, name: "custom_llm_provider" });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    const litellmParams = form.getValues("litellm_extra_params") as string | undefined;
    const wantsAnthropic1m =
      selectedProvider === Providers.Anthropic && typed.endsWith("-1m") && (litellmParams ?? "").trim() === "";

    if (wantsAnthropic1m) {
      form.setValue("litellm_extra_params", ANTHROPIC_1M_HEADERS);
    }

    const publicName = wantsAnthropic1m ? typed.slice(0, -"-1m".length) : typed;
    const current = (form.getValues("model_mappings") as ModelMapping[]) ?? [];
    form.setValue(
      "model_mappings",
      current.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, public_name: publicName } : mapping,
      ),
    );
  };

  return <Input value={value} onChange={handleChange} />;
};

/**
 * Module-level so the header and cell renderers keep a stable identity: React treats a renderer
 * declared inside the component as a new element type on every render and remounts the input,
 * which drops focus after each keystroke.
 */
const columns: ColumnDef<ModelMapping>[] = [
  {
    id: "public_name",
    accessorKey: "public_name",
    header: () => (
      <span className="flex items-center">
        公开 模型名称
        <SimpleTooltip content={publicNameTooltipContent} width="500px" />
      </span>
    ),
    cell: ({ row }) => <PublicNameInput index={row.index} value={row.original.public_name} />,
  },
  {
    id: "litellm_model",
    accessorKey: "litellm_model",
    header: () => (
      <span className="flex items-center">
        LiteLLM 模型名称
        <SimpleTooltip content={<div>LiteLLM 将发送给 LLM API 的 模型名称</div>} width="360px" />
      </span>
    ),
  },
];

const ConditionalPublicModelName: React.FC = () => {
  const form = useFormContext<MountedFormValues>();

  const modelValue = useWatch({ control: form.control, name: "model" }) || [];
  const selectionKey = JSON.stringify(Array.isArray(modelValue) ? modelValue : [modelValue]);
  const selectedModels = useMemo(() => JSON.parse(selectionKey) as string[], [selectionKey]);
  const customModelName = useWatch({ control: form.control, name: "custom_model_name" }) as string | undefined;
  const showPublicModelName = !selectedModels.includes("all-wildcard");
  const selectedProvider = useWatch({ control: form.control, name: "custom_llm_provider" });

  useEffect(() => {
    if (customModelName && selectedModels.includes("custom")) {
      const currentMappings = (form.getValues("model_mappings") as ModelMapping[]) || [];
      const updatedMappings = currentMappings.map((mapping) => {
        if (mapping.public_name === "custom" || mapping.litellm_model === "custom") {
          if (selectedProvider === Providers.Azure) {
            return {
              public_name: customModelName,
              litellm_model: `azure/${customModelName}`,
            };
          }
          return {
            public_name: customModelName,
            litellm_model: customModelName,
          };
        }
        return mapping;
      });
      if (!sameMappings(currentMappings, updatedMappings)) {
        form.setValue("model_mappings", updatedMappings);
      }
    }
  }, [customModelName, selectedModels, selectedProvider, form]);

  // Initial setup of model mappings when models are selected
  useEffect(() => {
    if (selectedModels.length > 0 && !selectedModels.includes("all-wildcard")) {
      // Check if we already have mappings that match the selected models
      const currentMappings = (form.getValues("model_mappings") as ModelMapping[]) || [];

      // Only update if the mappings don't exist or don't match the selected models
      const shouldUpdateMappings =
        currentMappings.length !== selectedModels.length ||
        !selectedModels.every((model) =>
          currentMappings.some((mapping) => {
            if (model === "custom") {
              return mapping.litellm_model === "custom" || mapping.litellm_model === customModelName;
            }
            if (selectedProvider === Providers.Azure) {
              return mapping.litellm_model === `azure/${model}`;
            }
            return mapping.litellm_model === model;
          }),
        );

      if (shouldUpdateMappings) {
        const mappings = selectedModels.map((model: string) => {
          if (model === "custom" && customModelName) {
            if (selectedProvider === Providers.Azure) {
              return {
                public_name: customModelName,
                litellm_model: `azure/${customModelName}`,
              };
            }
            return {
              public_name: customModelName,
              litellm_model: customModelName,
            };
          }
          if (selectedProvider === Providers.Azure) {
            return {
              public_name: model,
              litellm_model: `azure/${model}`,
            };
          }
          return {
            public_name: model,
            litellm_model: model,
          };
        });

        form.setValue("model_mappings", mappings);
      }
    }
  }, [selectedModels, customModelName, selectedProvider, form]);

  if (!showPublicModelName) return null;

  return (
    <MountedFormField
      name="model_mappings"
      label={
        <span className="flex items-center">
          模型映射
          <SimpleTooltip content="将公开 模型名称映射到 LiteLLM 模型名称，用于负载均衡" />
        </span>
      }
      required
      rules={{ validate: validatorRules(modelMappingsRule) }}
      className="mb-4"
    >
      {(control) => (
        <DataTable
          data={(control.value as ModelMapping[] | undefined) ?? []}
          columns={columns}
          getRowId={(row) => row.litellm_model}
          size="compact"
        />
      )}
    </MountedFormField>
  );
};

export default ConditionalPublicModelName;
