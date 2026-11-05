"use client";

import { useEffect } from "react";

import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import { getCookie } from "@/utils/cookieUtils";
import { checkTokenValidity } from "@/utils/jwtUtils";
import { getLoginUrl } from "@/utils/returnUrlUtils";

export function useRequirePublicHubAuth() {
  const { data: uiSettings, isLoading } = useUISettings();
  const requireAuth = !isLoading && uiSettings?.values?.require_auth_for_public_ai_hub === true;
  useEffect(() => {
    if (requireAuth && !checkTokenValidity(getCookie("token"))) {
      window.location.replace(getLoginUrl());
    }
  }, [requireAuth]);
}
