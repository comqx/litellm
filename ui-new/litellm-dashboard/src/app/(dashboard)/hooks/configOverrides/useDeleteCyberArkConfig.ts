import { deleteCyberArkConfig } from "./cyberArkApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cyberArkKeys } from "./useCyberArkConfig";

export const useDeleteCyberArkConfig = (accessToken: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return deleteCyberArkConfig(accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cyberArkKeys.all });
    },
  });
};
