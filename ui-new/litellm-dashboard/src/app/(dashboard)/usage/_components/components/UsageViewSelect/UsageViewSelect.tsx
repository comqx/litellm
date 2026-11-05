import { BarChart3, Bot, Building2, Globe, LineChart, ShoppingCart, Tags, User, Users } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasCapability, type Capability } from "@/utils/capabilities";
import { all_admin_roles } from "@/utils/roles";
export type UsageOption =
  | "global"
  | "my-usage"
  | "organization"
  | "team"
  | "customer"
  | "tag"
  | "agent"
  | "user"
  | "user-agent-activity";
export interface UsageViewSelectProps {
  value: UsageOption;
  onChange: (value: UsageOption) => void;
  userRole: string | null;
  canViewTagUsage?: boolean;
  isOrgAdmin?: boolean;
  title?: string;
  description?: string;
  "data-id"?: string;
}
interface OptionConfig {
  value: UsageOption;
  label: string;
  description: string;
  icon: React.ReactNode;
  capability?: Capability;
  adminOnly?: boolean;
  showForAdmin?: string;
  showForNonAdmin?: string;
  descriptionForAdmin?: string;
  descriptionForNonAdmin?: string;
  badgeText?: string;
}
const OPTIONS: OptionConfig[] = [
  {
    value: "global",
    label: "全局用量",
    showForAdmin: "全局用量",
    showForNonAdmin: "我的用量",
    description: "查看所有资源的用量",
    descriptionForAdmin: "查看所有资源的用量",
    descriptionForNonAdmin: "查看你的用量",
    icon: <Globe className="size-4" />,
  },
  {
    value: "my-usage",
    label: "我的用量",
    description: "查看你自己的用量",
    icon: <User className="size-4" />,
    adminOnly: true,
  },
  {
    value: "organization",
    label: "组织用量",
    description: "查看所有组织的用量",
    icon: <Building2 className="size-4" />,
    capability: "viewOrganizationUsage",
  },
  {
    value: "team",
    label: "Team 用量",
    description: "按 Team 查看用量",
    icon: <Users className="size-4" />,
  },
  {
    value: "customer",
    label: "客户用量",
    description: "按客户账号查看用量",
    icon: <ShoppingCart className="size-4" />,
    adminOnly: true,
  },
  {
    value: "tag",
    label: "Tag 用量",
    description: "按 Tag 分组查看用量",
    icon: <Tags className="size-4" />,
    adminOnly: true,
  },
  {
    value: "agent",
    label: "Agent 用量 (A2A)",
    description: "按 AI Agent 查看用量",
    icon: <Bot className="size-4" />,
    capability: "viewAgentUsage",
  },
  {
    value: "user",
    label: "用户用量",
    description: "按用户查看用量",
    icon: <User className="size-4" />,
    adminOnly: true,
  },
  {
    value: "user-agent-activity",
    label: "用户 Agent 活动",
    description: "查看详细的用户 Agent 活动日志",
    icon: <LineChart className="size-4" />,
    adminOnly: true,
  },
];
export const UsageViewSelect: React.FC<UsageViewSelectProps> = ({
  value,
  onChange,
  userRole,
  canViewTagUsage = false,
  isOrgAdmin = false,
  title = "用量视图",
  description = "选择要查看的用量数据",
  "data-id": dataId,
}) => {
  const isAdmin = all_admin_roles.includes(userRole ?? "");
  const getFilteredOptions = () => {
    return OPTIONS.filter((option) => {
      if (option.capability) {
        return hasCapability(userRole, option.capability, isOrgAdmin);
      }
      if (option.value === "tag" && canViewTagUsage) {
        return true;
      }
      if (option.adminOnly && !isAdmin) {
        return false;
      }
      return true;
    }).map((option) => {
      let label = option.label;
      let desc = option.description;
      if (option.showForAdmin && option.showForNonAdmin) {
        label = isAdmin ? option.showForAdmin : option.showForNonAdmin;
      }
      if (option.descriptionForAdmin && option.descriptionForNonAdmin) {
        desc = isAdmin ? option.descriptionForAdmin : option.descriptionForNonAdmin;
      }
      return {
        value: option.value,
        label,
        description: desc,
        icon: option.icon,
        badgeText: option.badgeText,
      };
    });
  };
  const filteredOptions = getFilteredOptions();
  const selectedOption = filteredOptions.find((option) => option.value === value);
  return (
    <div className="flex items-center gap-3" data-id={dataId}>
      <h1 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <BarChart3 aria-hidden="true" className="size-4" strokeWidth={2} />
        {title}
      </h1>
      <Select
        value={value}
        onValueChange={(next: UsageOption | null) => {
          if (next) onChange(next);
        }}
      >
        <SelectTrigger aria-label={description} className="h-8 w-52">
          <SelectValue>
            {selectedOption && (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                <span className="text-sm">{selectedOption.label}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        {/* Sized to its content rather than the narrow trigger, so descriptions never clip. */}
        <SelectContent align="start" className="w-auto min-w-72 p-1">
          {filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-md py-2 pr-8 pl-2">
              <span className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-muted-foreground">{option.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm leading-5 text-foreground">{option.label}</span>
                  <span className="block text-xs leading-4 text-muted-foreground">{option.description}</span>
                </span>
                {option.badgeText && <Badge>{option.badgeText}</Badge>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
