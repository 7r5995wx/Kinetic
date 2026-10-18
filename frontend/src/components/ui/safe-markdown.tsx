import * as React from "react";
import { cn } from "@/lib/utils";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Validates whether a URL protocol is safe for links.
 * Only HTTP and HTTPS (plus relative anchor fragments) are permitted.
 * Blocks javascript:, data:, vbscript:, file:, and other unsafe schemes.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("#")) {
    return true;
  }
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/**
 * Parses inline formatting:
 * - Code: `code`
 * - Links: [label](url) (only http/https)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 *
 * All raw text and HTML tags are rendered through React's native string rendering,
 * which escapes HTML entities and prevents XSS.
 */
function renderInlineFormatting(line: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Matches inline code (`...`), markdown links ([...](...)), bold (**...** or __...__),
  // strikethrough (~~...~~), and italic (*...* or _..._)
  const regex =
    /(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*[^*]+\*\*|__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*|_[^_]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    const nodeKey = `${keyPrefix}-${counter++}`;

    if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      // Inline code
      const codeContent = matchedStr.slice(1, -1);
      nodes.push(
        <code
          key={nodeKey}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] font-medium text-foreground border border-border/50"
        >
          {codeContent}
        </code>
      );
    } else if (match[2] && match[3] && match[4]) {
      // Markdown link [text](url)
      const linkText = match[3];
      const linkUrl = match[4].trim();

      if (isSafeUrl(linkUrl)) {
        nodes.push(
          <a
            key={nodeKey}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          >
            {linkText}
          </a>
        );
      } else {
        // Unsafe protocol: render as harmless plain text to avoid javascript: / data: execution
        nodes.push(
          <span key={nodeKey} className="text-muted-foreground underline decoration-dotted" title="Untrusted link protocol blocked">
            {linkText}
          </span>
        );
      }
    } else if (
      (matchedStr.startsWith("**") && matchedStr.endsWith("**")) ||
      (matchedStr.startsWith("__") && matchedStr.endsWith("__"))
    ) {
      // Bold
      const boldContent = matchedStr.slice(2, -2);
      nodes.push(
        <strong key={nodeKey} className="font-semibold text-foreground">
          {boldContent}
        </strong>
      );
    } else if (matchedStr.startsWith("~~") && matchedStr.endsWith("~~")) {
      // Strikethrough
      const strikeContent = matchedStr.slice(2, -2);
      nodes.push(
        <del key={nodeKey} className="line-through text-muted-foreground">
          {strikeContent}
        </del>
      );
    } else if (
      (matchedStr.startsWith("*") && matchedStr.endsWith("*")) ||
      (matchedStr.startsWith("_") && matchedStr.endsWith("_"))
    ) {
      // Italic
      const italicContent = matchedStr.slice(1, -1);
      nodes.push(
        <em key={nodeKey} className="italic text-foreground">
          {italicContent}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.substring(lastIndex));
  }

  return nodes;
}

/**
 * Safe AST-based Markdown component.
 * - Zero dangerouslySetInnerHTML
 * - Zero external dependencies
 * - Sanitizes link protocols
 * - Escapes all raw HTML and script tags
 */
export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  const blocks = React.useMemo(() => {
    if (!content) return [];

    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const result: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = "";
    let codeLines: string[] = [];

    let inList = false;
    let listType: "ul" | "ol" = "ul";
    let listItems: React.ReactNode[] = [];

    const flushList = (key: string) => {
      if (inList && listItems.length > 0) {
        if (listType === "ul") {
          result.push(
            <ul key={key} className="my-2 ml-5 list-disc space-y-1 text-sm text-foreground">
              {listItems}
            </ul>
          );
        } else {
          result.push(
            <ol key={key} className="my-2 ml-5 list-decimal space-y-1 text-sm text-foreground">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    const flushCodeBlock = (key: string) => {
      if (inCodeBlock) {
        result.push(
          <div key={key} className="my-3 overflow-hidden rounded-md border border-border bg-muted/60">
            {codeLanguage && (
              <div className="border-b border-border/40 bg-muted/80 px-3 py-1 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                {codeLanguage}
              </div>
            )}
            <pre className="overflow-x-auto p-3 font-mono text-xs text-foreground leading-relaxed">
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        codeLines = [];
        codeLanguage = "";
        inCodeBlock = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Handle Code Block fence ```
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          flushCodeBlock(`code-block-${index}`);
        } else {
          flushList(`flush-list-before-code-${index}`);
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          codeLines = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Empty line
      if (trimmed === "") {
        flushList(`flush-list-empty-${index}`);
        return;
      }

      // Horizontal rule
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushList(`flush-list-hr-${index}`);
        result.push(<hr key={`hr-${index}`} className="my-3 border-border" />);
        return;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        flushList(`flush-list-h3-${index}`);
        result.push(
          <h3 key={`h3-${index}`} className="mt-3 mb-1 text-sm font-semibold text-foreground">
            {renderInlineFormatting(trimmed.substring(4), `h3-${index}`)}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        flushList(`flush-list-h2-${index}`);
        result.push(
          <h2 key={`h2-${index}`} className="mt-3.5 mb-1.5 text-base font-semibold text-foreground">
            {renderInlineFormatting(trimmed.substring(3), `h2-${index}`)}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("# ")) {
        flushList(`flush-list-h1-${index}`);
        result.push(
          <h1 key={`h1-${index}`} className="mt-4 mb-2 text-lg font-bold text-foreground">
            {renderInlineFormatting(trimmed.substring(2), `h1-${index}`)}
          </h1>
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith("> ")) {
        flushList(`flush-list-bq-${index}`);
        result.push(
          <blockquote
            key={`bq-${index}`}
            className="my-2 border-l-2 border-primary/50 pl-3 italic text-sm text-muted-foreground"
          >
            {renderInlineFormatting(trimmed.substring(2), `bq-${index}`)}
          </blockquote>
        );
        return;
      }

      // Unordered list
      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!inList || listType !== "ul") {
          flushList(`flush-before-ul-${index}`);
          inList = true;
          listType = "ul";
        }
        listItems.push(
          <li key={`li-${index}`} className="leading-relaxed">
            {renderInlineFormatting(ulMatch[1], `li-${index}`)}
          </li>
        );
        return;
      }

      // Ordered list
      const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (olMatch) {
        if (!inList || listType !== "ol") {
          flushList(`flush-before-ol-${index}`);
          inList = true;
          listType = "ol";
        }
        listItems.push(
          <li key={`li-${index}`} className="leading-relaxed">
            {renderInlineFormatting(olMatch[2], `li-${index}`)}
          </li>
        );
        return;
      }

      // Default paragraph
      flushList(`flush-list-p-${index}`);
      result.push(
        <p key={`p-${index}`} className="my-1.5 text-sm leading-relaxed text-foreground break-words">
          {renderInlineFormatting(line, `p-${index}`)}
        </p>
      );
    });

    if (inCodeBlock) {
      flushCodeBlock(`code-block-end`);
    }
    if (inList) {
      flushList(`list-end`);
    }

    return result;
  }, [content]);

  return (
    <div className={cn("space-y-1 text-sm text-foreground", className)}>
      {blocks}
    </div>
  );
}
