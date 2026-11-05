"use client";

import { useDisableBlogPosts } from "@/app/(dashboard)/hooks/useDisableBlogPosts";
import { useDisableShowPrompts } from "@/app/(dashboard)/hooks/useDisableShowPrompts";
import { useHideDocsLink } from "@/app/(dashboard)/hooks/useUiChromeHideFlags";
import { BlogDropdown } from "@/components/Navbar/BlogDropdown/BlogDropdown";
import { DOCS_URL } from "@/components/Navbar/DocsLink/DocsLink";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cva.config";
import { BookOpen, Slack } from "lucide-react";
import Link from "next/link";
import React from "react";

const SLACK_URL = "https://www.litellm.ai/support";

interface SidebarResourceLinksProps {
  collapsed: boolean;
}

export const SidebarResourceLinks: React.FC<SidebarResourceLinksProps> = ({ collapsed }) => {
  const hideDocs = useHideDocsLink();
  const hideCommunityLinks = useDisableShowPrompts();
  const disableBlogPosts = useDisableBlogPosts();

  const hasAnyLink = !hideDocs || !disableBlogPosts || !hideCommunityLinks;
  if (!hasAnyLink) {
    return null;
  }

  const docsLink = hideDocs ? null : collapsed ? (
    <Link
      href={DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="文档"
      title="文档"
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
    >
      <BookOpen className="size-4" aria-hidden />
    </Link>
  ) : (
    <Link
      href={DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      文档
    </Link>
  );

  const slackLink =
    hideCommunityLinks ? null : collapsed ? (
      <Link
        href={SLACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="加入 Slack"
        title="LiteLLM Slack 社区"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <Slack className="size-4" aria-hidden />
      </Link>
    ) : (
      <Link
        href={SLACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        加入 Slack
      </Link>
    );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-2 pb-2">
        {docsLink}
        {slackLink}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 border-t border-sidebar-border px-3 py-2">
      {docsLink}
      {!disableBlogPosts ? <BlogDropdown /> : null}
      {slackLink}
    </div>
  );
};

export default SidebarResourceLinks;
