/**
 * The parent pane, showing list of budgets
 *
 */

import { Page, PageTabs, PageTabsList, PageTabsTrigger } from "@/components/shared/Page";
import { Plus, Wallet } from "lucide-react";
import React, { useCallback, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useSyntaxTheme } from "@/hooks/useSyntaxTheme";
import { PageHeader, PageHeaderControls, PageHeaderDescription, PageHeaderTitle } from "@/components/shared/PageHeader";
import { ToolbarSeparator } from "@/components/shared/ToolbarSeparator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteResourceModal from "@/components/common_components/DeleteResourceModal";
import { toast } from "@/lib/toast";
import { useBudgetList, useDeleteBudget, budgetItem } from "@/app/(dashboard)/hooks/budgets/useBudgets";
import BudgetModal from "./budget_modal";
import BudgetTable from "./BudgetTable";
import EditBudgetModal from "./edit_budget_modal";
import { CREATE_END_USER_CURL_COMMAND, CHAT_COMPLETIONS_CURL_COMMAND, OPENAI_SDK_PYTHON_CODE } from "./constants";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { isProxyAdminRole } from "@/utils/roles";

interface BudgetSettingsPageProps {
  accessToken: string | null;
}

const BudgetPanel: React.FC<BudgetSettingsPageProps> = ({ accessToken }) => {
  const syntaxTheme = useSyntaxTheme(prism);
  const [isCreateModelVisible, setIsCreateModelVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<budgetItem | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { userRole } = useAuthorized();
  // Admin Viewer follows the read-parity rule: see budgets, no writes.
  const canModify = isProxyAdminRole(userRole ?? "");

  const budgetList = useBudgetList();
  const deleteBudget = useDeleteBudget();

  // Stable identities keep the memoized column defs stable; new ones remount every header and cell.
  const handleEditCall = useCallback(
    (budget: budgetItem) => {
      if (accessToken == null) {
        return;
      }
      setSelectedBudget(budget);
      setIsEditModalVisible(true);
    },
    [accessToken],
  );

  const handleDeleteClick = useCallback((budget: budgetItem) => {
    setSelectedBudget(budget);
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!selectedBudget || accessToken == null) {
      return;
    }
    try {
      await deleteBudget.mutateAsync(selectedBudget.budget_id);
      toast.success("预算已删除。");
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.fromError("删除预算 失败");
    } finally {
      setIsDeleteModalVisible(false);
      setSelectedBudget(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
  };

  return (
    <Page className="h-full">
      <PageTabs defaultValue="budgets">
        <PageHeader>
          <PageHeaderTitle>
            <Wallet />
            预算
          </PageHeaderTitle>
          <PageHeaderDescription>可分配给客户的花费、TPM 和 RPM 限制。</PageHeaderDescription>
          <PageHeaderControls>
            <PageTabsList>
              {canModify && (
                <>
                  <Button onClick={() => setIsCreateModelVisible(true)}>
                    <Plus className="size-4" />
                    创建预算
                  </Button>
                  <ToolbarSeparator className="mx-0 h-6" />
                </>
              )}
              <PageTabsTrigger value="budgets">预算</PageTabsTrigger>
              <PageTabsTrigger value="examples">示例</PageTabsTrigger>
            </PageTabsList>
          </PageHeaderControls>
        </PageHeader>
        <TabsContent value="budgets" className="flex min-h-0 flex-1 flex-col" keepMounted>
          <div className="flex min-h-0 flex-1 flex-col">
            <BudgetModal isModalVisible={isCreateModelVisible} setIsModalVisible={setIsCreateModelVisible} />
            {selectedBudget && (
              <EditBudgetModal
                isModalVisible={isEditModalVisible}
                setIsModalVisible={setIsEditModalVisible}
                existingBudget={selectedBudget}
              />
            )}
            <BudgetTable
              list={budgetList}
              canModify={canModify}
              onEditClick={handleEditCall}
              onDeleteClick={handleDeleteClick}
            />
            <DeleteResourceModal
              isOpen={isDeleteModalVisible}
              title="删除预算？"
              message="确定要删除此预算吗？此操作无法撤销。"
              resourceInformationTitle="预算信息"
              resourceInformation={[
                { label: "预算 ID", value: selectedBudget?.budget_id, code: true },
                { label: "预算上限", value: selectedBudget?.max_budget },
                { label: "TPM", value: selectedBudget?.tpm_limit },
                { label: "RPM", value: selectedBudget?.rpm_limit },
                { label: "TPD（批处理）", value: selectedBudget?.tpd_limit },
              ]}
              onCancel={handleDeleteCancel}
              onOk={handleDeleteConfirm}
              confirmLoading={deleteBudget.isPending}
            />
          </div>
        </TabsContent>
        <TabsContent value="examples" className="min-h-0 flex-1 overflow-y-auto" keepMounted>
          <div className="pt-6">
            <p className="text-base text-muted-foreground">如何使用 预算 ID</p>
            <Tabs defaultValue="assign-budget">
              <TabsList variant="line" className="h-auto w-full justify-start rounded-none border-b p-0">
                <TabsTrigger value="assign-budget" className="flex-none rounded-none px-4 py-2">
                  为客户分配预算
                </TabsTrigger>
                <TabsTrigger value="curl" className="flex-none rounded-none px-4 py-2">
                  Test it (Curl)
                </TabsTrigger>
                <TabsTrigger value="openai-sdk" className="flex-none rounded-none px-4 py-2">
                  Test it (OpenAI SDK)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="assign-budget" keepMounted>
                <SyntaxHighlighter language="bash" style={syntaxTheme}>
                  {CREATE_END_USER_CURL_COMMAND}
                </SyntaxHighlighter>
              </TabsContent>
              <TabsContent value="curl" keepMounted>
                <SyntaxHighlighter language="bash" style={syntaxTheme}>
                  {CHAT_COMPLETIONS_CURL_COMMAND}
                </SyntaxHighlighter>
              </TabsContent>
              <TabsContent value="openai-sdk" keepMounted>
                <SyntaxHighlighter language="python" style={syntaxTheme}>
                  {OPENAI_SDK_PYTHON_CODE}
                </SyntaxHighlighter>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </PageTabs>
    </Page>
  );
};

export default BudgetPanel;
