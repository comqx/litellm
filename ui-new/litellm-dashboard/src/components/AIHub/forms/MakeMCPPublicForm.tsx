import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cva.config";
import { makeMCPPublicCall } from "../../networking";
import { toast } from "@/lib/toast";
import { MCPServerData } from "@/components/AIHub/MCPHubTableColumns";

const STEP_TITLES = ["选择服务器", "确认"];

const statusVariant = (status?: string) => {
  if (status === "active" || status === "healthy") {
    return "default" as const;
  }
  if (status === "inactive" || status === "unhealthy") {
    return "destructive" as const;
  }
  return "outline" as const;
};

interface MakeMCPPublicFormProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  mcpHubData: MCPServerData[];
  onSuccess: () => void;
}

interface PublicationSelection {
  readonly catalog: MCPServerData[];
  readonly serverIds: Set<string>;
}

const MakeMCPPublicForm: React.FC<MakeMCPPublicFormProps> = ({
  visible,
  onClose,
  accessToken,
  mcpHubData,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selection, setSelection] = useState<PublicationSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedServers = selection?.serverIds ?? new Set<string>();
  const hasPublicationMetadata = mcpHubData.every((server) => typeof server.mcp_info?.is_public_explicit === "boolean");
  const canManagePublication = hasPublicationMetadata && selection?.catalog === mcpHubData;
  const publicationYaml = [
    "litellm_settings:",
    "  public_mcp_hub_strict_whitelist: true",
    selectedServers.size === 0
      ? "  public_mcp_servers: []"
      : `  public_mcp_servers:\n${Array.from(selectedServers, (id) => `    - ${JSON.stringify(id)}`).join("\n")}`,
  ].join("\n");

  const handleClose = () => {
    setCurrentStep(0);
    setSelection(null);
    onClose();
  };

  const handleNext = () => {
    if (!canManagePublication) return;
    if (currentStep === 0) {
      setCurrentStep(1);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 1) {
      setCurrentStep(0);
    }
  };

  const handleServerSelection = (serverId: string, checked: boolean) => {
    const newSelection = new Set(selectedServers);
    if (checked) {
      newSelection.add(serverId);
    } else {
      newSelection.delete(serverId);
    }
    setSelection({ catalog: mcpHubData, serverIds: newSelection });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allServerIds = mcpHubData.map((server) => server.server_id);
      setSelection({ catalog: mcpHubData, serverIds: new Set(allServerIds) });
    } else {
      setSelection({ catalog: mcpHubData, serverIds: new Set() });
    }
  };

  useEffect(() => {
    if (!visible || !hasPublicationMetadata) {
      setSelection(null);
      return;
    }
    const publicServerIds = mcpHubData
      .filter((server) => server.mcp_info.is_public_explicit === true)
      .map((server) => server.server_id);
    setSelection({ catalog: mcpHubData, serverIds: new Set(publicServerIds) });
    setCurrentStep(0);
  }, [visible, mcpHubData, hasPublicationMetadata]);

  const handleSubmit = async () => {
    if (!canManagePublication) return;
    setLoading(true);
    try {
      const serverIdsToMakePublic = Array.from(selectedServers);

      // Make batch API call for all servers
      await makeMCPPublicCall(accessToken, serverIdsToMakePublic);

      toast.success("MCP 中心公开列表已更新");
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error making MCP servers public:", error);
      toast.fromError(error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1Content = () => {
    const allServersSelected =
      mcpHubData.length > 0 && mcpHubData.every((server) => selectedServers.has(server.server_id));
    const isIndeterminate = selectedServers.size > 0 && !allServersSelected;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择要设为 Public 的 MCP 服务器</h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allServersSelected}
                indeterminate={isIndeterminate}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                disabled={mcpHubData.length === 0}
              />
              全选 {mcpHubData.length > 0 && `(${mcpHubData.length})`}
            </label>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          选择要在公开中心发布的 MCP 服务器完整列表。取消勾选可从列表中移除，全部取消勾选可清空列表。身份验证与访问权限仍然生效。
        </p>

        <p className="text-xs text-muted-foreground">
          旧版模式还会列出启用了公网 IP 访问的服务器。在配置中将 public_mcp_hub_strict_whitelist 设为 true 可仅使用公开列表。
        </p>

        <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
          <div className="space-y-3">
            {mcpHubData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无可用 MCP 服务器。</p>
              </div>
            ) : (
              mcpHubData.map((server) => {
                const isPublic = server.mcp_info?.is_public === true;
                return (
                  <div
                    key={server.server_id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent"
                  >
                    <Checkbox
                      aria-label={`Publish ${server.server_name}`}
                      checked={selectedServers.has(server.server_id)}
                      onCheckedChange={(checked) => handleServerSelection(server.server_id, checked === true)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium break-words">{server.server_name}</p>
                        {isPublic && (
                          <Badge>
                            {server.mcp_info?.is_public_explicit === false ? "旧版模式列出" : "已列出"}
                          </Badge>
                        )}
                        <Badge variant="secondary">{server.transport}</Badge>
                        <Badge variant={statusVariant(server.status)}>{server.status || "unknown"}</Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{server.server_id}</p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {server.description || server.url}
                      </p>
                      {server.allowed_tools && server.allowed_tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {server.allowed_tools.slice(0, 3).map((tool, idx) => (
                            <Badge key={idx} variant="outline">
                              {tool}
                            </Badge>
                          ))}
                          {server.allowed_tools.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{server.allowed_tools.length - 3} 更多</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">在 YAML 中配置</summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              将这些设置合并到 Proxy 配置并重新加载。条目使用上方显示的服务器 ID，而非名称或别名。对在 YAML 中定义的服务器，请在各 mcp_servers
              条目中固定 server_id，以保持公开列表稳定。
            </p>
            <CodeBlock code={publicationYaml} language="yaml" />
          </div>
        </details>

        {selectedServers.size > 0 && (
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-sm text-info">
              已选择 <strong>{selectedServers.size}</strong> 个 MCP 服务器
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStep2Content = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">确认将 MCP 服务器设为 Public</h3>

        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-sm text-warning">
            能打开 <code>/ui/model_hub_table</code> 的用户可发现已发布的服务器。显式发布的服务器 ID 也允许来自公网 IP
            的请求。身份验证与访问权限仍然生效。
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-medium">将被设为 Public 的 MCP 服务器：</p>
          <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
            <div className="space-y-2">
              {selectedServers.size === 0 && <p className="text-sm">没有显式发布的服务器</p>}
              {Array.from(selectedServers).map((serverId) => {
                const server = mcpHubData.find((s) => s.server_id === serverId);
                return (
                  <div key={serverId} className="flex items-center justify-between p-2 bg-muted rounded-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium break-words">{server?.server_name || serverId}</p>
                        {server && (
                          <>
                            <Badge variant="secondary">{server.transport}</Badge>
                            <Badge variant={statusVariant(server.status)}>{server.status || "unknown"}</Badge>
                          </>
                        )}
                      </div>
                      {server?.description && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{server.description}</p>
                      )}
                      {server?.url && <p className="text-xs text-muted-foreground mt-1 break-words">{server.url}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-info/10 border border-info/20 rounded-lg p-3">
          <p className="text-sm text-info">
            保存后将公开列表替换为 <strong>{selectedServers.size}</strong> 个 MCP 服务器。旧版模式仍可能列出启用了公网 IP
            访问的服务器。
          </p>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    if (!hasPublicationMetadata) {
      return (
        <div role="alert" className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm">
          此 Proxy 未为每个 MCP 服务器提供显式发布状态。请升级 Proxy 以在此管理可见性，或在现有配置中编辑
          litellm_settings.public_mcp_servers
        </div>
      );
    }
    if (!canManagePublication) return <p role="status">正在加载发布设置…</p>;
    switch (currentStep) {
      case 0:
        return renderStep1Content();
      case 1:
        return renderStep2Content();
      default:
        return null;
    }
  };

  const renderStepButtons = () => {
    return (
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={currentStep === 0 ? handleClose : handlePrevious}>
          {currentStep === 0 ? "取消" : "上一步"}
        </Button>

        <div className="flex space-x-2">
          {currentStep === 0 && (
            <Button onClick={handleNext} disabled={!canManagePublication}>
              下一步
            </Button>
          )}

          {currentStep === 1 && (
            <Button onClick={handleSubmit} disabled={loading || !canManagePublication}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              设为 Public
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()} disablePointerDismissal>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>将 MCP 服务器设为 Public</DialogTitle>
        </DialogHeader>

        <div>
          <ol className="mb-6 flex items-center gap-6">
            {STEP_TITLES.map((title, index) => (
              <li
                key={title}
                className="flex items-center gap-2"
                aria-current={currentStep === index ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    currentStep === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className={cn("text-sm", currentStep === index ? "font-medium" : "text-muted-foreground")}>
                  {title}
                </span>
              </li>
            ))}
          </ol>

          {renderStepContent()}
          {renderStepButtons()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MakeMCPPublicForm;
