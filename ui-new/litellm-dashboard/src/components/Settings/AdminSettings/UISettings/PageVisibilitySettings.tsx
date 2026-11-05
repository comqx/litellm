"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { getAvailablePages } from "@/components/page_utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PageVisibilitySettingsProps {
  enabledPagesInternalUsers: string[] | null | undefined;
  enabledPagesPropertyDescription?: string;
  isUpdating: boolean;
  onUpdate: (settings: { enabled_ui_pages_internal_users: string[] | null }) => void;
}

export default function PageVisibilitySettings({
  enabledPagesInternalUsers,
  enabledPagesPropertyDescription,
  isUpdating,
  onUpdate,
}: PageVisibilitySettingsProps) {
  const isPageVisibilitySet = enabledPagesInternalUsers !== null && enabledPagesInternalUsers !== undefined;
  const availablePages = useMemo(() => getAvailablePages(), []);
  const pagesByGroup = useMemo(() => {
    const grouped: Record<string, typeof availablePages> = {};
    availablePages.forEach((page) => {
      if (!grouped[page.group]) {
        grouped[page.group] = [];
      }
      grouped[page.group].push(page);
    });
    return grouped;
  }, [availablePages]);
  const [selectedPages, setSelectedPages] = useState<string[]>(enabledPagesInternalUsers || []);

  useMemo(() => {
    setSelectedPages(enabledPagesInternalUsers || []);
  }, [enabledPagesInternalUsers]);

  const togglePage = (page: string, checked: boolean) => {
    setSelectedPages((current) => (checked ? [...current, page] : current.filter((item) => item !== page)));
  };

  const handleSavePageVisibility = () => {
    onUpdate({ enabled_ui_pages_internal_users: selectedPages.length > 0 ? selectedPages : null });
  };

  const handleResetToDefault = () => {
    setSelectedPages([]);
    onUpdate({ enabled_ui_pages_internal_users: null });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">内部用户页面可见性</p>
          <Badge variant={isPageVisibilitySet ? "secondary" : "outline"}>
            {isPageVisibilitySet
              ? selectedPages.length === 1
                ? "已选 1 个页面"
                : `已选 ${selectedPages.length} 个页面`
              : "未设置（全部页面可见）"}
          </Badge>
        </div>
        {enabledPagesPropertyDescription && (
          <p className="text-sm text-muted-foreground">{enabledPagesPropertyDescription}</p>
        )}
        <p className="text-xs italic text-muted-foreground">
          默认情况下，内部用户可见全部页面。选择特定页面可限制可见范围。
        </p>
        <p className="text-xs text-primary">
          说明：此处仅列出内部用户角色可访问的页面。管理员专属页面不在列表中，无法通过此设置对内部用户开放。
        </p>
      </div>

      <Collapsible className="rounded-lg border border-border">
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
          配置页面可见性
          <ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border p-4">
          <div className="space-y-4">
            {Object.entries(pagesByGroup).map(([groupName, pages]) => (
              <fieldset key={groupName} className="space-y-2">
                <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {groupName}
                </legend>
                <div className="ml-4 space-y-2">
                  {pages.map((page) => {
                    const checkboxId = `page-visibility-${page.page}`;
                    return (
                      <label key={page.page} htmlFor={checkboxId} className="flex cursor-pointer items-start gap-2">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedPages.includes(page.page)}
                          onCheckedChange={(checked) => togglePage(page.page, checked === true)}
                        />
                        <span className="space-y-0.5">
                          <span className="block text-sm text-foreground">{page.label}</span>
                          <span className="block text-xs text-muted-foreground">{page.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSavePageVisibility} disabled={isUpdating}>
                保存页面可见性设置
              </Button>
              {isPageVisibilitySet && (
                <Button type="button" variant="outline" onClick={handleResetToDefault} disabled={isUpdating}>
                  恢复默认（全部页面）
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
