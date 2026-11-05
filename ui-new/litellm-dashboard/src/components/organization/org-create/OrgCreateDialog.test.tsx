import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/components/ModelSelect/ModelSelect", () => ({
  ModelSelect: ({ onChange }: { onChange: (values: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["gpt-5.2"])}>
      set-models
    </button>
  ),
}));
vi.mock("@/components/vector_store_management/VectorStoreSelector", () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (values: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["vs-1"])}>
      set-vector-stores
    </button>
  ),
}));
vi.mock("@/components/mcp_server_management/MCPServerSelector", () => ({
  __esModule: true,
  default: ({
    onChange,
  }: {
    onChange: (values: { servers: string[]; accessGroups: string[]; toolsets: string[] }) => void;
  }) => (
    <button type="button" onClick={() => onChange({ servers: ["srv-1"], accessGroups: [], toolsets: ["ts-1"] })}>
      set-mcp
    </button>
  ),
}));

import { OrgCreateDialog } from "./OrgCreateDialog";

const Harness = ({ createOrganization }: { createOrganization: (body: unknown) => Promise<unknown> }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      <OrgCreateDialog open={open} onOpenChange={setOpen} accessToken="token" createOrganization={createOrganization} />
    </>
  );
};

const renderDialog = (overrides?: { createOrganization?: Mock }) => {
  const createOrganization = overrides?.createOrganization ?? vi.fn().mockResolvedValue({});
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <Harness createOrganization={createOrganization} />
    </QueryClientProvider>,
  );
  return { createOrganization };
};

describe("OrgCreateDialog", () => {
  it("blocks submit and shows an error when the name is missing", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog();

    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("请Type Organization 名称");
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it("sends only alias and models for a minimal create and closes the dialog", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    expect(createOrganization.mock.calls[0][0]).toStrictEqual({ organization_alias: "new-org", models: [] });
    await waitFor(() => expect(screen.queryByLabelText("Organization 名称")).not.toBeInTheDocument());
  });

  it("creates with a sub-cent max budget the browser would veto under a 0.01 step", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    const budget: HTMLInputElement = screen.getByLabelText("Budget 上限 (USD)");
    await user.type(budget, "0.001");

    // jsdom never blocks the submit itself, so assert the constraint the real browser
    // enforces before handleSubmit ever runs
    expect(budget.checkValidity()).toBe(true);

    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    expect(createOrganization.mock.calls[0][0]).toStrictEqual({
      organization_alias: "new-org",
      models: [],
      max_budget: 0.001,
    });
  });

  it("maps selectors and limits into the create body", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.click(screen.getByRole("button", { name: "set-models" }));
    await user.type(screen.getByLabelText("每分钟 Token 数限制 (TPM)"), "1000");
    await user.click(screen.getByRole("button", { name: "set-vector-stores" }));
    await user.click(screen.getByRole("button", { name: "set-mcp" }));
    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    const expectedBody = {
      organization_alias: "new-org",
      models: ["gpt-5.2"],
      tpm_limit: 1000,
      object_permission: {
        vector_stores: ["vs-1"],
        mcp_servers: ["srv-1"],
        mcp_toolsets: ["ts-1"],
      },
    };
    expect(createOrganization.mock.calls[0][0]).toStrictEqual(expectedBody);
  });

  it("blocks submit and shows an error for invalid metadata JSON", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.type(screen.getByLabelText("元数据"), "not json");
    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("元数据必须是有效的 JSON 对象");
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the entered values when the create fails", async () => {
    const user = userEvent.setup();
    const { createOrganization } = renderDialog({
      createOrganization: vi.fn().mockRejectedValue(new Error("boom")),
    });

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.click(screen.getByRole("button", { name: "新建 Organization" }));

    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Organization 名称")).toHaveValue("new-org");
  });

  it("resets the form when the dialog is cancelled and reopened", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "abandoned");
    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByLabelText("Organization 名称")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "reopen" }));
    expect(screen.getByLabelText("Organization 名称")).toHaveValue("");
  });

  it("resets the form when the dialog is dismissed with Escape and reopened", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Organization 名称"), "abandoned");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByLabelText("Organization 名称")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "reopen" }));
    expect(screen.getByLabelText("Organization 名称")).toHaveValue("");
  });

  it("cannot be dismissed while a create is pending, then closes once on success", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: unknown) => void = () => {};
    const createOrganization = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderDialog({ createOrganization });

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));

    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("Organization 名称")).toHaveValue("new-org");

    resolveCreate({});
    await waitFor(() => expect(screen.queryByLabelText("Organization 名称")).not.toBeInTheDocument());
  });

  it("does not fire a second create while one is pending", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: unknown) => void = () => {};
    const createOrganization = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderDialog({ createOrganization });

    await user.type(screen.getByLabelText("Organization 名称"), "new-org");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    await user.keyboard("{Enter}");

    expect(createOrganization).toHaveBeenCalledTimes(1);
    resolveCreate({});
    await waitFor(() => expect(screen.queryByLabelText("Organization 名称")).not.toBeInTheDocument());
  });
});
