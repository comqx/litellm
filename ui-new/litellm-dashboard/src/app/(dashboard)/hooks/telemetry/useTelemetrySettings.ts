import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQueryKeys } from "../common/queryKeysFactory";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { backgroundFetchClient, fetchClient } from "@/lib/http/api";
import { whenProxyRoute } from "@/lib/http/missingProxyRoute";
import { TELEMETRY_WINDOW_MS } from "@/lib/telemetry/uiEvents";
import type { components } from "@/lib/http/schema";
import { proxyAdminTierRoles } from "@/utils/roles";

export type TelemetrySettings = components["schemas"]["TelemetrySettingsResponse"];
export type TelemetryGroup = components["schemas"]["TelemetryGroup"];
export type TelemetryDestination = components["schemas"]["TelemetryDestination"];
export type TelemetrySettingsUpdate = {
  groups: readonly TelemetryGroup[];
  destination: TelemetryDestination | null;
};

export const telemetrySettingsKeys = createQueryKeys("telemetrySettings");

const telemetrySettingsPath = "/telemetry/settings";

const absentTelemetrySettings: TelemetrySettings = {
  available_destinations: [],
  destination: null,
  destination_set_by_environment: false,
  editable: false,
  environment_variables: [],
  flush_interval_seconds: 0,
  groups: [],
  report: null,
  report_is_sample: false,
  retention_days: 0,
  set_by_environment: false,
  stored_destination: null,
  stored_groups: null,
  vetoed: false,
};

const fetchTelemetrySettings = (): Promise<TelemetrySettings> =>
  whenProxyRoute(
    telemetrySettingsPath,
    async () => {
      const { data } = await backgroundFetchClient.GET(telemetrySettingsPath);
      if (data === undefined) {
        throw new Error("The proxy returned no telemetry settings payload");
      }
      return data;
    },
    absentTelemetrySettings,
  );

export const useTelemetrySettings = () => {
  const { accessToken, userRole } = useAuthorized();
  const options = {
    queryKey: telemetrySettingsKeys.detail("current"),
    queryFn: fetchTelemetrySettings,
    enabled: Boolean(accessToken) && proxyAdminTierRoles.includes(userRole || ""),
    staleTime: TELEMETRY_WINDOW_MS,
  };
  return useQuery<TelemetrySettings>(options);
};

export const useUpdateTelemetrySettings = () => {
  const queryClient = useQueryClient();
  return useMutation<TelemetrySettings, Error, TelemetrySettingsUpdate>({
    mutationFn: async ({ groups, destination }) =>
      (await fetchClient.PUT("/telemetry/settings", { body: { groups: [...groups], destination } }))
        .data as TelemetrySettings,
    onSuccess: (settings) => queryClient.setQueryData(telemetrySettingsKeys.detail("current"), settings),
  });
};
