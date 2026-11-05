import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CyberArkEmptyPlaceholderProps {
  onAdd: () => void;
}

export default function CyberArkEmptyPlaceholder({ onAdd }: CyberArkEmptyPlaceholderProps) {
  return (
    <div className="flex w-full flex-col items-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <KeyRound className="size-6 text-muted-foreground" />
      </div>
      <h4 className="text-base font-semibold text-foreground">未找到 CyberArk 配置</h4>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        配置 CyberArk Conjur，以便在 LiteLLM 部署中安全管理 Provider API Key 与密钥。
      </p>
      <Button size="lg" onClick={onAdd} className="mt-4">
        配置 CyberArk
      </Button>
    </div>
  );
}
