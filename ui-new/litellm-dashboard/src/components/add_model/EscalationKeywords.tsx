import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import React from "react";

export const DEFAULT_ESCALATION_KEYWORDS = ["LITELLM ESCALATE"];

interface EscalationKeywordsProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

const EscalationKeywords: React.FC<EscalationKeywordsProps> = ({ keywords, onChange }) => {
  return (
    <div className="w-full max-w-none">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="m-0 text-xl font-semibold text-foreground">升级关键词</h4>
        <SimpleTooltip content="用户可以在消息中包含的区分大小写的短语，当他们对结果不满意时强制提升到更高一级的复杂度层级。他们可以强制使用更强的 模型，但不能指定具体是哪个。">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <span className="mb-2 block text-xs text-muted-foreground">
        可选：当用户消息包含这些短语之一时，请求会被提升到比原本路由更高一级的层级。
        otherwise route to. Matching is case-sensitive, so &quot;LITELLM ESCALATE&quot; only fires on the exact, shouted
        留空则禁用。
      </span>
      <MultiSelect
        options={keywords.map((keyword) => ({ label: keyword, value: keyword }))}
        value={keywords}
        onValueChange={onChange}
        placeholder="例如 LITELLM ESCALATE"
        emptyText="输入以添加短语"
        allowCustomValues
        className="w-full"
      />
    </div>
  );
};

export default EscalationKeywords;
