import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "../breadcrumbs";

describe("Breadcrumbs component", () => {
  it("renders home link and breadcrumb items", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Engineering Core", href: "/workspaces/eng" },
          { label: "Board" },
        ]}
      />
    );

    expect(screen.getByRole("navigation", { name: /breadcrumbs/i })).toBeInTheDocument();
    expect(screen.getByText("Engineering Core")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
  });

  it("marks the last item with aria-current='page'", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Workspace", href: "/workspaces/ws1" },
          { label: "Settings" },
        ]}
      />
    );

    const activeItem = screen.getByText("Settings");
    expect(activeItem).toHaveAttribute("aria-current", "page");
  });
});
