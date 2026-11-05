import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategoryFilter, QuickActions, PiiEntityList } from "./pii_components";
import type { PiiEntityCategory } from "@/components/guardrails/types";

describe("CategoryFilter", () => {
  it("should render", () => {
    const emptyCategories: PiiEntityCategory[] = [];
    render(<CategoryFilter categories={emptyCategories} selectedCategories={[]} onChange={() => {}} />);
    expect(screen.getByText("按类别筛选")).toBeInTheDocument();
  });
});

describe("QuickActions", () => {
  it("should render", () => {
    render(<QuickActions onSelectAll={() => {}} onUnselectAll={() => {}} hasSelectedEntities={false} />);
    expect(screen.getByText("快捷操作")).toBeInTheDocument();
  });
});

describe("PiiEntityList", () => {
  it("should render", () => {
    render(
      <PiiEntityList
        entities={[]}
        selectedEntities={[]}
        selectedActions={{}}
        actions={[]}
        onEntitySelect={() => {}}
        onActionSelect={() => {}}
        entityToCategoryMap={new Map()}
      />,
    );
    expect(screen.getByText("没有符合筛选条件的 PII 类型")).toBeInTheDocument();
  });
});
