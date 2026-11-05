import type { RoleMappings as RoleMappingsType } from "@/app/(dashboard)/hooks/sso/useSSOSettings";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../../tests/test-utils";
import RoleMappings from "./RoleMappings";

describe("RoleMappings", () => {
  it("should render successfully", () => {
    const roleMappings: RoleMappingsType = {
      provider: "generic",
      group_claim: "groups",
      default_role: "internal_user",
      roles: {
        proxy_admin: ["admin-group"],
        proxy_admin_viewer: [],
        internal_user: ["user-group"],
        internal_user_viewer: [],
      },
    };

    renderWithProviders(<RoleMappings roleMappings={roleMappings} />);

    expect(screen.getByText("角色映射")).toBeInTheDocument();
  });

  it("should return null when roleMappings is undefined", () => {
    const { container } = renderWithProviders(<RoleMappings roleMappings={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should display Group Claim and Default Role with correct values and display names", () => {
    const testCases: Array<{ role: RoleMappingsType["default_role"]; displayName: string; groupClaim: string }> = [
      { role: "internal_user_viewer", displayName: "内部查看者", groupClaim: "custom-groups-1" },
      { role: "internal_user", displayName: "内部用户", groupClaim: "custom-groups-2" },
      { role: "proxy_admin_viewer", displayName: "Proxy 管理员查看者", groupClaim: "custom-groups-3" },
      { role: "proxy_admin", displayName: "Proxy 管理员", groupClaim: "custom-groups-4" },
    ];

    testCases.forEach(({ role, displayName, groupClaim }) => {
      const roleMappings: RoleMappingsType = {
        provider: "generic",
        group_claim: groupClaim,
        default_role: role,
        roles: {
          proxy_admin: [],
          proxy_admin_viewer: [],
          internal_user: [],
          internal_user_viewer: [],
        },
      };

      const { unmount } = renderWithProviders(<RoleMappings roleMappings={roleMappings} />);

      expect(screen.getByText("组声明")).toBeInTheDocument();
      expect(screen.getByText(groupClaim)).toBeInTheDocument();
      expect(screen.getByText("默认角色")).toBeInTheDocument();
      const displayNameElements = screen.getAllByText(displayName);
      expect(displayNameElements.length).toBeGreaterThan(0);
      unmount();
    });
  });

  it("should display table with roles, groups as Tags when mapped, and 'No groups mapped' when empty", () => {
    const roleMappings: RoleMappingsType = {
      provider: "generic",
      group_claim: "groups",
      default_role: "internal_user",
      roles: {
        proxy_admin: ["admin-group-1", "admin-group-2", "admin-group-3"],
        proxy_admin_viewer: ["viewer-group"],
        internal_user: ["user-group"],
        internal_user_viewer: [],
      },
    };

    renderWithProviders(<RoleMappings roleMappings={roleMappings} />);

    expect(screen.getByText("角色")).toBeInTheDocument();
    expect(screen.getByText("已映射组")).toBeInTheDocument();
    expect(screen.getAllByText("Proxy 管理员").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Proxy 管理员查看者").length).toBeGreaterThan(0);
    expect(screen.getAllByText("内部用户").length).toBeGreaterThan(0);
    expect(screen.getAllByText("内部查看者").length).toBeGreaterThan(0);
    expect(screen.getByText("admin-group-1")).toBeInTheDocument();
    expect(screen.getByText("admin-group-2")).toBeInTheDocument();
    expect(screen.getByText("admin-group-3")).toBeInTheDocument();
    expect(screen.getByText("viewer-group")).toBeInTheDocument();
    expect(screen.getByText("user-group")).toBeInTheDocument();
    expect(screen.getByText("未映射任何组")).toBeInTheDocument();
  });
});
