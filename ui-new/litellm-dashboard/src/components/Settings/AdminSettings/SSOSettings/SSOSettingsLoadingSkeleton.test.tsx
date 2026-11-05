import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../../tests/test-utils";
import SSOSettingsLoadingSkeleton from "./SSOSettingsLoadingSkeleton";

describe("SSOSettingsLoadingSkeleton", () => {
  it("should render", () => {
    renderWithProviders(<SSOSettingsLoadingSkeleton />);

    expect(screen.getByRole("heading", { name: "SSO 配置" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "正在加载 SSO 配置" })).toBeInTheDocument();
  });

  it("should explain which configuration is loading", () => {
    renderWithProviders(<SSOSettingsLoadingSkeleton />);

    expect(screen.getByText("管理单点登录（SSO）认证设置")).toBeInTheDocument();
  });

  it("should render the complete action and configuration skeleton", () => {
    const { container } = renderWithProviders(<SSOSettingsLoadingSkeleton />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(12);
    expect(container.querySelectorAll('[data-slot="skeleton"].h-8')).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="skeleton"].h-4.w-20')).toHaveLength(5);
    ["w-24", "w-48", "w-60", "w-44", "w-52"].forEach((width) => {
      expect(container.querySelector(`[data-slot="skeleton"].h-4.${width}`)).toBeInTheDocument();
    });
  });
});
