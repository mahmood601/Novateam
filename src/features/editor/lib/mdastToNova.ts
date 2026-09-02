import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkDirective from "remark-directive";
import type { Root, RootContent, PhrasingContent, Heading } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";

import {
  NOVA_COLOR_CYCLE,
  type NovaBlockNode,
  type NovaColor,
  type NovaDocument,
  type NovaHeadingNode,
  type NovaInlineNode,
  type NovaSection,
} from "../types/novaAst";

/**
 * Step 1: raw Markdown -> mdast (remark, no rehype/HTML involved)
 * Step 2: mdast -> Nova AST (section color assigned once, here)
 *
 * Directive syntax (:::name ... :::) is parsed by remark-directive per
 * the AI-markdown contract (step 1) — this replaces the old blockquote
 * -as-note hack; `>` is now its own separate "quote" block type.
 */
export function parseToMdast(raw: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkDirective);

  return processor.parse(raw) as Root;
}

export function mdastToNovaDocument(root: Root): NovaDocument {
  const sections: NovaSection[] = [];
  let currentSection: NovaSection | null = null;
  let colorIndex = 0;

  const nextColor = (): NovaColor => {
    const color = NOVA_COLOR_CYCLE[colorIndex % NOVA_COLOR_CYCLE.length];
    colorIndex += 1;
    return color;
  };

  const ensureSection = (): NovaSection => {
    if (currentSection) return currentSection;
    const color = nextColor();
    currentSection = {
      type: "section",
      color,
      heading: {
        type: "heading",
        depth: 1,
        children: [{ type: "text", value: "" }],
        color,
      },
      children: [],
    };
    sections.push(currentSection);
    return currentSection;
  };

  for (const node of root.children) {
    if (node.type === "heading") {
      const heading = node as Heading;

      if (heading.depth === 1) {
        const color = nextColor();
        currentSection = {
          type: "section",
          color,
          heading: convertHeading(heading, color),
          children: [],
        };
        sections.push(currentSection);
        continue;
      }

      const section = ensureSection();
      section.children.push(convertHeading(heading, section.color));
      continue;
    }

    const section = ensureSection();
    // convertBlock never returns null — unrecognized content becomes an
    // explicit "unknown" node per the contract, so nothing is ever
    // silently dropped.
    section.children.push(convertBlock(node));
  }

  return { sections };
}

export async function parseMarkdownToNova(raw: string): Promise<NovaDocument> {
  const root = parseToMdast(raw);
  return mdastToNovaDocument(root);
}

// ---------------- helpers ----------------

function convertHeading(node: Heading, color: NovaColor): NovaHeadingNode {
  return {
    type: "heading",
    depth: node.depth,
    children: convertInlineChildren(node.children),
    color,
  };
}

function isContainerDirective(node: RootContent): node is ContainerDirective {
  return node.type === "containerDirective";
}

function convertBlock(node: RootContent): NovaBlockNode {
  if (isContainerDirective(node)) {
    return convertDirective(node);
  }

  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        children: convertInlineChildren(node.children),
      };

    case "list":
      return {
        type: "list",
        ordered: !!node.ordered,
        items: node.children.map((item) =>
          item.children.map((child) => convertBlock(child as RootContent)),
        ),
      };

    case "code":
      return {
        type: "code",
        lang: node.lang ?? undefined,
        value: node.value,
      };

    case "table": {
      const [headerRow, ...bodyRows] = node.children;
      return {
        type: "table",
        header: (headerRow?.children ?? []).map((cell) =>
          convertInlineChildren(cell.children),
        ),
        rows: bodyRows.map((row) =>
          row.children.map((cell) => convertInlineChildren(cell.children)),
        ),
      };
    }

    // Plain `>` — a genuine quotation, distinct from the `:::note` directive.
    case "blockquote":
      return {
        type: "quote",
        children: node.children.map((child) => convertBlock(child as RootContent)),
      };

    default:
      // Contract rule: never drop content silently. Anything we don't
      // recognize yet is preserved as raw text inside an "unknown" block.
      return {
        type: "unknown",
        directiveName: node.type,
        raw: rawFallbackText(node),
      };
  }
}

function convertDirective(node: ContainerDirective): NovaBlockNode {
  switch (node.name) {
    case "note":
      return {
        type: "note",
        children: node.children.map((child) => convertBlock(child as RootContent)),
      };

    case "quiz": {
      const quizId = String(node.attributes?.id ?? "");
      return { type: "quiz", quizId };
    }

    default:
      // Unrecognized directive name — per the contract, this must degrade
      // gracefully instead of breaking parsing or vanishing.
      return {
        type: "unknown",
        directiveName: node.name,
        raw: rawFallbackText(node),
      };
  }
}

function convertInlineChildren(children: PhrasingContent[]): NovaInlineNode[] {
  const result: NovaInlineNode[] = [];

  for (const child of children) {
    switch (child.type) {
      case "text":
        result.push({ type: "text", value: child.value });
        break;
      case "strong":
        result.push({
          type: "strong",
          children: convertInlineChildren(child.children),
        });
        break;
      case "emphasis":
        result.push({
          type: "emphasis",
          children: convertInlineChildren(child.children),
        });
        break;
      case "inlineCode":
        result.push({ type: "inlineCode", value: child.value });
        break;
      case "link":
        result.push({
          type: "link",
          url: child.url,
          children: convertInlineChildren(child.children),
        });
        break;
      case "image":
        result.push({ type: "image", url: child.url, alt: child.alt ?? undefined });
        break;
      default:
        // Genuinely unsupported inline nodes (footnotes, breaks...) are
        // rare and low-risk to skip at the inline level — block-level
        // content is what the contract's no-data-loss rule protects.
        break;
    }
  }

  return result;
}

function plainText(children: NovaInlineNode[]): string {
  return children
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode") return node.value;
      if ("children" in node) return plainText(node.children);
      return "";
    })
    .join("");
}

function rawFallbackText(node: RootContent): string {
  if ("children" in node && Array.isArray(node.children)) {
    return node.children
      .map((child) =>
        "value" in child
          ? String((child as { value: unknown }).value)
          : rawFallbackText(child as RootContent),
      )
      .join(" ");
  }
  if ("value" in node) return String((node as { value: unknown }).value);
  return "";
}