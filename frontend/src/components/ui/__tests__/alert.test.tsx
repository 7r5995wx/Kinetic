import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert, AlertTitle, AlertDescription } from "../alert";

describe("Alert component", () => {
  it("renders with role='alert'", () => {
    render(
      <Alert>
        <AlertTitle>Notice</AlertTitle>
        <AlertDescription>System update in progress.</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Notice")).toBeInTheDocument();
    expect(screen.getByText("System update in progress.")).toBeInTheDocument();
  });

  it("applies destructive styling", () => {
    const { container } = render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Operation failed.</AlertDescription>
      </Alert>
    );
    expect(container.firstChild).toHaveClass("text-destructive");
  });
});
