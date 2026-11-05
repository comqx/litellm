"use client";

import ScopedSavingsTab from "@/components/shared/ScopedSavingsTab";
import { hasProxyWideSpendView, spendScopeUserId } from "@/utils/roles";
import type { ActivityDateRange } from "@/app/(dashboard)/cost-optimization/_components/useDailyActivityRange";

interface KeySavingsTabProps {
  accessToken: string | null;
  keyToken: string;
  userId: string | null;
  userRole: string;
  activity: ActivityDateRange;
}

const KeySavingsTab = ({ accessToken, keyToken, userId, userRole, activity }: KeySavingsTabProps) => (
  <ScopedSavingsTab
    accessToken={accessToken}
    scope={{ userId: spendScopeUserId(userRole, userId), apiKey: keyToken }}
    activity={activity}
    entityType="key"
    scopeNote={
      hasProxyWideSpendView(userRole)
        ? undefined
        : "仅显示你在此 Key 上的请求。在 Team 内共享的 Key 可能有其他成员产生的 Spend，不会计入此处。"
    }
  />
);

export default KeySavingsTab;
