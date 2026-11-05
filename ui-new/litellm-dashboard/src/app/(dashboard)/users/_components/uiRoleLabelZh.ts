const ROLE_KEY_LABELS: Readonly<Record<string, string>> = {
  internal_user: "内部用户（创建/删除/查看）",
  proxy_admin: "管理员（全部权限）",
};

const UI_LABEL_LABELS: Readonly<Record<string, string>> = {
  "Internal User (Create/Delete/View)": "内部用户（创建/删除/查看）",
  "Admin (All Permissions)": "管理员（全部权限）",
  Admin: "管理员（全部权限）",
};

export function uiRoleLabelZh(roleKey: string | null | undefined, uiLabel: string | undefined): string {
  if (roleKey && ROLE_KEY_LABELS[roleKey]) return ROLE_KEY_LABELS[roleKey];
  if (uiLabel && UI_LABEL_LABELS[uiLabel]) return UI_LABEL_LABELS[uiLabel];
  return uiLabel || roleKey || "-";
}
