import { updateMCPSemanticFilterSettings } from "@/components/networking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createQueryKeys } from "../common/queryKeysFactory";

const mcpSemanticFilterSettingsKeys = createQueryKeys("mcpSemanticFilterSettings");

export const useUpdateMCPSemanticFilterSettings = (accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return updateMCPSemanticFilterSettings(accessToken, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mcpSemanticFilterSettingsKeys.all,
      });
    },
  });
};
