import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/lib/toast";
import {
  cancelModelCostMapReload,
  getModelCostMapReloadStatus,
  getModelCostMapSource,
  reloadModelCostMap,
  scheduleModelCostMapReload,
} from "./networking";
import PriceDataReload from "./price_data_reload";

vi.mock("./networking", () => ({
  cancelModelCostMapReload: vi.fn(),
  getModelCostMapReloadStatus: vi.fn(),
  getModelCostMapSource: vi.fn(),
  reloadModelCostMap: vi.fn(),
  scheduleModelCostMapReload: vi.fn(),
}));

const unscheduledStatus = { scheduled: false, interval_hours: null, last_run: null, next_run: null };
const scheduledStatus = {
  scheduled: true,
  interval_hours: 6,
  last_run: null,
  next_run: "2026-01-21T00:00:00Z",
};
const remoteSource = {
  source: "remote",
  url: "https://pricing.example.test/model_prices.json",
  is_env_forced: false,
  fallback_reason: null,
  loaded_at: null,
  source_revision: null,
  etag: null,
  model_count: 1234,
};
const provenance = {
  loaded_at: "2026-09-07T10:00:00Z",
  source_revision: "4273ec544726bf255ea920533e209e6022653bb4",
  etag: 'W/"eb8e9a53f4cc284b"',
};

describe("PriceDataReload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getModelCostMapReloadStatus).mockResolvedValue(unscheduledStatus);
    vi.mocked(getModelCostMapSource).mockResolvedValue(remoteSource as never);
  });

  it("shows the pricing source and current reload status", async () => {
    render(<PriceDataReload accessToken="sk-test" />);

    expect(await screen.findByText("价格数据源")).toBeInTheDocument();
    expect(screen.getByText("远程")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("未设置定时重载")).toBeInTheDocument();
  });

  it("shows which revision of the cost map is loaded when the source reports one", async () => {
    vi.mocked(getModelCostMapSource).mockResolvedValue({ ...remoteSource, ...provenance } as never);
    render(<PriceDataReload accessToken="sk-test" />);

    expect(await screen.findByText("源版本：")).toBeInTheDocument();
    expect(screen.getByText("4273ec544726")).toBeInTheDocument();
    expect(screen.getByText("ETag:")).toBeInTheDocument();
    expect(screen.getByText('W/"eb8e9a53f4cc284b"')).toBeInTheDocument();
    expect(screen.getByText("加载时间：")).toBeInTheDocument();
    expect(screen.getByText(/worker that answered this request/)).toBeInTheDocument();
    expect(screen.getByText(/Last run time is the latest reload any worker recorded/)).toBeInTheDocument();
    expect(screen.getByText(new Date(provenance.loaded_at).toLocaleString())).toBeInTheDocument();
  });

  it("shows a malformed loaded_at as-is instead of Invalid Date", async () => {
    vi.mocked(getModelCostMapSource).mockResolvedValue({
      ...remoteSource,
      ...provenance,
      loaded_at: "yesterday-ish",
    } as never);
    render(<PriceDataReload accessToken="sk-test" />);

    expect(await screen.findByText("加载时间：")).toBeInTheDocument();
    expect(screen.getByText("yesterday-ish")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("hides the provenance rows when the loaded map carries no stamp", async () => {
    render(<PriceDataReload accessToken="sk-test" />);

    expect(await screen.findByText("价格数据源")).toBeInTheDocument();
    expect(screen.queryByText("源版本：")).not.toBeInTheDocument();
    expect(screen.queryByText("ETag:")).not.toBeInTheDocument();
    expect(screen.queryByText("加载时间：")).not.toBeInTheDocument();
    expect(screen.queryByText(/worker that answered this request/)).not.toBeInTheDocument();
  });

  it("confirms an immediate reload and refreshes dependent data", async () => {
    const user = userEvent.setup();
    const onReloadSuccess = vi.fn();
    vi.mocked(reloadModelCostMap).mockResolvedValue({ status: "success", models_count: 42 } as never);
    render(<PriceDataReload accessToken="sk-test" onReloadSuccess={onReloadSuccess} />);

    await user.click(screen.getByRole("button", { name: /Reload Price Data/ }));
    expect(screen.getByText("强制刷新价格数据")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "是" }));

    await waitFor(() => expect(reloadModelCostMap).toHaveBeenCalledWith("sk-test"));
    expect(onReloadSuccess).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("价格数据重载成功！已更新 42 个模型。");
  });

  it("schedules periodic reloads using the selected interval", async () => {
    const user = userEvent.setup();
    vi.mocked(scheduleModelCostMapReload).mockResolvedValue({ status: "success" } as never);
    render(<PriceDataReload accessToken="sk-test" />);

    await user.click(screen.getByRole("button", { name: /Set Up Periodic Reload/ }));
    expect(screen.getByRole("dialog", { name: "设置定时重载" })).toBeInTheDocument();
    const hours = screen.getByRole("spinbutton", { name: "重载间隔（小时）" });
    await user.clear(hours);
    fireEvent.change(hours, { target: { value: "12" } });
    await user.click(screen.getByRole("button", { name: "确定" }));

    await waitFor(() => expect(scheduleModelCostMapReload).toHaveBeenCalledWith("sk-test", 12));
    expect(toast.success).toHaveBeenCalledWith("已设置每 12 小时自动重载");
  });

  it.each(["-1", "1.5", "169"])("should reject an invalid periodic reload interval of %s hours", async (interval) => {
    const user = userEvent.setup();
    render(<PriceDataReload accessToken="sk-test" />);

    await user.click(screen.getByRole("button", { name: /Set Up Periodic Reload/ }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: interval } });
    await user.click(screen.getByRole("button", { name: "确定" }));

    expect(scheduleModelCostMapReload).not.toHaveBeenCalled();
    expect(toast.fromError).toHaveBeenCalledWith("小时数须为 1 至 168 之间的整数");
  });

  it.each([1, 168])("should schedule a periodic reload at the inclusive %s-hour boundary", async (interval) => {
    const user = userEvent.setup();
    vi.mocked(scheduleModelCostMapReload).mockResolvedValue({ status: "success" } as never);
    render(<PriceDataReload accessToken="sk-test" />);

    await user.click(screen.getByRole("button", { name: /Set Up Periodic Reload/ }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: String(interval) } });
    await user.click(screen.getByRole("button", { name: "确定" }));

    await waitFor(() => expect(scheduleModelCostMapReload).toHaveBeenCalledWith("sk-test", interval));
  });

  it("cancels an active periodic reload", async () => {
    const user = userEvent.setup();
    vi.mocked(getModelCostMapReloadStatus).mockResolvedValue(scheduledStatus);
    vi.mocked(cancelModelCostMapReload).mockResolvedValue({ status: "success" } as never);
    render(<PriceDataReload accessToken="sk-test" />);

    await user.click(await screen.findByRole("button", { name: /Cancel Periodic Reload/ }));

    await waitFor(() => expect(cancelModelCostMapReload).toHaveBeenCalledWith("sk-test"));
    expect(toast.success).toHaveBeenCalledWith("已取消定时重载");
  });
});
