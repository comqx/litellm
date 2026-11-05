import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface CreatedKeyDisplayProps {
  apiKey: string;
}

/**
 * Shared component for displaying a newly-created virtual key.
 * Used on the 虚拟密钥 page and in the Add Agent wizard.
 */
const CreatedKeyDisplay: React.FC<CreatedKeyDisplayProps> = ({ apiKey }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    toast.success("Key 已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="mb-2">
        请将此密钥保存在安全且易于访问的地方。出于安全考虑，<b>关闭此对话框后将无法再次查看</b>。若丢失密钥，需在 LiteLLM 中重新创建。
      </p>

      <p className="text-sm text-muted-foreground mt-3 mb-1">Virtual Key：</p>
      <div className="bg-muted rounded-md p-2.5 mb-2.5">
        <pre className="m-0 whitespace-normal break-words text-foreground">{apiKey}</pre>
      </div>

      <CopyToClipboard text={apiKey} onCopy={handleCopy}>
        <Button className="mt-3">{copied ? "已复制！" : "复制 Virtual Key"}</Button>
      </CopyToClipboard>
    </div>
  );
};

export default CreatedKeyDisplay;
