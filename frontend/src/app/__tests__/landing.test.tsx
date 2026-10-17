import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../page";

describe("LandingPage", () => {
  it("renders product identity and tagline", () => {
    render(<LandingPage />);

    expect(screen.getAllByText("Kinetic").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Move work forward/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/together\./i).length).toBeGreaterThan(0);
  });

  it("renders call to action links to register and login", () => {
    render(<LandingPage />);

    const getStartedLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
    expect(getStartedLinks[0]).toHaveAttribute("href", "/register");

    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute("href", "/login");
  });

  it("renders feature highlight pillars", () => {
    render(<LandingPage />);

    expect(screen.getByText("Real-Time Kanban Boards")).toBeInTheDocument();
    expect(screen.getByText("Role-Based Workspaces")).toBeInTheDocument();
    expect(screen.getByText("Strict Concurrency & Audit")).toBeInTheDocument();
  });
});
