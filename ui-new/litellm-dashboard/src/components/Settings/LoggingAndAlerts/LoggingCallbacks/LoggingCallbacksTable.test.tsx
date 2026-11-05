import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoggingCallbacksTable } from "./LoggingCallbacksTable";

const baseVars = {
  SLACK_WEBHOOK_URL: null,
  LANGFUSE_PUBLIC_KEY: null,
  LANGFUSE_SECRET_KEY: null,
  LANGFUSE_HOST: null,
  OPENMETER_API_KEY: null,
};

describe("LoggingCallbacksTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders distinct 成功 and 失败 badges for same-name dual registration", () => {
    render(<LoggingCallbacksTable callbacks={[]} availableCallbacks={{}} />);
    expect(screen.getByText("活跃的日志 Callback")).toBeInTheDocument();
  });

  it("should show the empty state when there are no callbacks", () => {
    render(<LoggingCallbacksTable callbacks={[]} availableCallbacks={{}} />);
    expect(screen.getByText("尚未配置 Callback")).toBeInTheDocument();
    expect(screen.getByText("添加第一个 Callback，将日志数据发送到外部服务。")).toBeInTheDocument();
  });

  it("should show skeleton rows while loading", () => {
    render(<LoggingCallbacksTable callbacks={[]} availableCallbacks={{}} isLoading />);
    expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
    expect(screen.queryByText("尚未配置 Callback")).not.toBeInTheDocument();
  });

  it('should map "otel" to "OpenTelemetry" on the table', () => {
    render(
      <LoggingCallbacksTable
        callbacks={[{ name: "otel", variables: baseVars }]}
        availableCallbacks={{
          otel: {
            litellm_callback_name: "otel",
            litellm_callback_params: [],
            ui_callback_name: "OpenTelemetry",
          },
        }}
      />,
    );
    expect(screen.getByText("OpenTelemetry")).toBeInTheDocument();
  });

  it("should fallback to original callback name when not in availableCallbacks", () => {
    render(
      <LoggingCallbacksTable
        callbacks={[{ name: "custom_callback_x", variables: baseVars }]}
        availableCallbacks={{}}
      />,
    );
    expect(screen.getByText("custom_callback_x")).toBeInTheDocument();
  });

  it("should call onAdd when the 添加 Callback button is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<LoggingCallbacksTable callbacks={[]} availableCallbacks={{}} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: /add callback/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("should call onAdd when the 添加 Callback button is clicked", async () => {
    const user = userEvent.setup();
    const onTest = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const callback = { name: "langfuse", type: "success" as const, variables: baseVars };
    render(
      <LoggingCallbacksTable
        callbacks={[callback]}
        availableCallbacks={{}}
        onTest={onTest}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTestId("callback-actions-langfuse-success"));
    await user.click(await screen.findByTestId("callback-action-test"));
    expect(onTest).toHaveBeenCalledWith(callback);

    await user.click(screen.getByTestId("callback-actions-langfuse-success"));
    await user.click(await screen.findByTestId("callback-action-edit"));
    expect(onEdit).toHaveBeenCalledWith(callback);

    await user.click(screen.getByTestId("callback-actions-langfuse-success"));
    await user.click(await screen.findByTestId("callback-action-delete"));
    expect(onDelete).toHaveBeenCalledWith(callback);
  });

  it("shows a read-only label instead of the actions menu for runtime-only callback rows", () => {
    render(
      <LoggingCallbacksTable
        callbacks={[
          { name: "langfuse", type: "success" as const, variables: baseVars },
          { name: "datadog", type: "success" as const, variables: baseVars, read_only: true },
        ]}
        availableCallbacks={{}}
        onTest={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId("callback-actions-langfuse-success")).toBeInTheDocument();
    expect(screen.queryByTestId("callback-actions-datadog-success")).not.toBeInTheDocument();
    expect(screen.getAllByText("只读")).toHaveLength(1);
  });

  // Regression: `/get_callbacks` returns the same `name` twice when a
  // callback is registered for both success and failure (e.g. `generic_api`
  // → POST to spend-log on both 200 and 4xx/5xx). The UI used to ignore
  // the `type` field and render every row as "Success", masking the
  // failure registration. Reading `record.type` fixes the badge AND
  // composing the row id with type avoids React's duplicate-key warning.
  it("renders distinct 成功 and 失败 badges for same-name dual registration", () => {
    render(
      <LoggingCallbacksTable
        callbacks={[
          { name: "generic_api", type: "success", variables: baseVars },
          { name: "generic_api", type: "failure", variables: baseVars },
        ]}
        availableCallbacks={{
          generic_api: {
            litellm_callback_name: "generic_api",
            litellm_callback_params: [],
            ui_callback_name: "Custom Callback API",
          },
        }}
      />,
    );
    expect(screen.getAllByText("Custom Callback API")).toHaveLength(2);
    expect(screen.getByText("成功")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
  });
});
