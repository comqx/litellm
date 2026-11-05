import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  vectorStoreListCall,
  vectorStoreDeleteCall,
  credentialListCall,
  CredentialItem,
} from "@/components/networking";
import { VectorStore } from "@/components/vector_store_management/types";
import VectorStoreTable from "./VectorStoreTable";
import VectorStoreForm from "./VectorStoreForm";
import DeleteResourceModal from "@/components/common_components/DeleteResourceModal";
import VectorStoreInfoView from "./vector_store_info";
import CreateVectorStore from "./CreateVectorStore";
import TestVectorStoreTab from "./TestVectorStoreTab";
import IndexesTab from "./IndexesTab";
import { isAdminRole, isProxyAdminRole } from "@/utils/roles";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisitedTabs } from "@/hooks/useVisitedTabs";

interface VectorStoreProps {
  accessToken: string | null;
  userID: string | null;
  userRole: string | null;
  isViewOnly: boolean;
}

const VectorStoreManagement: React.FC<VectorStoreProps> = ({ accessToken, userID, userRole, isViewOnly }) => {
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
  const [isLoadingVectorStores, setIsLoadingVectorStores] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vectorStoreToDelete, setVectorStoreToDelete] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [selectedVectorStoreId, setSelectedVectorStoreId] = useState<string | null>(null);
  const [editVectorStore, setEditVectorStore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canCreateVectorStores = isProxyAdminRole(userRole || "") && !isViewOnly;
  const defaultTab = canCreateVectorStores ? "create" : "manage";
  const { onTabChange, hasVisited } = useVisitedTabs(defaultTab);

  const fetchVectorStores = async () => {
    if (!accessToken) {
      setIsLoadingVectorStores(false);
      return;
    }
    try {
      const response = await vectorStoreListCall(accessToken);
      setVectorStores(response.data || []);
    } catch (error) {
      console.error("Error fetching vector stores:", error);
      toast.fromError("获取 向量库 失败：" + error);
    } finally {
      setIsLoadingVectorStores(false);
    }
  };

  const fetchCredentials = async () => {
    if (!accessToken || !canCreateVectorStores) return;
    try {
      const response = await credentialListCall(accessToken);
      setCredentials(response.credentials || []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      toast.fromError("获取凭据失败：" + error);
    }
  };

  const handleRefreshClick = () => {
    fetchVectorStores();
    fetchCredentials();
    const currentDate = new Date();
    setLastRefreshed(currentDate.toLocaleString());
  };

  const handleDelete = async (vectorStoreId: string) => {
    setVectorStoreToDelete(vectorStoreId);
    setIsDeleteModalOpen(true);
  };

  const handleView = (vectorStoreId: string) => {
    setSelectedVectorStoreId(vectorStoreId);
    setEditVectorStore(false);
  };

  const handleEdit = (vectorStoreId: string) => {
    setSelectedVectorStoreId(vectorStoreId);
    setEditVectorStore(true);
  };

  const handleCloseInfo = () => {
    setSelectedVectorStoreId(null);
    setEditVectorStore(false);
    fetchVectorStores();
  };

  const confirmDelete = async () => {
    if (!accessToken || !vectorStoreToDelete) return;
    setIsDeleting(true);
    try {
      await vectorStoreDeleteCall(accessToken, vectorStoreToDelete);
      toast.success("向量库 删除成功");
      fetchVectorStores();
    } catch (error) {
      console.error("Error deleting vector store:", error);
      toast.fromError("删除 向量库 失败：" + error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setVectorStoreToDelete(null);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalVisible(false);
    fetchVectorStores();
  };

  const handleVectorStoreCreated = (vectorStoreId: string) => {
    fetchVectorStores();
    // Optionally switch to the manage tab
  };

  useEffect(() => {
    fetchVectorStores();
    fetchCredentials();
  }, [accessToken]);

  return selectedVectorStoreId ? (
    <div className="w-full h-full">
      <VectorStoreInfoView
        vectorStoreId={selectedVectorStoreId}
        onClose={handleCloseInfo}
        accessToken={accessToken}
        is_admin={isAdminRole(userRole || "")}
        editVectorStore={editVectorStore}
      />
    </div>
  ) : (
    <div className="mx-4">
      <div className="gap-2 p-8 w-full mt-2">
        <div className="flex justify-between mt-2 w-full items-center mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">向量库 管理</h1>
          <div className="flex items-center space-x-2">
            {lastRefreshed && <p className="text-sm text-muted-foreground">上次刷新： {lastRefreshed}</p>}
            <Button variant="outline" size="icon-sm" aria-label="刷新" onClick={handleRefreshClick}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          你可以使用 向量库 存储和检索 LLM 向量。
        </p>

        <Tabs defaultValue={defaultTab} onValueChange={onTabChange}>
          <TabsList variant="line" className="mb-6 h-auto w-full justify-start rounded-none p-0">
            {canCreateVectorStores && (
              <TabsTrigger value="create" className="flex-none rounded-none px-4 py-2">
                创建 向量库
              </TabsTrigger>
            )}
            <TabsTrigger value="manage" className="flex-none rounded-none px-4 py-2">
              管理 向量库
            </TabsTrigger>
            <TabsTrigger value="test" className="flex-none rounded-none px-4 py-2">
              测试 向量库
            </TabsTrigger>
            {isProxyAdminRole(userRole || "") && (
              <TabsTrigger value="indexes" className="flex-none rounded-none px-4 py-2">
                索引
              </TabsTrigger>
            )}
          </TabsList>

          {canCreateVectorStores && (
            <TabsContent keepMounted={hasVisited("create")} value="create">
              <CreateVectorStore accessToken={accessToken} onSuccess={handleVectorStoreCreated} />
            </TabsContent>
          )}

          <TabsContent keepMounted={hasVisited("manage")} value="manage">
            {canCreateVectorStores && (
              <Button className="mb-4" onClick={() => setIsCreateModalVisible(true)}>
                + 添加 向量库
              </Button>
            )}

            <div className="grid grid-cols-1 gap-2 pt-2 pb-2 w-full mt-2">
              <VectorStoreTable
                data={vectorStores}
                isLoading={isLoadingVectorStores}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </TabsContent>

          <TabsContent keepMounted={hasVisited("test")} value="test">
            <TestVectorStoreTab accessToken={accessToken} vectorStores={vectorStores} />
          </TabsContent>

          {isProxyAdminRole(userRole || "") && (
            <TabsContent keepMounted={hasVisited("indexes")} value="indexes">
              <IndexesTab accessToken={accessToken} vectorStores={vectorStores} onViewVectorStore={handleView} />
            </TabsContent>
          )}
        </Tabs>

        {/* Create Vector Store Modal */}
        <VectorStoreForm
          isVisible={isCreateModalVisible}
          onCancel={() => setIsCreateModalVisible(false)}
          onSuccess={handleCreateSuccess}
          accessToken={accessToken}
          credentials={credentials}
        />

        {/* Delete Confirmation Modal */}
        <DeleteResourceModal
          isOpen={isDeleteModalOpen}
          title="删除 向量库"
          message="确定要删除此 向量库 吗？此操作无法撤销。"
          resourceInformationTitle="向量库 信息"
          resourceInformation={[{ label: "向量库 ID", value: vectorStoreToDelete, code: true }]}
          onCancel={() => setIsDeleteModalOpen(false)}
          onOk={confirmDelete}
          confirmLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default VectorStoreManagement;
