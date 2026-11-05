import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SSOSettingsEmptyPlaceholder from "./SSOSettingsEmptyPlaceholder";

describe("SSOSettingsEmptyPlaceholder", () => {
  it("should render", () => {
    const onAdd = vi.fn();

    render(<SSOSettingsEmptyPlaceholder onAdd={onAdd} />);

    expect(screen.getByText("未找到 SSO 配置")).toBeInTheDocument();
    expect(screen.getByText("添加 SSO")).toBeInTheDocument();
  });
});
