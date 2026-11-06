import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useHealthReadinessDetails } from "@/app/(dashboard)/hooks/healthReadiness/useHealthReadinessDetails";
import { useDisableBlogPosts } from "@/app/(dashboard)/hooks/useDisableBlogPosts";
import { useDisableBouncingIcon } from "@/app/(dashboard)/hooks/useDisableBouncingIcon";
import { useDisableLiteAdmin } from "@/app/(dashboard)/hooks/useDisableLiteAdmin";
import { useDisableShowNewBadge } from "@/app/(dashboard)/hooks/useDisableShowNewBadge";
import { useDisableShowPrompts } from "@/app/(dashboard)/hooks/useDisableShowPrompts";
import { emitLocalStorageChange, removeLocalStorageItem, setLocalStorageItem } from "@/utils/localStorageUtils";
import { navAccountDisplayName } from "@/components/Navbar/navDisplayName";
import CopyButton from "@/components/shared/CopyButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cva.config";
import { uiHref } from "@/utils/uiHref";
import { isProxyAdminRole } from "@/utils/roles";
import { ChevronsUpDown, Crown, IdCard, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const RELEASE_NOTES_URL = "https://docs.litellm.ai/release_notes";

function hueFromString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

function initialsFromIdentity(email: string | null, userId: string | null): string {
  const local = email?.split("@")[0]?.trim();
  if (local) {
    const parts = local
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      const p = parts[0]!;
      return p.length >= 2 ? p.slice(0, 2).toUpperCase() : `${p.charAt(0)}`.toUpperCase();
    }
  }
  if (userId && userId.length >= 2) {
    return userId.slice(0, 2).toUpperCase();
  }
  if (userId && userId.length === 1) {
    return `${userId.toUpperCase()}•`;
  }
  return "?";
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="flex min-h-[34px] items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      {icon}
      {label}
    </span>
    {children}
  </div>
);

const MonoValue: React.FC<{ value: string | null; copyLabel: string }> = ({ value, copyLabel }) => (
  <span className="flex min-w-0 items-center gap-1">
    <span className="max-w-[150px] truncate font-mono text-[13px] font-medium text-foreground" title={value || "-"}>
      {value || "-"}
    </span>
    <CopyButton value={value} label={copyLabel} />
  </span>
);

interface SidebarAccountMenuProps {
  onLogout: () => void;
  collapsed?: boolean;
}

