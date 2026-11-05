import { createLocalStorageBooleanFlag } from "./createLocalStorageBooleanFlag";

export const HIDE_DOCS_LINK_KEY = "hideDocsLink";
export const HIDE_NOTIFICATIONS_BELL_KEY = "hideNotificationsBell";
export const HIDE_SIDEBAR_RESOURCE_LINKS_KEY = "hideSidebarResourceLinks";

export const useHideDocsLink = createLocalStorageBooleanFlag(HIDE_DOCS_LINK_KEY);
export const useHideNotificationsBell = createLocalStorageBooleanFlag(HIDE_NOTIFICATIONS_BELL_KEY);
export const useHideSidebarResourceLinks = createLocalStorageBooleanFlag(HIDE_SIDEBAR_RESOURCE_LINKS_KEY);
