"use client";

import React, { useState } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import { useHealthReadinessDetails } from "@/app/(dashboard)/hooks/healthReadiness/useHealthReadinessDetails";
import {
  type LatestReleaseInfo,
  useLatestReleaseInfo,
} from "@/app/(dashboard)/hooks/latestRelease/useLatestReleaseInfo";
import { getLocalStorageItem, setLocalStorageItem } from "@/utils/localStorageUtils";
import { isNewerVersion } from "@/utils/versionUtils";

const DISMISS_KEY_PREFIX = "litellm:upgradeBannerDismissed:";

interface UpgradeBannerProps {
  accessToken: string | null;
}

interface UpgradeBannerViewProps {
  currentVersion: string | null | undefined;
  latestRelease: LatestReleaseInfo | null | undefined;
}

export const describeRelease = ({ new_features, bug_fixes, other_updates }: LatestReleaseInfo): string =>
  `${new_features} 项新功能、${bug_fixes} 项修复及 ${other_updates} 项其他更新`;

export const UpgradeBannerView: React.FC<UpgradeBannerViewProps> = ({ currentVersion, latestRelease }) => {
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  if (!currentVersion || !latestRelease || !isNewerVersion(currentVersion, latestRelease.version)) {
    return null;
  }

  const dismissKey = `${DISMISS_KEY_PREFIX}${latestRelease.version}`;
  if (dismissedVersion === latestRelease.version || getLocalStorageItem(dismissKey) === "true") {
    return null;
  }

  const handleClose = () => {
    setLocalStorageItem(dismissKey, "true");
    setDismissedVersion(latestRelease.version);
  };

  return (
    <Alert role="status" variant="info" className="rounded-none border-x-0 border-t-0">
      <ArrowUpCircle className="size-4" aria-hidden />
      <AlertTitle>
        最新版本为{" "}
        <a href={latestRelease.release_url} target="_blank" rel="noopener noreferrer" className="underline">
          v{latestRelease.version}
        </a>
        : {describeRelease(latestRelease)}
      </AlertTitle>
      <AlertDescription>你当前的版本为 v{currentVersion}</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-sm" aria-label="关闭" onClick={handleClose}>
          <X className="size-4" />
        </Button>
      </AlertAction>
    </Alert>
  );
};

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ accessToken }) => {
  const { data: healthData } = useHealthReadinessDetails(accessToken);
  const { data: latestRelease } = useLatestReleaseInfo(accessToken);
  return <UpgradeBannerView currentVersion={healthData?.litellm_version} latestRelease={latestRelease} />;
};
