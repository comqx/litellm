import CopyButton from "@/components/shared/CopyButton";
import { buildCurlCommand, type CurlCommandInput } from "./lib/curlCommand";

interface CurlPreviewProps extends CurlCommandInput {
  errorCount?: number;
}

export default function CurlPreview({ errorCount = 0, ...input }: CurlPreviewProps) {
  const command = buildCurlCommand(input);
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
        <span className="font-medium">cURL 请求</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {errorCount > 0 ? (
            <span role="alert" className="text-destructive">
              复制前请在「表单」页修复 {errorCount} 个问题
            </span>
          ) : (
            <>
              <span>将 $LITELLM_API_KEY 替换为虚拟密钥</span>
              <CopyButton value={command} label="复制 cURL" variant="action" />
            </>
          )}
        </div>
      </div>
      <pre
        aria-label="cURL 请求"
        className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap wrap-anywhere px-3 py-3 font-mono text-xs leading-5"
      >
        {command}
      </pre>
    </div>
  );
}
