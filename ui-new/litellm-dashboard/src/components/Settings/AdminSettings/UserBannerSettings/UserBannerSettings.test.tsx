import { renderWithProviders, screen } from "../../../../../tests/test-utils";
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import UserBannerSettings from "./UserBannerSettings";
import { UserBanner } from "@/components/networking";

vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: vi.fn(() => ({ accessToken: "token" })),
}));

vi.mock("@/app/(dashboard)/hooks/userBanner/useUserBanner", () => ({
  useUserBanner: vi.fn(),
}));

vi.mock("@/app/(dashboard)/hooks/userBanner/useUpdateUserBanner", () => ({
  useUpdateUserBanner: vi.fn(),
}));

import { useUserBanner } from "@/app/(dashboard)/hooks/userBanner/useUserBanner";
import { useUpdateUserBanner } from "@/app/(dashboard)/hooks/userBanner/useUpdateUserBanner";

const publishedBanner: UserBanner = {
  enabled: true,
  message: "**Maintenance** tonight at 10 PM UTC.",
  severity: "warning",
  revision: "rev-a",
};

const mockHooks = (banner: UserBanner | undefined, mutate = vi.fn()) => {
  vi.mocked(useUserBanner).mockReturnValue({ data: banner, isLoading: false } as any);
  vi.mocked(useUpdateUserBanner).mockReturnValue({ mutate, isPending: false } as any);
  return mutate;
};

describe("UserBannerSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds the form from the persisted banner", () => {
    mockHooks(publishedBanner);
    renderWithProviders(<UserBannerSettings />);
    expect(screen.getByLabelText("消息内容")).toHaveValue(publishedBanner.message);
    expect(screen.getByRole("switch", { name: "发布用户横幅" })).toHaveAttribute("data-checked");
  });

  it("shows a live markdown preview with the selected severity icon", () => {
    mockHooks(publishedBanner);
    const { container } = renderWithProviders(<UserBannerSettings />);
    expect(screen.getByText("发布前请填写消息内容。")).toBeInTheDocument();
    expect(container.querySelector(".lucide-triangle-alert")).toBeInTheDocument();
  });

  it("saves the edited draft", () => {
    const mutate = mockHooks(publishedBanner);
    renderWithProviders(<UserBannerSettings />);
    fireEvent.change(screen.getByLabelText("消息内容"), { target: { value: "New announcement" } });
    fireEvent.click(screen.getByRole("button", { name: "保存横幅" }));
    expect(mutate).toHaveBeenCalledWith(
      { enabled: true, message: "New announcement", severity: "warning" },
      expect.anything(),
    );
  });

  it("blocks saving a published banner with an empty message", () => {
    const mutate = mockHooks(publishedBanner);
    renderWithProviders(<UserBannerSettings />);
    fireEvent.change(screen.getByLabelText("消息内容"), { target: { value: "   " } });
    expect(screen.getByText("发布前请填写消息内容。")).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "保存横幅" });
    fireEvent.click(saveButton);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("allows unpublishing without a message", () => {
    const mutate = mockHooks({ enabled: false, message: "", severity: "info", revision: "" });
    renderWithProviders(<UserBannerSettings />);
    fireEvent.click(screen.getByRole("button", { name: "保存横幅" }));
    expect(mutate).toHaveBeenCalledWith({ enabled: false, message: "", severity: "info" }, expect.anything());
  });

  it.each([
    ["info", "信息"],
    ["warning", "警告"],
    ["error", "错误"],
  ])("shows the %s severity by its human label", (severity, label) => {
    mockHooks({ ...publishedBanner, severity: severity as UserBanner["severity"] });
    renderWithProviders(<UserBannerSettings />);

    expect(screen.getByRole("combobox", { name: "横幅严重程度" })).toHaveTextContent(label);
  });
});
