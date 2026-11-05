import { useState, useCallback } from "react";
import { getProxyBaseUrl, getGlobalLitellmHeaderName } from "@/components/networking";
import { toast } from "@/lib/toast";
import { DiscountConfig } from "./types";
import { getProviderBackendValue } from "./provider_display_helpers";
import { Providers } from "@/components/provider_info_helpers";

export interface UseDiscountConfigProps {
  accessToken: string | null;
}

export interface UseDiscountConfigReturn {
  discountConfig: DiscountConfig;
  setDiscountConfig: React.Dispatch<React.SetStateAction<DiscountConfig>>;
  fetchDiscountConfig: () => Promise<void>;
  saveDiscountConfig: (config: DiscountConfig) => Promise<void>;
  handleAddProvider: (selectedProvider: string | undefined, newDiscount: string) => Promise<boolean>;
  handleRemoveProvider: (provider: string) => Promise<void>;
  handleDiscountChange: (provider: string, value: string) => Promise<void>;
}

export function useDiscountConfig({ accessToken }: UseDiscountConfigProps): UseDiscountConfigReturn {
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({});

  const fetchDiscountConfig = useCallback(async () => {
    try {
      const proxyBaseUrl = getProxyBaseUrl();
      const url = proxyBaseUrl ? `${proxyBaseUrl}/config/cost_discount_config` : "/config/cost_discount_config";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscountConfig(data.values || {});
      } else {
        console.error("Failed to fetch discount config");
      }
    } catch (error) {
      console.error("Error fetching discount config:", error);
      toast.fromError("获取折扣配置失败");
    }
  }, [accessToken]);

  const saveDiscountConfig = useCallback(
    async (config: DiscountConfig) => {
      try {
        const proxyBaseUrl = getProxyBaseUrl();
        const url = proxyBaseUrl ? `${proxyBaseUrl}/config/cost_discount_config` : "/config/cost_discount_config";

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        if (response.ok) {
          toast.success("折扣配置更新成功");
          await fetchDiscountConfig();
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.detail?.error || errorData.detail || "更新设置失败";
          toast.fromError(errorMessage);
        }
      } catch (error) {
        console.error("Error updating discount config:", error);
        toast.fromError("更新折扣配置失败");
      }
    },
    [accessToken, fetchDiscountConfig],
  );

  const handleAddProvider = useCallback(
    async (selectedProvider: string | undefined, newDiscount: string): Promise<boolean> => {
      if (!selectedProvider || !newDiscount) {
        toast.fromError("请选择供应商并输入折扣百分比");
        return false;
      }

      const percentageValue = parseFloat(newDiscount);
      if (isNaN(percentageValue) || percentageValue < 0 || percentageValue > 100) {
        toast.fromError("Discount must be between 0% and 100%");
        return false;
      }

      const providerValue = getProviderBackendValue(selectedProvider);

      if (!providerValue) {
        toast.fromError("选择的供应商无效");
        return false;
      }

      if (discountConfig[providerValue]) {
        toast.fromError(
          `${Providers[selectedProvider as keyof typeof Providers]} 的折扣已存在，请在上方表格中编辑。`,
        );
        return false;
      }

      const discountValue = percentageValue / 100;
      const updatedConfig = {
        ...discountConfig,
        [providerValue]: discountValue,
      };

      setDiscountConfig(updatedConfig);
      await saveDiscountConfig(updatedConfig);
      return true;
    },
    [discountConfig, saveDiscountConfig],
  );

  const handleRemoveProvider = useCallback(
    async (provider: string) => {
      const updatedConfig = { ...discountConfig };
      delete updatedConfig[provider];
      setDiscountConfig(updatedConfig);
      await saveDiscountConfig(updatedConfig);
    },
    [discountConfig, saveDiscountConfig],
  );

  const handleDiscountChange = useCallback(
    async (provider: string, value: string) => {
      const discountValue = parseFloat(value);
      if (!isNaN(discountValue) && discountValue >= 0 && discountValue <= 1) {
        const updatedConfig = {
          ...discountConfig,
          [provider]: discountValue,
        };
        setDiscountConfig(updatedConfig);
        await saveDiscountConfig(updatedConfig);
      }
    },
    [discountConfig, saveDiscountConfig],
  );

  return {
    discountConfig,
    setDiscountConfig,
    fetchDiscountConfig,
    saveDiscountConfig,
    handleAddProvider,
    handleRemoveProvider,
    handleDiscountChange,
  };
}
