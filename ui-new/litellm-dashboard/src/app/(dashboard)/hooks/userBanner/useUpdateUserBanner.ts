import { updateUserBanner, UserBannerUpdate } from "@/components/networking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userBannerKeys } from "./useUserBanner";

export const useUpdateUserBanner = (accessToken: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (banner: UserBannerUpdate) => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return await updateUserBanner(accessToken, banner);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userBannerKeys.all });
    },
  });
};
