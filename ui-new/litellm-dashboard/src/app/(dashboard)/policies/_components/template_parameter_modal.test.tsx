import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/../tests/test-utils";
import TemplateParameterModal from "./template_parameter_modal";

const { modelHubCall, enrichPolicyTemplateStream } = vi.hoisted(() => ({
  modelHubCall: vi.fn(),
  enrichPolicyTemplateStream: vi.fn(),
}));

vi.mock("@/components/networking", () => ({ modelHubCall, enrichPolicyTemplateStream }));

type StreamResult = { competitors: string[]; competitor_variations?: Record<string, string[]> };
type StreamArgs = [
  token: string,
  templateId: string,
  params: Record<string, string>,
  model: string,
  onName: (name: string) => void,
  onDone: (result: StreamResult) => void,
];

interface TestTemplate {
  id: string;
  title: string;
  llm_enrichment?: { parameter: string };
  parameters: { name: string; label: string; type: string; required: boolean; placeholder?: string }[];
}

const plainTemplate: TestTemplate = {
  id: "tpl-plain",
  title: "Basic Redaction",
  parameters: [
    { name: "org_name", label: "Organization Name", type: "string", required: true, placeholder: "e.g. Contoso" },
    { name: "note", label: "Note", type: "string", required: false, placeholder: "optional note" },
  ],
};

const enrichmentTemplate: TestTemplate = {
  id: "tpl-competitor",
  title: "Competitor Blocking",
  llm_enrichment: { parameter: "brand_name" },
  parameters: [{ name: "brand_name", label: "你的品牌名称", type: "string", required: true }],
};

const defaultProps = {
  visible: true,
  template: plainTemplate,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  accessToken: "sk-test",
};

const renderModal = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<TemplateParameterModal {...defaultProps} {...props} />);

describe("TemplateParameterModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelHubCall.mockResolvedValue({ data: [{ model_group: "gpt-5.1" }] });
  });

  it("renders nothing while closed", () => {
    renderModal({ visible: false });

    expect(screen.queryByText("Basic Redaction")).not.toBeInTheDocument();
  });

  it("shows the template title and purpose when opened", async () => {
    renderModal();

    expect(await screen.findByText("竞品发现")).toBeInTheDocument();
    expect(screen.getByText("为你的品牌配置竞品拦截")).toBeInTheDocument();
  });

  it("renders exactly one labelled field per template parameter", async () => {
    renderModal();

    // Exactly one: a plain template used to render every parameter twice, once from
    // the shared list and again from a duplicate no-enrichment branch.
    expect(await screen.findByText("Organization Name")).toBeInTheDocument();
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("e.g. Contoso")).toHaveLength(1);
    expect(screen.getAllByPlaceholderText("optional note")).toHaveLength(1);
  });

  it("keeps Continue disabled until every required parameter is filled", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Basic Redaction");
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("e.g. Contoso"), { target: { value: "Contoso" } });

    expect(screen.getByRole("button", { name: "继续" })).toBeEnabled();
  });

  it("hands the entered parameters back to the caller", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await screen.findByText("Basic Redaction");
    fireEvent.change(screen.getByPlaceholderText("e.g. Contoso"), { target: { value: "Contoso" } });
    await user.click(screen.getByRole("button", { name: "继续" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toEqual({ org_name: "Contoso", note: "" });
  });

  it("cancels back to the caller", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderModal({ onCancel });

    await screen.findByText("Basic Redaction");
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("offers AI discovery controls for an enrichment template", async () => {
    renderModal({ template: enrichmentTemplate });

    expect(await screen.findByText("竞品发现")).toBeInTheDocument();
    expect(screen.getByText("你的品牌名称")).toBeInTheDocument();
    expect(screen.getByText("选择 Model")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Competitor Names/ })).toBeInTheDocument();
  });

  it("loads the model list for an enrichment template", async () => {
    renderModal({ template: enrichmentTemplate });

    await waitFor(() => {
      expect(modelHubCall).toHaveBeenCalledWith("sk-test");
    });
  });

  it("hides the model picker when competitors are entered manually", async () => {
    const user = userEvent.setup();
    renderModal({ template: enrichmentTemplate });

    await screen.findByText("竞品发现");
    await user.click(screen.getByText("手动输入"));

    await waitFor(() => {
      expect(screen.queryByText("选择 Model")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Generate Competitor Names/ })).not.toBeInTheDocument();
  });

  it("keeps Continue disabled for an enrichment template until competitors exist", async () => {
    const user = userEvent.setup();
    renderModal({ template: enrichmentTemplate });

    await screen.findByText("竞品发现");
    fireEvent.change(screen.getByPlaceholderText("例如：Acme Airlines"), { target: { value: "Contoso" } });

    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
  });

  it("streams discovered competitor names and enables Continue once they arrive", async () => {
    enrichPolicyTemplateStream.mockImplementation(async (...args: StreamArgs) => {
      const [, , , , onName, onDone] = args;
      onName("Northwind");
      onDone({ competitors: ["Northwind", "Fabrikam"], competitor_variations: {} });
    });
    const user = userEvent.setup();
    renderModal({ template: enrichmentTemplate });

    await screen.findByText("竞品发现");
    fireEvent.change(screen.getByPlaceholderText("例如：Acme Airlines"), { target: { value: "Contoso" } });
    await user.click(screen.getAllByRole("combobox")[0]);
    const options = await screen.findAllByText("gpt-5.1");
    await user.click(options[options.length - 1]);
    await user.click(screen.getByRole("button", { name: /Generate Competitor Names/ }));

    expect(await screen.findByText("Northwind")).toBeInTheDocument();
    expect(screen.getByText("Fabrikam")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "继续" })).toBeEnabled();
    });
  });

  it("passes the discovered competitors to the caller on confirm", async () => {
    enrichPolicyTemplateStream.mockImplementation(async (...args: StreamArgs) => {
      const [, , , , , onDone] = args;
      onDone({ competitors: ["Northwind"] });
    });
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ template: enrichmentTemplate, onConfirm });

    await screen.findByText("竞品发现");
    fireEvent.change(screen.getByPlaceholderText("例如：Acme Airlines"), { target: { value: "Contoso" } });
    await user.click(screen.getAllByRole("combobox")[0]);
    const options = await screen.findAllByText("gpt-5.1");
    await user.click(options[options.length - 1]);
    await user.click(screen.getByRole("button", { name: /Generate Competitor Names/ }));
    await screen.findByText("Northwind");
    await user.click(screen.getByRole("button", { name: "继续" }));

    expect(onConfirm).toHaveBeenCalledWith({ brand_name: "Contoso" }, { competitors: ["Northwind"] });
  });
});
