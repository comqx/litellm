import React, { useState, useEffect } from "react";
import { Info, Plus } from "lucide-react";
import { getAgentsList, deleteAgentCall } from "@/components/networking";
import AddAgentForm from "./add_agent_form";
import { isAdminRole } from "@/utils/roles";
import AgentInfoView from "./agent_info";
import AgentsTable from "./AgentsTable";
import { toast } from "@/lib/toast";
import { Agent } from "@/components/agents/types";
import { Team } from "@/components/key_team_helpers/key_list";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface AgentsPanelProps {
  accessToken: string | null;
  userRole?: string;
  teams?: Team[] | null;
}

interface AgentsResponse {
  agents: Agent[];
}

const AgentsPanel: React.FC<AgentsPanelProps> = ({ accessToken, userRole, teams }) => {
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [healthCheckEnabled, setHealthCheckEnabled] = useState(false);

  const isAdmin = userRole ? isAdminRole(userRole) : false;

  useEffect(() => {
    let cancelled = false;
    const loadForToken = async () => {
      if (!accessToken) {
        setAgentsList([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response: AgentsResponse = await getAgentsList(accessToken, false);
        if (!cancelled) {
          setAgentsList(response.agents || []);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        if (!cancelled) {
          setAgentsList([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadForToken();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const refetchAgents = async (healthCheck: boolean) => {
    if (!accessToken) {
      return;
    }
    try {
      const response: AgentsResponse = await getAgentsList(accessToken, healthCheck);
      setAgentsList(response.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const handleHealthCheckToggle = async (checked: boolean) => {
    setHealthCheckEnabled(checked);
    setIsHealthCheckLoading(true);
    try {
      await refetchAgents(checked);
    } finally {
      setIsHealthCheckLoading(false);
    }
  };

  const handleAddAgent = () => {
    if (selectedAgentId) {
      setSelectedAgentId(null);
    }
    setIsAddModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
  };

  const handleSuccess = () => {
    refetchAgents(healthCheckEnabled);
  };

  const handleDeleteClick = (agentId: string, agentName: string) => {
    setAgentToDelete({ id: agentId, name: agentName });
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete || !accessToken) return;

    setIsDeleting(true);
    try {
      await deleteAgentCall(accessToken, agentToDelete.id);
      toast.success(`Agent「${agentToDelete.name}」已删除`);
      await refetchAgents(healthCheckEnabled);
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast.fromError("删除智能体失败");
    } finally {
      setIsDeleting(false);
      setAgentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setAgentToDelete(null);
  };

  return (
    <div className="w-full mx-auto flex-auto overflow-y-auto m-8 p-2">
      <div className="flex flex-col gap-2 mb-4">
        <h1 className="text-2xl font-bold">智能体</h1>
        <p className="text-sm text-muted-foreground">
          组织中可用的 A2A 规范智能体列表。前往 AI 中心可将智能体设为公开。
        </p>
        <Alert className="mb-3">
          <Info />
          <AlertTitle>为什么智能体需要 Key？</AlertTitle>
          <AlertDescription>
            智能体可通过虚拟密钥或受信任的身份提供商（JWT）进行鉴权。添加或编辑智能体时可配置身份绑定。JWT 鉴权无需虚拟密钥。
          </AlertDescription>
        </Alert>
        {isAdmin && (
          <div className="mt-2 flex items-center gap-4">
            <Button onClick={handleAddAgent} disabled={!accessToken}>
              <Plus />
              添加智能体
            </Button>
          </div>
        )}
      </div>

      {selectedAgentId ? (
        <AgentInfoView
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
          accessToken={accessToken}
          isAdmin={isAdmin}
        />
      ) : (
        <AgentsTable
          agents={agentsList}
          isLoading={isLoading}
          isAdmin={isAdmin}
          healthCheckEnabled={healthCheckEnabled}
          isHealthCheckLoading={isHealthCheckLoading}
          onHealthCheckToggle={handleHealthCheckToggle}
          onAgentClick={(id) => setSelectedAgentId(id)}
          onDeleteClick={handleDeleteClick}
        />
      )}

      <AddAgentForm
        visible={isAddModalVisible}
        onClose={handleCloseModal}
        accessToken={accessToken}
        onSuccess={handleSuccess}
        teams={teams}
      />

      {agentToDelete && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) handleDeleteCancel();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除 Agent</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除 Agent：{agentToDelete.name} 吗？此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default AgentsPanel;
