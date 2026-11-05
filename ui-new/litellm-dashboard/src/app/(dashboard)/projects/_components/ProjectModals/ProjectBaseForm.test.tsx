import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../../../../../tests/test-utils";
import { useZodForm } from "@/lib/forms/useZodForm";
import { ProjectBaseForm } from "./ProjectBaseForm";
import { emptyProjectFormValues, projectFormSchema } from "./projectFormSchema";

const mockUseTeams = vi.fn();
vi.mock("@/app/(dashboard)/hooks/teams/useTeams", () => ({
  useTeams: () => mockUseTeams(),
}));

const mockUseAuthorized = vi.fn();
vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: () => mockUseAuthorized(),
}));

vi.mock("@/components/organisms/create_key_button", () => ({
  fetchTeamModels: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/networking", () => ({
  getGuardrailsList: vi.fn().mockResolvedValue({ guardrails: [] }),
}));

vi.mock("@/components/key_team_helpers/fetch_available_models_team_key", () => ({
  getModelDisplayName: (model: string) => model,
}));

function FormWrapper() {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const form = useZodForm(projectFormSchema, { defaultValues: emptyProjectFormValues });
  return <ProjectBaseForm form={form} advancedOpen={advancedOpen} onAdvancedOpenChange={setAdvancedOpen} />;
}

describe("ProjectBaseForm", () => {
  beforeEach(() => {
    mockUseTeams.mockReturnValue({ data: [], isLoading: false });
    mockUseAuthorized.mockReturnValue({ accessToken: "token", userId: "admin-user", userRole: "Admin" });
  });

  it("should render", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByLabelText("项目名称")).toBeInTheDocument();
  });

  it("should show a 'Basic Information' section heading", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByText("基本信息")).toBeInTheDocument();
  });

  it("should show a Project Name input", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByPlaceholderText("例如：Customer Support Bot")).toBeInTheDocument();
  });

  it("should show a Team select", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByText("团队")).toBeInTheDocument();
  });

  it("should show a Description textarea", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByPlaceholderText("描述此 Project 的用途")).toBeInTheDocument();
  });

  it("should show the models select as disabled when no team is selected", () => {
    renderWithProviders(<FormWrapper />);
    // The models select should be disabled — its placeholder indicates no team yet
    expect(screen.getByText("请先选择团队")).toBeInTheDocument();
  });

  it("should show available team options when the Team dropdown is opened", async () => {
    const user = userEvent.setup();
    mockUseTeams.mockReturnValue({
      data: [
        { team_id: "team-1", team_alias: "Engineering", models: [] },
        { team_id: "team-2", team_alias: "Sales", models: [] },
      ],
      isLoading: false,
    });
    renderWithProviders(<FormWrapper />);
    // The form label "Team" is associated with the combobox input inside the Select
    await user.click(screen.getByLabelText("团队"));
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("should offer a team admin only the teams they administer", async () => {
    const user = userEvent.setup();
    mockUseAuthorized.mockReturnValue({ accessToken: "token", userId: "team-admin", userRole: "内部用户" });
    mockUseTeams.mockReturnValue({
      data: [
        {
          team_id: "team-1",
          team_alias: "Engineering",
          models: [],
          members_with_roles: [{ user_id: "team-admin", role: "admin" }],
        },
        {
          team_id: "team-2",
          team_alias: "Sales",
          models: [],
          members_with_roles: [{ user_id: "team-admin", role: "user" }],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<FormWrapper />);
    await user.click(screen.getByLabelText("团队"));
    expect(await screen.findByText("Engineering")).toBeInTheDocument();
    expect(screen.queryByText("Sales")).not.toBeInTheDocument();
  });

  it("should show the Max Budget field", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("should show the Advanced Settings collapse panel", () => {
    renderWithProviders(<FormWrapper />);
    expect(screen.getByText("高级设置")).toBeInTheDocument();
  });

  it("should show a Guardrails field in the Advanced Settings section", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FormWrapper />);
    await user.click(screen.getByText("高级设置"));
    await waitFor(() => {
      expect(screen.getByText("护栏")).toBeInTheDocument();
    });
  });

  it("should show combined, input, and output TPM limit inputs for a model row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FormWrapper />);
    await user.click(screen.getByText("高级设置"));
    await user.click(screen.getByRole("button", { name: /add model limit/i }));

    expect(screen.getByPlaceholderText("TPM 上限")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入 TPM 上限")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输出 TPM 上限")).toBeInTheDocument();
    expect(screen.getByLabelText("TPM 上限")).toBeInTheDocument();
    expect(screen.getByLabelText("输入 TPM 上限")).toBeInTheDocument();
    expect(screen.getByLabelText("输出 TPM 上限")).toBeInTheDocument();
  });
});
