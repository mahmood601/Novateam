import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, RootContent, PhrasingContent, Heading } from "mdast";

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
 * الخطوة 1: Markdown خام → mdast (عبر remark، بدون rehype/HTML)
 * الخطوة 2: mdast → Nova AST (هون بنحسب لون كل section مرة وحدة)
 */
export function parseToMdast(raw: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"]);

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

  for (const node of root.children) {
    if (node.type === "heading") {
      const headingNode = convertHeading(node as Heading);

      if (headingNode.depth === 1) {
        const color = nextColor();
        headingNode.color = color;
        currentSection = {
          type: "section",
          color,
          heading: headingNode,
          children: [],
        };
        sections.push(currentSection);
        continue;
      }

      if (currentSection) {
        headingNode.color = currentSection.color;
        currentSection.children.push(headingNode);
      } else {
        const color = nextColor();
        headingNode.color = color;
        currentSection = {
          type: "section",
          color,
          heading: headingNode,
          children: [],
        };
        sections.push(currentSection);
      }
      continue;
    }

    // أي محتوى تاني منحطه جوا الـ section الحالي؛ إذا ما في section بعد
    // (محتوى قبل أول ##) منعمله section افتراضي بلون أول بالدورة
    const block = convertBlock(node);
    if (!block) continue;

    if (!currentSection) {
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
    }

    currentSection.children.push(block);
  }

  return sections;
}

export async function parseMarkdownToNova(raw: string): Promise<NovaDocument> {
  const root = parseToMdast(raw);
  return mdastToNovaDocument(root);
}

// ---------------- helpers ----------------

function convertHeading(node: Heading): NovaHeadingNode {
  return {
    type: "heading",
    depth: node.depth,
    children: convertInlineChildren(node.children),
  };
}

function convertBlock(node: RootContent): NovaBlockNode | null {
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
          item.children
            .map((child) => convertBlock(child as RootContent))
            .filter((b): b is NovaBlockNode => b !== null),
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

    // blockquote عادي (مش callout مميز) منعامله كملاحظة عامة
    // ملاحظة: دعم ":::note" و ":::quiz" الفعلي بده remark-directive
    // (مو مثبتة بعد) — هاد hook جاهز نربطه فيها لاحقًا
    case "blockquote":
      return {
        type: "note",
        children: node.children
          .map((child) => convertBlock(child as RootContent))
          .filter((b): b is NovaBlockNode => b !== null),
      };

    default:
      return null;
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
        result.push({
          type: "image",
          url: child.url,
          alt: child.alt ?? undefined,
        });
        break;
      default:
        // عناصر مو مدعومة بعد (footnote, break...) منتجاهلها بهالمرحلة
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
