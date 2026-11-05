import { Badge } from "@/components/ui/badge";
import { DEFAULT_DECISION_THRESHOLD } from "./decision_model/decisionModelQuestion";
import { GuardrailModeRows } from "./GuardrailModeDisplay";
import { GuardrailStreamScopeDetail } from "./StreamScopeFields";
import ToolPermissionRulesEditor, { type ToolPermissionConfig } from "./tool_permission/ToolPermissionRulesEditor";

interface DecisionModelCheckView {
  name: string;
  action?: string;
  threshold?: number;
  instructions?: string;
}

const DecisionModelSection = ({
  decisionModel,
  checks,
}: {
  decisionModel: string;
  checks: DecisionModelCheckView[];
}) => (
  <div>
    <p className="font-medium">决策模型</p>
    <div className="font-mono">{decisionModel}</div>
    <p className="mt-2 font-medium">检查项</p>
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <div className="flex border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold">
        <span className="flex-1">检查</span>
        <span className="w-24 text-right">动作</span>
        <span className="w-24 text-right">阈值</span>
      </div>
      {checks.map((check) => (
        <div key={check.name} className="flex items-center border-b border-border px-4 py-2 text-sm last:border-b-0">
          <span className="flex-1">{check.name.replace(/_/g, " ")}</span>
          <span className="w-24 text-right">
            <Badge variant="secondary">
              {check.action === "log" ? "仅记录" : check.action === "block" ? "阻止" : (check.action ?? "阻止")}
            </Badge>
          </span>
          <span className="w-24 text-right">{check.threshold ?? DEFAULT_DECISION_THRESHOLD}</span>
        </div>
      ))}
    </div>
  </div>
);

export const GuardrailReadOnlyDetails = ({
  guardrailId,
  guardrailName,
  displayName,
  litellmParams,
  streamScope,
  defaultOn,
  piiEntityCount,
  createdAt,
  updatedAt,
  showToolPermission,
  toolPermissionConfig,
}: {
  guardrailId: string;
  guardrailName: string;
  displayName: string;
  litellmParams: {
    mode?: unknown;
    logging_only_scope?: string | null;
    guardrail?: string;
    decision_model?: string;
    checks?: DecisionModelCheckView[];
    logging_only_continue_on_input_failure?: boolean | null;
  };
  streamScope: unknown;
  defaultOn: boolean | undefined;
  piiEntityCount: number;
  createdAt: string;
  updatedAt: string;
  showToolPermission: boolean;
  toolPermissionConfig: ToolPermissionConfig;
}) => (
  <div className="space-y-4">
    <div>
      <p className="font-medium">护栏 ID</p>
      <div className="font-mono">{guardrailId}</div>
    </div>
    <div>
      <p className="font-medium">护栏名称</p>
      <div>{guardrailName || "未命名护栏"}</div>
    </div>
    <div>
      <p className="font-medium">供应商</p>
      <div>{displayName}</div>
    </div>
    <GuardrailModeRows litellmParams={litellmParams} />
    <GuardrailStreamScopeDetail raw={streamScope} />
    <div>
      <p className="font-medium">默认启用</p>
      <Badge variant={defaultOn ? "secondary" : "outline"}>{defaultOn ? "是" : "否"}</Badge>
    </div>
    {litellmParams.guardrail === "decision_model" && litellmParams.decision_model && (
      <DecisionModelSection decisionModel={litellmParams.decision_model} checks={litellmParams.checks ?? []} />
    )}
    {piiEntityCount > 0 && (
      <div>
        <p className="font-medium">PII 保护</p>
        <div className="mt-2">
          <Badge variant="secondary">已配置 {piiEntityCount} 个 PII 实体</Badge>
        </div>
      </div>
    )}
    <div>
      <p className="font-medium">创建时间</p>
      <div>{createdAt}</div>
    </div>
    <div>
      <p className="font-medium">最后更新</p>
      <div>{updatedAt}</div>
    </div>
    {showToolPermission && <ToolPermissionRulesEditor value={toolPermissionConfig} disabled />}
  </div>
);
