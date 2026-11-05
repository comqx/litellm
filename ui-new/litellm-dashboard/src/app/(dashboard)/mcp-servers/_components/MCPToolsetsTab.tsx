import React, { useState, useCallback } from "react";
import { z } from "zod";
import { SortingState } from "@tanstack/react-table";
import { Inbox, Plus, X } from "lucide-react";
import { useMCPToolsets } from "@/app/(dashboard)/hooks/mcpServers/useMCPToolsets";
import { useMCPServers } from "@/app/(dashboard)/hooks/mcpServers/useMCPServers";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/DataTable";
import {
  createMCPToolset,
  updateMCPToolset,
  deleteMCPToolset,
  listMCPTools,
  getProxyBaseUrl,
} from "@/components/networking";
import { MCPToolset, MCPToolsetTool } from "@/components/mcp_tools/types";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useZodForm } from "@/lib/forms/useZodForm";
import { toast } from "@/lib/toast";
import { displayToolName, getMCPToolsetTableColumns } from "./MCPToolsetTableColumns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MCPToolsetsTabProps {
  accessToken: string | null;
  userRole: string | null;
}

const toolsetSchema = z.object({
  toolset_name: z.string().min(1, "请输入工具集名称"),
  description: z.string(),
});

type ToolsetFormValues = z.infer<typeof toolsetSchema>;

interface MCPToolListProps {
  serverId: string;
  serverName: string;
  accessToken: string | null;
  selectedTools: MCPToolsetTool[];
  onToggle: (tool: MCPToolsetTool) => void;
}

interface ToolEntry {
  name: string;
  description?: string;
}

