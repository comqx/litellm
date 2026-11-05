import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/components/networking";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { keyKeys } from "./useKeys";

export interface SetKeyBlockedStateInput {
  keyToken: string;
  blocked: boolean;
}

export interface SetKeyBlockedStateResult {
  blocked: boolean;
}

interface BlockKeyResponse {
  blocked?: boolean | null;
}

export const setKeyBlockedState = async (
  accessToken: string,
  { keyToken, blocked }: SetKeyBlockedStateInput,
): Promise<SetKeyBlockedStateResult> => {
  const response = await apiClient.post<BlockKeyResponse | null>(blocked ? "/key/block" : "/key/unblock", {
    accessToken,
    body: { key: keyToken },
  });
  return { blocked: response?.blocked ?? blocked };
};

export const useSetKeyBlockedState = () => {
  const { accessToken } = useAuthorized();
  const queryClient = useQueryClient();

  return useMutation<SetKeyBlockedStateResult, Error, SetKeyBlockedStateInput>({
    mutationFn: async (input) => {
      if (!accessToken) {
        throw new Error("需要提供 Access Token");
      }
      return setKeyBlockedState(accessToken, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyKeys.all });
    },
  });
};
