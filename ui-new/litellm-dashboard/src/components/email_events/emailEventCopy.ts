import { EmailEvent } from "../../types";

const EMAIL_EVENT_LABEL_ZH: Readonly<Record<string, string>> = {
  "Virtual Key Created": "创建 Virtual Key",
  "New User Invitation": "新用户邀请",
  "Virtual Key Rotated": "轮换 Virtual Key",
  "Soft Budget Crossed": "软预算超限",
  "Max Budget Alert": "最大预算告警",
} as const;

const EMAIL_EVENT_DESCRIPTION_ZH: Readonly<Record<string, string>> = {
  "Virtual Key Created": "当使用用户 ID 创建新的 Virtual Key 时，向该用户发送邮件",
  "New User Invitation": "创建新用户时，向该用户的邮箱地址发送邮件",
  "Virtual Key Rotated": "Virtual Key 轮换时向相关用户发送邮件",
  "Soft Budget Crossed": "spend 越过软预算阈值时发送邮件通知",
  "Max Budget Alert": "spend 达到或超过最大预算时发送邮件通知",
} as const;

export function emailEventLabelZh(event: EmailEvent): string {
  return EMAIL_EVENT_LABEL_ZH[event] ?? event;
}

export function emailEventDescriptionZh(event: EmailEvent): string {
  if (EMAIL_EVENT_DESCRIPTION_ZH[event]) {
    return EMAIL_EVENT_DESCRIPTION_ZH[event];
  }
  const words = event
    .split(/(?=[A-Z])/)
    .join(" ")
    .toLowerCase();
  return `在「${words}」发生时接收邮件通知`;
}