function MCPToolList({ serverId, serverName, accessToken, selectedTools, onToggle }: MCPToolListProps) {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const selectedSet = new Set(selectedTools.filter((t) => t.server_id === serverId).map((t) => t.tool_name));

  const fetchTools = useCallback(async () => {
    if (!accessToken || tools.length > 0) return;
    setLoading(true);
    try {
      const result = await listMCPTools(accessToken, serverId);
      const toolList = Array.isArray(result) ? result : result?.tools ?? [];
      setTools(toolList.map((t: any) => ({ name: t.name ?? t.tool_name ?? t, description: t.description ?? "" })));
    } catch {
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, serverId, tools.length]);

  const handleToggle = () => {
    if (!expanded) fetchTools();
    setExpanded(!expanded);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-accent transition-colors"
        onClick={handleToggle}
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-info shrink-0" />
          {serverName}
          {selectedSet.size > 0 && (
            <span className="ml-1 text-xs text-purple-600 font-semibold dark:text-purple-400">
              {selectedSet.size} selected
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="p-2">
          {loading ? (
            <div className="flex justify-center py-3">
              <UiLoadingSpinner className="size-4" />
            </div>
          ) : tools.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">此服务器没有找到工具。</p>
          ) : (
            <div className="flex flex-col gap-1">
              {tools.map((tool) => {
                const selected = selectedSet.has(tool.name);
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => onToggle({ server_id: serverId, tool_name: tool.name })}
                    className={`flex items-start justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      selected
                        ? "bg-purple-50 border border-purple-300 dark:bg-purple-950 dark:border-purple-700"
                        : "bg-card border border-border hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium leading-tight ${selected ? "text-purple-800 dark:text-purple-200" : "text-foreground"}`}
                      >
                        {tool.name}
                      </p>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                          {tool.description}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <span className="text-purple-500 text-xs font-semibold ml-2 shrink-0 mt-0.5 dark:text-purple-400">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CreateToolsetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description: string | undefined, tools: MCPToolsetTool[]) => Promise<void>;
  accessToken: string | null;
  initialToolset?: MCPToolset;
}

function CreateToolsetModal({ open, onClose, onSave, accessToken, initialToolset }: CreateToolsetModalProps) {
  const form = useZodForm(toolsetSchema, {
    defaultValues: {
      toolset_name: initialToolset?.toolset_name || "",
      description: initialToolset?.description || "",
    },
  });
  const [selectedTools, setSelectedTools] = useState<MCPToolsetTool[]>(initialToolset?.tools || []);
  const [saving, setSaving] = useState(false);
  const [serverSearch, setServerSearch] = useState("");
  const { data: mcpServers = [] } = useMCPServers();
  const serverPrefixById = React.useMemo(
    () => new Map(mcpServers.map((s) => [s.server_id, s.alias || s.server_name || s.server_id])),
    [mcpServers],
  );

  React.useEffect(() => {
    if (open) {
      form.reset({
        toolset_name: initialToolset?.toolset_name || "",
        description: initialToolset?.description || "",
      });
      setSelectedTools(initialToolset?.tools || []);
      setServerSearch("");
    }
  }, [open, initialToolset, form]);

  const handleToggleTool = (tool: MCPToolsetTool) => {
    setSelectedTools((prev) => {
      const exists = prev.some((t) => t.server_id === tool.server_id && t.tool_name === tool.tool_name);
      return exists
        ? prev.filter((t) => !(t.server_id === tool.server_id && t.tool_name === tool.tool_name))
        : [...prev, tool];
    });
  };

  const handleSubmit = async (values: ToolsetFormValues) => {
    setSaving(true);
    try {
      await onSave(values.toolset_name, values.description, selectedTools);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filteredServers = mcpServers.filter((s) => {
    const q = serverSearch.toLowerCase();
    return !q || (s.alias || "").toLowerCase().includes(q) || (s.server_name || "").toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{initialToolset ? "编辑工具集" : "新建工具集"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} className="mt-2">
          <FieldGroup className="mb-4 flex-row gap-4">
            <FormField control={form.control} name="toolset_name" label="工具集名称" className="flex-1">
              {(field) => <Input {...field} placeholder="例如 github-linear-tools" />}
            </FormField>
            <FormField control={form.control} name="description" label="描述" className="flex-1">
              {(field) => <Input {...field} placeholder="可选描述" />}
            </FormField>
          </FieldGroup>
        </form>

        <div className="flex gap-4 mt-2" style={{ minHeight: 360 }}>
          {/* Left panel: Available Tools */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">可用工具</p>
            </div>
            <InputGroup className="mb-2">
              <InputGroupInput
                placeholder="搜索 MCP Server…"
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
              />
              {serverSearch && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label="清除搜索" onClick={() => setServerSearch("")}>
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 300 }}>
              {filteredServers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {mcpServers.length === 0 ? "尚未配置 MCP Server" : "没有符合搜索条件的服务器"}
                </p>
              ) : (
                filteredServers.map((server) => (
                  <MCPToolList
                    key={server.server_id}
                    serverId={server.server_id}
                    serverName={server.alias || server.server_name || server.server_id}
                    accessToken={accessToken}
                    selectedTools={selectedTools}
                    onToggle={handleToggleTool}
                  />
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border shrink-0" />

          {/* Right panel: Your Toolset */}
          <div className="w-72 shrink-0">
            <p className="text-sm font-semibold text-foreground mb-2 block">
              Your Toolset{" "}
              <span className="text-xs font-normal text-muted-foreground">({selectedTools.length} tools)</span>
            </p>
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 340 }}>
              {selectedTools.length === 0 ? (
                <p className="text-muted-foreground text-sm">尚未添加工具</p>
              ) : (
                selectedTools.map((tool, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleTool(tool)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-destructive/10 hover:border-destructive/20 group transition-colors dark:border-purple-800 dark:bg-purple-950"
                  >
                    <div className="min-w-0 text-left">
                      <span className="text-xs font-medium text-purple-800 group-hover:text-destructive truncate block dark:text-purple-200">
                        {displayToolName(serverPrefixById.get(tool.server_id), tool.tool_name)}
                      </span>
                      <span className="text-[10px] text-purple-400 truncate block dark:text-purple-500">
                        {tool.server_id.slice(0, 8)}…
                      </span>
                    </div>
                    <span className="ml-2 text-purple-300 group-hover:text-destructive text-xs shrink-0 dark:text-purple-600">
                      ✕
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => void form.handleSubmit(handleSubmit)()} disabled={saving} aria-busy={saving}>
            {saving && <UiLoadingSpinner className="size-4" />}
            {initialToolset ? "保存更改" : "创建工具集"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolsetsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">还没有工具集</div>
      <div className="text-sm text-muted-foreground">
        创建工具集，为 Key 和 Team 提供一组精选的 MCP 工具。
      </div>
    </div>
  );
}

function ToolsetUsageGuide() {
  const [copied, setCopied] = useState(false);
  const proxyBaseUrl = getProxyBaseUrl();

  const snippet = `{
  "mcpServers": {
    "my-toolset": {
      "url": "${proxyBaseUrl}/toolset/<toolset-name>/mcp",
      "headers": { "x-litellm-api-key": "Bearer <your-api-key>" }
    }
  }
}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-muted px-5 py-4">
      <p className="text-sm font-medium text-foreground mb-1">工具集的工作原理</p>
      <p className="text-sm text-muted-foreground mb-3">
        创建工具集，并通过{" "}
        <span className="font-medium text-foreground">API Keys → Edit Key → MCP Servers</span>, then point your MCP
        Key，然后将你的 MCP 客户端指向工具集 URL。客户端只能看到你挑选的工具。
      </p>
      <div className="text-xs text-muted-foreground mb-1">Claude Code / Cursor config</div>
      <div className="relative">
        <pre className="bg-card border border-border rounded-sm px-4 py-3 text-xs font-mono text-foreground overflow-x-auto leading-relaxed pr-14">
          {snippet}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded-sm border bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border transition-colors"
        >
          {copied ? "✓" : "copy"}
        </button>
      </div>
    </div>
  );
}

export function MCPToolsetsTab({ accessToken, userRole }: MCPToolsetsTabProps) {
  const queryClient = useQueryClient();
  const { data: toolsets = [], isLoading } = useMCPToolsets();
  const { data: mcpServers = [] } = useMCPServers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editToolset, setEditToolset] = useState<MCPToolset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = userRole === "Admin" || userRole === "proxy_admin";

  const handleCreate = async (name: string, description: string | undefined, tools: MCPToolsetTool[]) => {
    if (!accessToken) return;
    await createMCPToolset(accessToken, { toolset_name: name, description, tools });
    toast.success("工具集已创建");
    queryClient.invalidateQueries({ queryKey: ["mcpToolsets"] });
  };

  const handleUpdate = async (name: string, description: string | undefined, tools: MCPToolsetTool[]) => {
    if (!accessToken || !editToolset) return;
    await updateMCPToolset(accessToken, { toolset_id: editToolset.toolset_id, toolset_name: name, description, tools });
    toast.success("工具集已更新");
    queryClient.invalidateQueries({ queryKey: ["mcpToolsets"] });
    setEditToolset(null);
  };

  const handleDelete = async () => {
    if (!accessToken || !deleteId) return;
    setDeleting(true);
    try {
      await deleteMCPToolset(accessToken, deleteId);
      toast.success("工具集已删除");
      queryClient.invalidateQueries({ queryKey: ["mcpToolsets"] });
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const serverPrefixById = React.useMemo(
    () => new Map(mcpServers.map((s) => [s.server_id, s.alias || s.server_name || s.server_id])),
    [mcpServers],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = React.useMemo(() => {
    const deps = {
      isAdmin,
      serverPrefixById,
      onEditClick: setEditToolset,
      onDeleteClick: setDeleteId,
    };
    return getMCPToolsetTableColumns(deps);
  }, [isAdmin, serverPrefixById]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">MCP 工具集</h3>
          <p className="text-muted-foreground text-sm">
            Curated collections of tools from one or more MCP servers. Assign toolsets to keys and teams via the MCP
            permissions dropdown.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            新建工具集
          </Button>
        )}
      </div>

      <ToolsetUsageGuide />

      <DataTable
        data={toolsets}
        paginationMode="client"
        columns={columns}
        getRowId={(toolset, index) => toolset.toolset_id || String(index)}
        sortingMode="client"
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        loadingMessage="正在加载工具集…"
        noDataMessage={<ToolsetsEmptyState />}
        size="compact"
      />

      <CreateToolsetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        accessToken={accessToken}
      />

      {editToolset && (
        <CreateToolsetModal
          open={!!editToolset}
          onClose={() => setEditToolset(null)}
          onSave={handleUpdate}
          accessToken={accessToken}
          initialToolset={editToolset}
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>删除工具集</DialogTitle>
          </DialogHeader>
          <p>
            确定要删除此工具集吗？使用它的 Key 和 Team 将失去对这些限定工具的访问权限。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button onClick={handleDelete} variant="destructive" disabled={deleting} aria-busy={deleting}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
