import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge component", () => {
  it("renders text content correctly", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies urgent priority variant styling", () => {
    const { container } = render(<Badge variant="urgent">URGENT</Badge>);
    expect(container.firstChild).toHaveClass("bg-rose-500/15");
  });

  it("applies high priority variant styling", () => {
    const { container } = render(<Badge variant="high">HIGH</Badge>);
    expect(container.firstChild).toHaveClass("bg-orange-500/15");
  });
});
