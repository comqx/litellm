import CopyButton from "@/components/shared/CopyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";
import { JsonViewer } from "./JsonViewer";

interface ClassifierAuditViewProps {
  request: Record<string, unknown>;
  response: unknown;
}

export function ClassifierAuditView({ request, response }: ClassifierAuditViewProps) {
  return (
    <div className="mb-6 space-y-4">
      <AuditField title="分类器输入" value={request.classifier_input}>
        发往提供商的请求载荷。若为缓存调用或已禁用消息日志，可能没有捕获内容。
      </AuditField>
      <AuditField title="原始请求（凭据已脱敏）" value={request.originating_request_masked}>
        仅供对照。该源请求未追加到分类器输入中。
      </AuditField>
      <AuditField title="分类器响应" value={response}>
        分类器返回的判定结果及说明。后续路由规则可能会调整层级。
      </AuditField>
    </div>
  );
}

function AuditField({ title, value, children }: { title: string; value: unknown; children: ReactNode }) {
  const serialized = JSON.stringify(value);
  const truncated = serialized?.includes("litellm_truncated") ?? false;

  return (
    <Card size="sm" role="region" aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {value != null && <CopyButton value={JSON.stringify(value, null, 2)} label={`复制${title}`} />}
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{children}</p>
        {truncated && (
          <p role="status" className="mb-3 text-sm text-warning">
            此存储副本已截断。当前日志存储配置下无法获取完整载荷。
          </p>
        )}
        {value == null ? (
          <p className="text-sm text-muted-foreground">未捕获或已禁用消息日志</p>
        ) : (
          <JsonViewer data={value} mode="formatted" />
        )}
      </CardContent>
    </Card>
  );
}
