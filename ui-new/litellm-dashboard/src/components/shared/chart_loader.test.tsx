import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartLoader } from "./chart_loader";

describe("ChartLoader", () => {
  it("should render", () => {
    render(<ChartLoader />);
    expect(screen.getByText("加载图表数据中…")).toBeInTheDocument();
  });

  it("should show loading text by default", () => {
    render(<ChartLoader />);
    expect(screen.getByText("Fetching your data")).toBeInTheDocument();
  });

  it("should show date-changing text when isDateChanging is true", () => {
    render(<ChartLoader isDateChanging />);
    expect(screen.getByText("正在处理日期选择…")).toBeInTheDocument();
    expect(screen.getByText("This will only take a moment")).toBeInTheDocument();
  });

  it("should not show default loading text when isDateChanging is true", () => {
    render(<ChartLoader isDateChanging />);
    expect(screen.queryByText("加载图表数据中…")).not.toBeInTheDocument();
    expect(screen.queryByText("Fetching your data")).not.toBeInTheDocument();
  });
});
