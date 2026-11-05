import { Page, PageContent } from "@/components/shared/Page";
import { AccessGroupResponse, useAccessGroups } from "@/app/(dashboard)/hooks/accessGroups/useAccessGroups";
import { useDeleteAccessGroup } from "@/app/(dashboard)/hooks/accessGroups/useDeleteAccessGroup";
import { Boxes, Plus, SearchIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import DeleteResourceModal from "@/components/common_components/DeleteResourceModal";
import { PageHeader, PageHeaderControls, PageHeaderDescription, PageHeaderTitle } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { AccessGroupDetail } from "./AccessGroupsDetailsPage";
import { AccessGroupCreateDialog } from "./access-group-create/AccessGroupCreateDialog";
import { AccessGroupsTable } from "./AccessGroupsTable";
import { AccessGroup } from "./types";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { isProxyAdminRole } from "@/utils/roles";

function mapResponseToAccessGroup(r: AccessGroupResponse): AccessGroup {
  return {
    id: r.access_group_id,
    name: r.access_group_name,
    description: r.description ?? "",
    modelIds: r.access_model_names,
    mcpServerIds: r.access_mcp_server_ids,
    agentIds: r.access_agent_ids,
    keyIds: r.assigned_key_ids,
    teamIds: r.assigned_team_ids,
    createdAt: r.created_at,
    createdBy: r.created_by ?? "",
    updatedAt: r.updated_at,
    updatedBy: r.updated_by ?? "",
  };
}

export function AccessGroupsPage() {
  const { userRole } = useAuthorized();
  // Admin Viewer follows the read-parity rule: see access groups, no writes.
  const canModify = isProxyAdminRole(userRole ?? "");
  const { data: groupsData, isLoading } = useAccessGroups();
  const groups = useMemo(() => (groupsData ?? []).map(mapResponseToAccessGroup), [groupsData]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<AccessGroup | null>(null);
  const deleteMutation = useDeleteAccessGroup();

  const filteredGroups = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.id.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query),
    );
  }, [groups, searchText]);

  if (selectedGroupId) {
    return <AccessGroupDetail accessGroupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />;
  }

  return (
    <Page>
      <PageHeader>
        <PageHeaderTitle>
          <Boxes />
          访问组
        </PageHeaderTitle>
        <PageHeaderDescription>管理组织的资源权限</PageHeaderDescription>
        {canModify && (
          <PageHeaderControls>
            <Button onClick={() => setIsCreateModalVisible(true)}>
              <Plus className="size-4" />
              新建 访问组
            </Button>
          </PageHeaderControls>
        )}
      </PageHeader>

      <PageContent className="gap-3">
        <div className="flex items-center">
          <InputGroup className="max-w-[400px]">
            <InputGroupAddon>
              <SearchIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="按名称、ID 或描述搜索分组…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" aria-label="清除搜索" onClick={() => setSearchText("")}>
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        <AccessGroupsTable
          groups={filteredGroups}
          isLoading={isLoading}
          isFiltered={searchText.trim().length > 0}
          canModify={canModify}
          onGroupClick={setSelectedGroupId}
          onDeleteClick={setGroupToDelete}
        />
      </PageContent>

      <AccessGroupCreateDialog open={isCreateModalVisible} onOpenChange={setIsCreateModalVisible} />

      <DeleteResourceModal
        isOpen={!!groupToDelete}
        title="删除 访问组"
        message="确定要删除此 访问组 吗？此操作无法撤销。"
        resourceInformationTitle="访问组 信息"
        resourceInformation={[
          { label: "ID", value: groupToDelete?.id, code: true },
          { label: "名称", value: groupToDelete?.name },
          { label: "描述", value: groupToDelete?.description || "—" },
        ]}
        onCancel={() => setGroupToDelete(null)}
        onOk={() => {
          if (!groupToDelete) return;
          deleteMutation.mutate(groupToDelete.id, {
            onSuccess: () => {
              setGroupToDelete(null);
            },
          });
        }}
        confirmLoading={deleteMutation.isPending}
      />
    </Page>
  );
}
