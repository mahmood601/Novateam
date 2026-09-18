// The 7 real colors extracted from the Word template's theme (theme1.xml).
// No approximated/invented colors — every value maps to a real accent.
export type NovaColor =
  | "rose"    // lt2      #D00054
  | "orange"  // accent1  #FF9933
  | "blue"    // accent2  #3399FF
  | "green"   // accent3  #00B050
  | "yellow"  // accent4  #BF8F00
  | "purple"  // accent5  #CC00FF
  | "pink";   // accent6  #FF3BFF

export const NOVA_COLOR_CYCLE: NovaColor[] = [
  "rose",
  "orange",
  "blue",
  "green",
  "yellow",
  "purple",
  "pink",
];

// ---------------- inline nodes ----------------

export type NovaInlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: NovaInlineNode[] }
  | { type: "emphasis"; children: NovaInlineNode[] }
  | { type: "inlineCode"; value: string }
  | { type: "link"; url: string; children: NovaInlineNode[] }
  | { type: "image"; url: string; alt?: string };

// ---------------- block nodes ----------------

export interface NovaHeadingNode {
  type: "heading";
  depth: number; // 1 = section heading (colored), 2+ = sub-heading (inherits)
  children: NovaInlineNode[];
  color: NovaColor;
}

export interface NovaParagraphNode {
  type: "paragraph";
  children: NovaInlineNode[];
}

export interface NovaListNode {
  type: "list";
  ordered: boolean;
  items: NovaBlockNode[][];
}

export interface NovaCodeNode {
  type: "code";
  lang?: string;
  value: string;
}

export interface NovaTableNode {
  type: "table";
  header: NovaInlineNode[][];
  rows: NovaInlineNode[][][];
}

// Plain `>` blockquote — a quotation, NOT the same thing as the
// deliberate `:::note` directive. Kept as its own type so the two
// never get conflated again.
export interface NovaQuoteNode {
  type: "quote";
  children: NovaBlockNode[];
}

// `:::note ... :::` directive from the AI-markdown contract
export interface NovaNoteNode {
  type: "note";
  children: NovaBlockNode[];
}

// `:::quiz id:123 :::` directive from the contract
export interface NovaQuizNode {
  type: "quiz";
  quizId: string;
}

// `:::diagram ... :::` directive from the contract — the Mermaid source
// is stored as raw text and rendered by the dedicated diagram extension
// in the editor / print pipeline.
export interface NovaDiagramNode {
  type: "diagram";
  source: string;
}

// Any `:::something ... :::` directive whose name isn't recognized yet.
// Required by the contract's forward-compatibility rule: unknown content
// must degrade gracefully, never silently disappear.
export interface NovaUnknownNode {
  type: "unknown";
  directiveName: string;
  raw: string;
}

export type NovaBlockNode =
  | NovaHeadingNode
  | NovaParagraphNode
  | NovaListNode
  | NovaCodeNode
  | NovaTableNode
  | NovaQuoteNode
  | NovaNoteNode
  | NovaQuizNode
  | NovaDiagramNode
  | NovaUnknownNode;

// ---------------- document ----------------

export interface NovaSection {
  type: "section";
  color: NovaColor;
  heading: NovaHeadingNode;
  children: NovaBlockNode[];
}

// Wrapped (not a bare array) so document-level metadata (title, etc.)
// can be added later without a breaking change to every consumer.
export interface NovaDocument {
  sections: NovaSection[];
}