import { useState, useCallback } from "react";
import { getProxyBaseUrl, getGlobalLitellmHeaderName } from "@/components/networking";
import { toast } from "@/lib/toast";
import { MarginConfig } from "./types";
import { getProviderBackendValue } from "./provider_display_helpers";
import { Providers } from "@/components/provider_info_helpers";

export interface UseMarginConfigProps {
  accessToken: string | null;
}

export interface UseMarginConfigReturn {
  marginConfig: MarginConfig;
  setMarginConfig: React.Dispatch<React.SetStateAction<MarginConfig>>;
  fetchMarginConfig: () => Promise<void>;
  saveMarginConfig: (config: MarginConfig) => Promise<void>;
  handleAddMargin: (params: AddMarginParams) => Promise<boolean>;
  handleRemoveMargin: (provider: string) => Promise<void>;
  handleMarginChange: (
    provider: string,
    value: number | { percentage?: number; fixed_amount?: number },
  ) => Promise<void>;
}

export interface AddMarginParams {
  selectedProvider: string | undefined;
  marginType: "percentage" | "fixed";
  percentageValue: string;
  fixedAmountValue: string;
}

export function useMarginConfig({ accessToken }: UseMarginConfigProps): UseMarginConfigReturn {
  const [marginConfig, setMarginConfig] = useState<MarginConfig>({});

  const fetchMarginConfig = useCallback(async () => {
    try {
      const proxyBaseUrl = getProxyBaseUrl();
      const url = proxyBaseUrl ? `${proxyBaseUrl}/config/cost_margin_config` : "/config/cost_margin_config";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMarginConfig(data.values || {});
      } else {
        console.error("Failed to fetch margin config");
      }
    } catch (error) {
      console.error("Error fetching margin config:", error);
      toast.fromError("获取加成配置失败");
    }
  }, [accessToken]);

  const saveMarginConfig = useCallback(
    async (config: MarginConfig) => {
      try {
        const proxyBaseUrl = getProxyBaseUrl();
        const url = proxyBaseUrl ? `${proxyBaseUrl}/config/cost_margin_config` : "/config/cost_margin_config";

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        if (response.ok) {
          toast.success("加成配置更新成功");
          await fetchMarginConfig();
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.detail?.error || errorData.detail || "更新设置失败";
          toast.fromError(errorMessage);
        }
      } catch (error) {
        console.error("Error updating margin config:", error);
        toast.fromError("更新加成配置失败");
      }
    },
    [accessToken, fetchMarginConfig],
  );

  const handleAddMargin = useCallback(
    async (params: AddMarginParams): Promise<boolean> => {
      const { selectedProvider, marginType, percentageValue, fixedAmountValue } = params;

      if (!selectedProvider) {
        toast.fromError("请选择供应商");
        return false;
      }

      let providerValue: string;
      if (selectedProvider === "global") {
        providerValue = "global";
      } else {
        const backendValue = getProviderBackendValue(selectedProvider);
        if (!backendValue) {
          toast.fromError("选择的供应商无效");
          return false;
        }
        providerValue = backendValue;
      }

      if (marginConfig[providerValue]) {
        const displayName =
          providerValue === "global" ? "全局" : Providers[selectedProvider as keyof typeof Providers];
        toast.fromError(`${displayName} 的加成已存在，请在上方表格中编辑。`);
        return false;
      }

      let marginValue: number | { fixed_amount?: number };
      if (marginType === "percentage") {
        const percentValue = parseFloat(percentageValue);
        if (isNaN(percentValue) || percentValue < 0 || percentValue > 1000) {
          toast.fromError("Percentage must be between 0% and 1000%");
          return false;
        }
        marginValue = percentValue / 100;
      } else {
        const fixedValue = parseFloat(fixedAmountValue);
        if (isNaN(fixedValue) || fixedValue < 0) {
          toast.fromError("固定金额必须为非负数");
          return false;
        }
        marginValue = { fixed_amount: fixedValue };
      }

      const updatedConfig = {
        ...marginConfig,
        [providerValue]: marginValue,
      };

      setMarginConfig(updatedConfig);
      await saveMarginConfig(updatedConfig);
      return true;
    },
    [marginConfig, saveMarginConfig],
  );

  const handleRemoveMargin = useCallback(
    async (provider: string) => {
      const updatedConfig = { ...marginConfig };
      delete updatedConfig[provider];
      setMarginConfig(updatedConfig);
      await saveMarginConfig(updatedConfig);
    },
    [marginConfig, saveMarginConfig],
  );

  const handleMarginChange = useCallback(
    async (provider: string, value: number | { percentage?: number; fixed_amount?: number }) => {
      const updatedConfig = {
        ...marginConfig,
        [provider]: value,
      };
      setMarginConfig(updatedConfig);
      await saveMarginConfig(updatedConfig);
    },
    [marginConfig, saveMarginConfig],
  );

  return {
    marginConfig,
    setMarginConfig,
    fetchMarginConfig,
    saveMarginConfig,
    handleAddMargin,
    handleRemoveMargin,
    handleMarginChange,
  };
}
