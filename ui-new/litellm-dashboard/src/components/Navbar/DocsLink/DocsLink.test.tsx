import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { NAV_PRODUCT_LINK_CLASS } from "@/components/Navbar/navProductLinkClass";
import i18n from "@/i18n/i18n";
import { DocsLink } from "./DocsLink";

const sharedClasses = NAV_PRODUCT_LINK_CLASS.trim().split(/\s+/);

const renderDocsLink = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <DocsLink />
    </I18nextProvider>,
  );

describe("DocsLink", () => {
  it("opens the docs in a new tab without leaking the opener", () => {
    renderDocsLink();

    const link = screen.getByRole("link", { name: "文档" });
    expect(link).toHaveAttribute("href", "https://docs.litellm.ai/docs/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("carries the same product-link styling as the Blog trigger, so the two never drift apart", () => {
    renderDocsLink();

    const link = screen.getByRole("link", { name: "文档" });
    for (const cls of sharedClasses) {
      expect(link).toHaveClass(cls);
    }
    expect(link).not.toHaveClass("text-muted-foreground");
  });

  it("carries a focus ring, so tabbing to Docs looks like tabbing to Blog", () => {
    renderDocsLink();

    const link = screen.getByRole("link", { name: "文档" });
    expect(link).toHaveClass("focus-visible:ring-3");
    expect(link).toHaveClass("focus-visible:ring-ring/50");
  });

  it("stays a link rather than being relabelled as a button by the Button primitive", () => {
    renderDocsLink();

    expect(screen.getByRole("link", { name: "文档" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "文档" })).not.toBeInTheDocument();
  });
});
