import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SafeMarkdown } from "../safe-markdown";

describe("SafeMarkdown Component", () => {
  it("renders plain text and basic formatting safely", () => {
    const markdown = "Hello **world** and *italic* text with `inline code`";
    const { container } = render(<SafeMarkdown content={markdown} />);

    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("world").tagName).toBe("STRONG");
    expect(screen.getByText("italic")).toBeInTheDocument();
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("inline code")).toBeInTheDocument();
    expect(screen.getByText("inline code").tagName).toBe("CODE");
  });

  it("renders headings, lists, blockquotes, and fenced code blocks", () => {
    const markdown = [
      "# Main Header",
      "## Sub Header",
      "> Quoted message",
      "- List item 1",
      "- List item 2",
      "```typescript",
      "const x = 42;",
      "```",
    ].join("\n");

    const { container } = render(<SafeMarkdown content={markdown} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Main Header");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sub Header");
    expect(screen.getByText("Quoted message")).toBeInTheDocument();
    expect(screen.getByText("List item 1")).toBeInTheDocument();
    expect(screen.getByText("List item 2")).toBeInTheDocument();
    expect(container.querySelector("pre")).toHaveTextContent("const x = 42;");
  });

  it("renders safe HTTPS and HTTP links with rel and target", () => {
    const markdown = "Check the [documentation](https://docs.kinetic.app) for details.";
    render(<SafeMarkdown content={markdown} />);

    const link = screen.getByRole("link", { name: "documentation" });
    expect(link).toHaveAttribute("href", "https://docs.kinetic.app");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("neutralizes malicious javascript: and data: links", () => {
    const markdown = "Click [here](javascript:alert(document.cookie)) or [here](data:text/html,<script>alert(1)</script>)";
    const { container } = render(<SafeMarkdown content={markdown} />);

    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getAllByText("here")).toHaveLength(2);
  });

  it("escapes raw HTML and script tags as text nodes rather than executable markup", () => {
    const payload = "<script>alert('xss')</script><img src=x onerror=alert(1)><strong>not injected</strong>";
    const { container } = render(<SafeMarkdown content={payload} />);

    // Must not create script or img DOM nodes
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    // The raw string content is present as plain escaped text
    expect(container.textContent).toContain("<script>alert('xss')</script>");
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
