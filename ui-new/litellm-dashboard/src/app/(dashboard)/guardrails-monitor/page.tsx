"use client";

import GuardrailsMonitorView from "./_components/GuardrailsMonitorView";
import { AdminOnlyNotice } from "@/components/shared/AdminOnlyNotice";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import useCan from "@/app/(dashboard)/hooks/useCan";

export default function GuardrailsMonitor() {
  const { accessToken } = useAuthorized();
  const canViewGuardrailUsage = useCan("viewGuardrailUsage");

  if (!canViewGuardrailUsage) {
    return <AdminOnlyNotice pageTitle="护栏监控" />;
  }

  return <GuardrailsMonitorView accessToken={accessToken} />;
}
