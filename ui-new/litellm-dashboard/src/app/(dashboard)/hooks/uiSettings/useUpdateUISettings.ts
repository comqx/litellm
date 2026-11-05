import { updateUiSettings } from "@/components/networking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createQueryKeys } from "../common/queryKeysFactory";

const uiSettingsKeys = createQueryKeys("uiSettings");

export const useUpdateUISettings = (accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return updateUiSettings(accessToken, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: uiSettingsKeys.all });
    },
  });
};
