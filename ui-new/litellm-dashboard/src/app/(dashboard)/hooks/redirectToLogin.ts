import { buildLoginUrlWithReturn, getLoginUrl, storeReturnUrl } from "@/utils/returnUrlUtils";

export const redirectToLogin = () => {
  storeReturnUrl();
  window.location.replace(buildLoginUrlWithReturn(getLoginUrl()));
};
