import React from "react";

import { type ComplexityRouterConfigValue, usesLlmClassifier } from "./ComplexityRouterConfig";
import { restrictedBy } from "./TierRestrictions";

const TierConfigIntro: React.FC<{ value: ComplexityRouterConfigValue }> = ({ value }) => (
  <div className="mb-4 space-y-2 text-sm text-muted-foreground">
    <p>为每个层级选择一个或多个 模型。请求会使用其所属层级的 Models</p>
    <p className="text-xs">
      {restrictedBy(value, "displayNames")?.reason ?? "显示名称会出现在控制台和消费日志中"}
      {!value.custom_tier_set &&
        usesLlmClassifier(value.classifier_type) &&
        "。你的评判模型 也会使用这些名称来分类请求"}
    </p>
  </div>
);

export default TierConfigIntro;
