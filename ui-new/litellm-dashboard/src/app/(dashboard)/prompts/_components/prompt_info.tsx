import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPromptInfo,
  getPromptVersions,
  PromptSpec,
  PromptTemplateBase,
  deletePromptCall,
} from "@/components/networking";
import { copyToClipboard as utilCopyToClipboard } from "@/utils/dataUtils";
import { ArrowLeft, CheckIcon, CopyIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import PromptCodeSnippets from "./prompt_editor_view/PromptCodeSnippets";
import { extractModel, extractTemplateVariables, getBasePromptId, getCurrentVersion } from "./prompt_utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface PromptInfoProps {
  promptId: string;
  initialEnvironment?: string;
  onClose: () => void;
  accessToken: string | null;
  isAdmin: boolean;
  onDelete?: () => void;
  onEdit?: (promptData: any) => void;
}

const PromptInfoView: React.FC<PromptInfoProps> = ({
  promptId,
  initialEnvironment,
  onClose,
  accessToken,
  isAdmin,
  onDelete,
  onEdit,
}) => {
  const [promptData, setPromptData] = useState<PromptSpec | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<PromptTemplateBase | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Environment and version state
  const [environments, setEnvironments] = useState<string[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<PromptSpec[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Fetches the requested environment (or the serve-time default when omitted) plus the environments list
  const fetchPromptInfo = async (environment?: string) => {
    try {
      setLoading(true);
      if (!accessToken) return;
      const response = await getPromptInfo(accessToken, promptId, environment);
      setPromptData(response.prompt_spec);
      setPromptTemplate(response.raw_prompt_template);
      setRawApiResponse(response);

      // Set environments from response
      if (response.environments && response.environments.length > 0) {
        setEnvironments(response.environments);
        if (!selectedEnv) {
          setSelectedEnv(response.prompt_spec.environment || response.environments[0]);
        }
      }
      setSelectedVersion(response.prompt_spec.version || null);
    } catch (error) {
      toast.fromError("加载 Prompt 信息失败");
      console.error("Error fetching prompt info:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch version history for selected environment
  const fetchVersionHistory = async (env: string) => {
    if (!accessToken) return;
    setLoadingVersions(true);
    try {
      const response = await getPromptVersions(accessToken, promptId, env);
      setVersionHistory(response.prompts || []);
    } catch {
      setVersionHistory([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    setSelectedEnv(null);
    setEnvironments([]);
    setVersionHistory([]);
    fetchPromptInfo(initialEnvironment);
  }, [promptId, accessToken]);

  // When environment changes (user clicks tab), re-fetch — skip initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Still fetch version history on initial mount once selectedEnv is set
      if (selectedEnv && accessToken) {
        fetchVersionHistory(selectedEnv);
      }
      return;
    }
    if (selectedEnv && accessToken) {
      fetchPromptInfo(selectedEnv);
      fetchVersionHistory(selectedEnv);
    }
  }, [selectedEnv]);

  if (loading && !promptData) {
    return <div className="p-4">加载中…</div>;
  }

  if (!promptData) {
    return <div className="p-4">未找到 Prompt</div>;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const copyToClipboard = async (text: string | null | undefined, key: string) => {
    const success = await utilCopyToClipboard(text);
    if (success) {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accessToken || !promptData) return;
    setIsDeleting(true);
    try {
      await deletePromptCall(accessToken, basePromptId);
      toast.success(`Prompt "${basePromptId}" 删除成功`);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.fromError("删除 Prompt 失败");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleVersionClick = async (version: PromptSpec) => {
    if (!accessToken || !selectedEnv) return;
    // Fetch specific version's info
    const versionNum = version.version || 1;
    setSelectedVersion(versionNum);
    try {
      const versionedId = `${promptId}.v${versionNum}`;
      const response = await getPromptInfo(accessToken, versionedId, selectedEnv);
      setPromptData(response.prompt_spec);
      setPromptTemplate(response.raw_prompt_template);
      setRawApiResponse(response);
    } catch {
      toast.fromError(`加载版本 v${versionNum} 失败`);
    }
  };

  const promptModel = promptData ? extractModel(promptData) || "gpt-4o" : "gpt-4o";
  const basePromptId = getBasePromptId(promptData);
  const currentVersion = getCurrentVersion(promptData);
  const latestVersion = versionHistory.length > 0 ? Math.max(...versionHistory.map((v) => v.version || 1)) : null;
  const isViewingOldVersion = latestVersion !== null && selectedVersion !== null && selectedVersion < latestVersion;

  return (
    <div className="p-4">
      <div>
        <Button variant="ghost" onClick={onClose} className="mb-4">
          <ArrowLeft className="size-4" />
          返回 Prompt 列表
        </Button>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Prompt 详情</h1>
            <div className="flex items-center cursor-pointer">
              <p className="text-sm text-muted-foreground font-mono">{basePromptId}</p>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => copyToClipboard(basePromptId, "prompt-id")}
                className={`left-2 z-raised transition-all duration-200 ${
                  copiedStates["prompt-id"]
                    ? "text-success bg-success/10 border-success/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {copiedStates["prompt-id"] ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <PromptCodeSnippets
              promptId={basePromptId}
              model={promptModel}
              promptVariables={extractTemplateVariables(promptTemplate?.content)}
              accessToken={accessToken}
              version={currentVersion}
              environment={selectedEnv ?? promptData.environment}
            />
            <Button onClick={() => onEdit?.(rawApiResponse)} className="flex items-center">
              <Pencil />
              Prompt Studio
            </Button>
            {isAdmin && (
              <Button variant="secondary" onClick={handleDeleteClick} className="flex items-center">
                <Trash2 />
                删除 Prompt
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Environment Tabs */}
      {environments.length > 0 && (
        <div className="flex gap-2 mb-4">
          {[...environments]
            .sort((a, b) => {
              const order: Record<string, number> = { development: 0, staging: 1, production: 2 };
              return (order[a] ?? 99) - (order[b] ?? 99);
            })
            .map((env) => (
              <button
                key={env}
                onClick={() => {
                  setSelectedEnv(env);
                  setSelectedVersion(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedEnv === env
                    ? env === "production"
                      ? "bg-destructive/15 text-destructive border-2 border-destructive/30"
                      : env === "staging"
                        ? "bg-warning/15 text-warning border-2 border-warning/30"
                        : "bg-success/15 text-success border-2 border-success/30"
                    : "bg-muted text-muted-foreground border-2 border-transparent hover:bg-accent"
                }`}
              >
                {env}
                {versionHistory.length > 0 && selectedEnv === env && (
                  <span className="ml-1 text-xs opacity-75">(v{latestVersion})</span>
                )}
              </button>
            ))}
        </div>
      )}

      {/* Old version banner */}
      {isViewingOldVersion && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
          <p className="text-sm text-warning">
            Viewing v{selectedVersion} — not the latest version (v{latestVersion})
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const latest = versionHistory.find((v) => v.version === latestVersion);
              if (latest) handleVersionClick(latest);
            }}
          >
            前往最新版本
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 h-auto w-full justify-start rounded-none border-b p-0">
          <TabsTrigger value="overview" className="flex-none rounded-none px-4 py-2">
            概览
          </TabsTrigger>
          {promptTemplate && (
            <TabsTrigger value="prompt-template" className="flex-none rounded-none px-4 py-2">
              Prompt 模板
            </TabsTrigger>
          )}
          <TabsTrigger value="raw-json" className="flex-none rounded-none px-4 py-2">
            原始 JSON
          </TabsTrigger>
        </TabsList>

        <div>
          {/* Overview Panel */}
          <TabsContent value="overview" keepMounted>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="block p-6">
                <p>版本</p>
                <div className="mt-2">
                  <h3 className="text-lg font-medium">{currentVersion}</h3>
                  <Badge variant="secondary" className="mt-1">
                    v{currentVersion}
                  </Badge>
                </div>
              </Card>

              <Card className="block p-6">
                <p>Prompt 类型</p>
                <div className="mt-2">
                  <h3 className="text-lg font-medium">{promptData.prompt_info?.prompt_type || "-"}</h3>
                </div>
              </Card>

              <Card className="block p-6">
                <p>创建者</p>
                <div className="mt-2">
                  <h3 className="text-sm font-medium">{promptData.created_by || "-"}</h3>
                </div>
              </Card>

              <Card className="block p-6">
                <p>创建时间</p>
                <div className="mt-2">
                  <h3 className="text-sm font-medium">{formatDate(promptData.created_at)}</h3>
                  <p className="text-xs">Updated: {formatDate(promptData.updated_at)}</p>
                </div>
              </Card>
            </div>

            {/* Version History Table */}
            <Card className="block mt-6 p-6">
              <h3 className="text-lg font-medium mb-3">Version History — {selectedEnv}</h3>
              {loadingVersions ? (
                <p>正在加载版本…</p>
              ) : versionHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>版本</TableHead>
                      <TableHead>创建者</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionHistory.map((v) => {
                      const vNum = v.version || 1;
                      const isSelected = vNum === selectedVersion;
                      const isLatest = vNum === latestVersion;
                      return (
                        <TableRow
                          key={vNum}
                          className={`cursor-pointer hover:bg-info/10 transition-colors ${
                            isSelected ? "bg-info/10" : ""
                          }`}
                          onClick={() => handleVersionClick(v)}
                        >
                          <TableCell>
                            <span className={isSelected ? "font-bold" : ""}>v{vNum}</span>
                            {isLatest && (
                              <Badge variant="secondary" className="ml-2">
                                latest
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{v.created_by || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(v.created_at)}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Build a response-like object for the editor
                                const editData = {
                                  prompt_spec: {
                                    ...v,
                                    prompt_id: basePromptId,
                                    environment: selectedEnv,
                                  },
                                  raw_prompt_template: isSelected ? promptTemplate : null,
                                };
                                onEdit?.(editData);
                              }}
                            >
                              <Pencil />
                              编辑
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">在 {selectedEnv} 中未找到版本</p>
              )}
            </Card>
          </TabsContent>

          {/* Prompt Template Panel */}
          {promptTemplate && (
            <TabsContent value="prompt-template" keepMounted>
              <Card className="block p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Prompt 模板</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(promptTemplate.content, "prompt-content")}
                    className={`transition-all duration-200 ${
                      copiedStates["prompt-content"]
                        ? "text-success bg-success/10 border-success/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {copiedStates["prompt-content"] ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    {copiedStates["prompt-content"] ? "Copied!" : "Copy Content"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium">模板 ID</p>
                    <div className="font-mono text-sm bg-muted p-2 rounded-sm">{promptTemplate.litellm_prompt_id}</div>
                  </div>

                  <div>
                    <p className="font-medium">内容</p>
                    <div className="mt-2 p-4 bg-muted rounded-md border overflow-auto max-h-96">
                      <pre className="text-sm text-foreground whitespace-pre-wrap">{promptTemplate.content}</pre>
                    </div>
                  </div>

                  {promptTemplate.metadata && Object.keys(promptTemplate.metadata).length > 0 && (
                    <div>
                      <p className="font-medium">模板元数据</p>
                      <div className="mt-2 p-3 bg-muted rounded-md border">
                        <pre className="text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-64">
                          {JSON.stringify(promptTemplate.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          {/* Raw JSON Panel */}
          <TabsContent value="raw-json" keepMounted>
            <Card className="block p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">原始 API 响应</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(rawApiResponse, null, 2), "raw-json")}
                  className={`transition-all duration-200 ${
                    copiedStates["raw-json"]
                      ? "text-success bg-success/10 border-success/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {copiedStates["raw-json"] ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  {copiedStates["raw-json"] ? "Copied!" : "Copy JSON"}
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-md border overflow-auto">
                <pre className="text-xs text-foreground whitespace-pre-wrap">
                  {JSON.stringify(rawApiResponse, null, 2)}
                </pre>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>删除 Prompt</DialogTitle>
          </DialogHeader>
          <p>
            确定要删除 Prompt： <strong>{basePromptId}</strong>（所有环境）吗？
          </p>
          <p>此操作无法撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              取消
            </Button>
            <Button onClick={handleDeleteConfirm} variant="destructive" disabled={isDeleting} aria-busy={isDeleting}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptInfoView;
