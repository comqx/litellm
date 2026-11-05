"use client";

import { Page, PageTabs, PageTabsList, PageTabsTrigger } from "@/components/shared/Page";
import React from "react";
import { Info, PiggyBank } from "lucide-react";

import useCan from "@/app/(dashboard)/hooks/useCan";
import { Alert, AlertDescription } from "@/components/shared/Alert";
import { TabsContent } from "@/components/ui/tabs";
import { PageHeader, PageHeaderControls, PageHeaderDescription, PageHeaderTitle } from "@/components/shared/PageHeader";
import UsageTab from "./UsageTab";
import PromptCompressionTab from "./PromptCompressionTab";
import PromptCachingTab from "./PromptCachingTab";
import AutoRouterBenchmarksTab from "./AutoRouterBenchmarksTab";
import { useDailyActivityRange } from "./useDailyActivityRange";

interface CostOptimizationViewProps {
  accessToken: string | null;
  userId: string | null;
  userRole: string;
}

const CostOptimizationView: React.FC<CostOptimizationViewProps> = ({ accessToken, userId, userRole }) => {
  const activity = useDailyActivityRange(accessToken, userId, userRole);
  const canViewProxyWideCostData = useCan("viewProxyWideCostData");
  const [visitedTabs, setVisitedTabs] = React.useState<readonly string[]>(["usage"]);

  const handleTabChange = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }

    setVisitedTabs((currentTabs) => (currentTabs.includes(value) ? currentTabs : [...currentTabs, value]));
  };

  return (
    <Page>
      <PageTabs defaultValue="usage" onValueChange={handleTabChange}>
        <PageHeader>
          <PageHeaderTitle>
            <PiggyBank />
            成本优化
          </PageHeaderTitle>
          <PageHeaderDescription>
            追踪和配置省钱机制：提示词压缩和提示词缓存。自动路由器位于「模型与端点」页面的「自动路由器」标签页下
          </PageHeaderDescription>
          <PageHeaderControls>
            <PageTabsList>
              <PageTabsTrigger value="usage">总览</PageTabsTrigger>
              {canViewProxyWideCostData && (
                <>
                  <PageTabsTrigger value="compression">提示词压缩</PageTabsTrigger>
                  <PageTabsTrigger value="caching">提示词缓存</PageTabsTrigger>
                  <PageTabsTrigger value="autorouter-usage">自动路由器</PageTabsTrigger>
                </>
              )}
            </PageTabsList>
          </PageHeaderControls>
        </PageHeader>

        <div
          role="alert"
          className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/50 px-4 py-4"
        >
          <Info className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <p className="font-medium text-foreground">这是一个实验性面板</p>
          <p className="col-start-2 text-sm text-muted-foreground">
            有反馈？在此
            <a
              href="https://github.com/BerriAI/litellm/discussions/32168"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              参与讨论
            </a>
          </p>
        </div>

        {activity.failed && (
          <Alert variant="error">
            <AlertDescription className="text-inherit">
              获取花费数据失败，下方节省数据可能为空或非最终值。请刷新页面重试。
            </AlertDescription>
          </Alert>
        )}
        <TabsContent value="usage" keepMounted={visitedTabs.includes("usage")}>
          <UsageTab accessToken={accessToken} activity={activity} />
        </TabsContent>
        {canViewProxyWideCostData && (
          <>
            <TabsContent value="compression" keepMounted={visitedTabs.includes("compression")}>
              <PromptCompressionTab accessToken={accessToken} />
            </TabsContent>
            <TabsContent value="caching" keepMounted={visitedTabs.includes("caching")}>
              <PromptCachingTab accessToken={accessToken} activity={activity} />
            </TabsContent>
            <TabsContent value="autorouter-usage" keepMounted={visitedTabs.includes("autorouter-usage")}>
              <AutoRouterBenchmarksTab accessToken={accessToken} activity={activity} />
            </TabsContent>
          </>
        )}
      </PageTabs>
    </Page>
  );
};

export default CostOptimizationView;
