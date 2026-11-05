import React from "react";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export interface PassThroughSecuritySectionProps {
  premiumUser: boolean;
  authEnabled: boolean;
  onAuthChange: (checked: boolean) => void;
}

const PassThroughSecuritySection: React.FC<PassThroughSecuritySectionProps> = ({
  premiumUser,
  authEnabled,
  onAuthChange,
}) => {
  return (
    <Card className="block p-6">
      <h3 className="mb-2 text-lg font-semibold text-foreground">安全</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        启用后，访问此端点的请求需要有效的 LiteLLM Virtual Key
      </p>
      {premiumUser ? (
        <Switch checked={authEnabled} onCheckedChange={onAuthChange} />
      ) : (
        <div>
          <div className="mb-3 flex items-center">
            <Switch disabled checked={false} />
            <span className="ml-2 text-sm text-muted-foreground">身份验证（Premium）</span>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
            <p className="text-sm text-warning">
              为透传端点启用身份验证属于 LiteLLM Enterprise 功能。可在
              <a href="https://www.litellm.ai/#pricing" target="_blank" rel="noopener noreferrer" className="underline">
                此处
              </a>
              申请试用密钥。
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PassThroughSecuritySection;
