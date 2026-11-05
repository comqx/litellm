import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../tests/test-utils";
import SCIMConfig from "./SCIM";
import { keyCreateCall } from "./networking";
import { toast } from "@/lib/toast";

vi.mock("./networking", () => ({
  keyCreateCall: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), fromError: vi.fn() },
}));

const ACCESS_TOKEN = "sk-access-token";
const USER_ID = "user-1234";

const renderSCIM = (props?: { accessToken?: string | null; userID?: string | null }) =>
  renderWithProviders(
    <SCIMConfig
      accessToken={props?.accessToken === undefined ? ACCESS_TOKEN : props.accessToken}
      userID={props?.userID === undefined ? USER_ID : props.userID}
      proxySettings={{ PROXY_BASE_URL: "https://proxy.example.com" }}
    />,
  );

describe("SCIMConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends exactly the SCIM key payload when a token name is submitted", async () => {
    vi.mocked(keyCreateCall).mockResolvedValue({ key: "sk-scim-generated" });
    const user = userEvent.setup();
    renderSCIM();

    fireEvent.change(screen.getByLabelText("令牌名称"), { target: { value: "My SCIM Token" } });
    await user.click(screen.getByRole("button", { name: /create scim token/i }));

    await waitFor(() => {
      expect(keyCreateCall).toHaveBeenCalledWith(ACCESS_TOKEN, USER_ID, {
        key_alias: "My SCIM Token",
        team_id: null,
        models: [],
        allowed_routes: ["/scim/*"],
      });
    });
  });

  it("blocks the submit and shows the required message when the token name is empty", async () => {
    const user = userEvent.setup();
    renderSCIM();

    await user.click(screen.getByRole("button", { name: /create scim token/i }));

    expect(await screen.findByText("请输入令牌名称")).toBeInTheDocument();
    expect(keyCreateCall).not.toHaveBeenCalled();
  });

  it("submits on Enter from the token name field", async () => {
    vi.mocked(keyCreateCall).mockResolvedValue({ key: "sk-scim-generated" });
    const user = userEvent.setup();
    renderSCIM();

    await user.type(screen.getByLabelText("令牌名称"), "Entered With Return{Enter}");

    await waitFor(() => {
      expect(keyCreateCall).toHaveBeenCalledWith(ACCESS_TOKEN, USER_ID, {
        key_alias: "Entered With Return",
        team_id: null,
        models: [],
        allowed_routes: ["/scim/*"],
      });
    });
  });

  it("reveals the created token and hides the creation form on success", async () => {
    vi.mocked(keyCreateCall).mockResolvedValue({ key: "sk-scim-generated" });
    const user = userEvent.setup();
    renderSCIM();

    fireEvent.change(screen.getByLabelText("令牌名称"), { target: { value: "My SCIM Token" } });
    await user.click(screen.getByRole("button", { name: /create scim token/i }));

    expect(await screen.findByText("你的 SCIM 令牌")).toBeInTheDocument();
    expect(screen.queryByLabelText("令牌名称")).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("SCIM 令牌创建成功");
  });

  it("returns to the creation form when creating another token", async () => {
    vi.mocked(keyCreateCall).mockResolvedValue({ key: "sk-scim-generated" });
    const user = userEvent.setup();
    renderSCIM();

    fireEvent.change(screen.getByLabelText("令牌名称"), { target: { value: "My SCIM Token" } });
    await user.click(screen.getByRole("button", { name: /create scim token/i }));
    await user.click(await screen.findByRole("button", { name: /create another token/i }));

    expect(await screen.findByLabelText("令牌名称")).toBeInTheDocument();
  });

  it("does not call the API when there is no access token", async () => {
    const user = userEvent.setup();
    renderSCIM({ accessToken: null });

    fireEvent.change(screen.getByLabelText("令牌名称"), { target: { value: "My SCIM Token" } });
    await user.click(screen.getByRole("button", { name: /create scim token/i }));

    await waitFor(() => {
      expect(toast.fromError).toHaveBeenCalledWith("需要登录后才能创建 SCIM 令牌");
    });
    expect(keyCreateCall).not.toHaveBeenCalled();
  });

  it("surfaces a creation failure and keeps the form mounted", async () => {
    vi.mocked(keyCreateCall).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderSCIM();

    fireEvent.change(screen.getByLabelText("令牌名称"), { target: { value: "My SCIM Token" } });
    await user.click(screen.getByRole("button", { name: /create scim token/i }));

    await waitFor(() => {
      expect(toast.fromError).toHaveBeenCalledWith("创建 SCIM 令牌失败：boom");
    });
    expect(screen.getByLabelText("令牌名称")).toBeInTheDocument();
  });

  it("shows the SCIM tenant URL derived from the proxy base url", () => {
    renderSCIM();

    expect(screen.getByDisplayValue("https://proxy.example.com/scim/v2")).toBeInTheDocument();
  });
});
