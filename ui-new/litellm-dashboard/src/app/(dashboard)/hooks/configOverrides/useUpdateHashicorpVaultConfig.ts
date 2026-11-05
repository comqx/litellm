import { updateHashicorpVaultConfig } from "./hashicorpVaultApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hashicorpVaultKeys } from "./useHashicorpVaultConfig";

export const useUpdateHashicorpVaultConfig = (accessToken: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Record<string, any>) => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return updateHashicorpVaultConfig(accessToken, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hashicorpVaultKeys.all });
    },
  });
};