const SidebarAccountMenu: React.FC<SidebarAccountMenuProps> = ({ onLogout, collapsed = false }) => {
  const {
    userId,
    userEmail,
    userRole: role,
    userRoleLabel: userRole,
    isViewOnly,
    premiumUser,
    accessToken,
    loginMethod,
  } = useAuthorized();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { data: healthData } = useHealthReadinessDetails(accessToken);
  const version = healthData?.litellm_version;
  const disableShowPrompts = useDisableShowPrompts();
  const disableBlogPosts = useDisableBlogPosts();
  const disableBouncingIcon = useDisableBouncingIcon();
  const disableShowNewBadge = useDisableShowNewBadge();
  const [disableLiteAdmin, setDisableLiteAdmin] = useDisableLiteAdmin(userId);
  const canUseLiteAdmin = userId && !isViewOnly && isProxyAdminRole(role);

  const setFlag = (key: string, checked: boolean) => {
    if (checked) {
      setLocalStorageItem(key, "true");
    } else {
      removeLocalStorageItem(key);
    }
    emitLocalStorageChange(key);
  };

  const toggles = [
    {
      key: "disableShowNewBadge",
      label: "隐藏新功能标识",
      ariaLabel: "切换隐藏新功能标识",
      checked: disableShowNewBadge,
      onCheckedChange: (checked: boolean) => setFlag("disableShowNewBadge", checked),
    },
    {
      key: "disableShowPrompts",
      label: "隐藏文档链接",
      ariaLabel: "切换隐藏文档链接",
      checked: disableShowPrompts,
      onCheckedChange: (checked: boolean) => setFlag("disableShowPrompts", checked),
    },
    {
      key: "disableBlogPosts",
      label: "隐藏博客",
      ariaLabel: "切换隐藏博客",
      checked: disableBlogPosts,
      onCheckedChange: (checked: boolean) => setFlag("disableBlogPosts", checked),
    },
    {
      key: "disableBouncingIcon",
      label: "隐藏跳动图标",
      ariaLabel: "切换隐藏跳动图标",
      checked: disableBouncingIcon,
      onCheckedChange: (checked: boolean) => setFlag("disableBouncingIcon", checked),
    },
  ];

  const seed = userEmail || userId || "user";
  const initials = initialsFromIdentity(userEmail, userId);
  const hue = hueFromString(seed);
  const displayName = navAccountDisplayName(userEmail, userId);
  const triggerLabel = `Account menu — ${userRole ?? "Unknown role"} — signed in as ${userEmail || userId || "unknown"}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center rounded-lg border border-transparent transition-colors hover:bg-sidebar-accent",
          collapsed ? "justify-center px-0 py-1" : "gap-2.5 px-2 py-1.5 text-left",
        )}
        aria-label={triggerLabel}
        title={collapsed ? displayName : undefined}
      >
        <Avatar className="size-[30px] shadow-inner ring-1 ring-black/5" aria-hidden>
          <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: `hsl(${hue} 46% 38%)` }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</span>
              {userRole && <span className="block truncate text-[11px] text-sidebar-foreground/65">{userRole}</span>}
            </span>
            <ChevronsUpDown
              size={16}
              strokeWidth={1.75}
              className="shrink-0 text-sidebar-foreground/65"
              aria-hidden
            />
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[268px] gap-0 overflow-hidden p-0"
        data-testid="sidebar-account-menu-panel"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <span className="text-[15px] font-bold tracking-tight text-foreground">LiteLLM</span>
          {!disableBouncingIcon && (
            <span
              className="animate-bounce text-lg leading-none"
              style={{ animationDuration: "2s" }}
              title="感谢使用 LiteLLM！"
              aria-hidden
            >
              🌴
            </span>
          )}
          <span className="flex-1" />
          {version && (
            <Badge
              variant="outline"
              render={<a href={RELEASE_NOTES_URL} target="_blank" rel="noopener noreferrer" />}
              className="px-1.5 py-0 font-mono text-[10px] font-medium text-muted-foreground"
            >
              v{version}
            </Badge>
          )}
        </div>

        <div className="flex flex-col px-3 py-2">
          <InfoRow icon={<Crown className="size-[17px]" />} label="版本">
            {premiumUser ? (
              <Badge variant="outline" className="gap-1 border-warning/30 bg-warning/10 text-warning">
                <Crown />
                高级版
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1" title="升级到高级版以使用高级功能">
                <Crown />
                标准版
              </Badge>
            )}
          </InfoRow>
          <InfoRow icon={<ShieldCheck className="size-[17px]" />} label="角色">
            <Badge variant="secondary">{userRole}</Badge>
          </InfoRow>
          <InfoRow icon={<Mail className="size-[17px]" />} label="邮箱">
            <MonoValue value={userEmail} copyLabel="复制邮箱" />
          </InfoRow>
          <InfoRow icon={<IdCard className="size-[17px]" />} label="用户 ID">
            <MonoValue value={userId} copyLabel="复制用户 ID" />
          </InfoRow>
        </div>

        <Separator />

        <div className="py-1">
          {toggles.map((toggle) => (
            <div key={toggle.key} className="flex h-[38px] items-center justify-between gap-3 px-3">
              <span className="text-[13px] text-foreground">{toggle.label}</span>
              <Switch
                size="sm"
                checked={toggle.checked}
                onCheckedChange={toggle.onCheckedChange}
                aria-label={toggle.ariaLabel}
              />
            </div>
          ))}
          {premiumUser === true && canUseLiteAdmin && (
            <div className="flex h-[38px] items-center justify-between gap-3 px-3">
              <span className="text-[13px] text-foreground">隐藏 LiteAdmin</span>
              <Switch
                size="sm"
                checked={disableLiteAdmin}
                onCheckedChange={setDisableLiteAdmin}
                aria-label="切换隐藏 LiteAdmin"
              />
            </div>
          )}
        </div>

        <Separator />

        {loginMethod === "username_password" && (
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              router.push(uiHref("change-password"));
            }}
            className="h-[42px] w-full justify-start gap-2.5 rounded-none px-3 text-sm font-medium text-foreground"
          >
            <KeyRound className="size-[19px] text-muted-foreground" />
            修改密码
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={onLogout}
          className="h-[42px] w-full justify-start gap-2.5 rounded-none px-3 text-sm font-medium text-foreground"
        >
          <LogOut className="size-[19px] text-muted-foreground" />
          退出登录
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default SidebarAccountMenu;
