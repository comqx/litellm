import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CloudZeroEmptyPlaceholder from "./CloudZeroEmptyPlaceholder";

describe("CloudZeroEmptyPlaceholder", () => {
  it("should render", () => {
    const startCreation = vi.fn();
    render(<CloudZeroEmptyPlaceholder startCreation={startCreation} />);

    expect(screen.getByText("未找到 CloudZero 集成")).toBeInTheDocument();
    expect(screen.getByText(/Connect your CloudZero account/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加 CloudZero 集成" })).toBeInTheDocument();
  });
});
