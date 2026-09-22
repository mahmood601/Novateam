import TableRow from "@tiptap/extension-table-row";
import { NovaTableCell, NovaTableHeader } from "./table/TableCellAttributes";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Mermaid } from "./mermaid";
import { NovaAdmonition } from "./NovaAdmonition";
import { NovaHeading } from "./NovaHeadingExtension";
import { NovaQuiz } from "./NovaQuiz";
import Link from "@tiptap/extension-link";
import { ImageWithCaption } from "./ImageWithCaption";
import NovaImageGallery from "./NovaImageGallery";
import { NovaBox } from "./NovaBox";
import { NovaTable } from "./table/novaTable";

// Sub/superscript don't exclude each other by default, which lets both
// marks stack on the same text and render nonsense nested offsets — so
// each one explicitly excludes the other, matching how Word/Docs behave.
const NovaSubscript = Subscript.extend({ excludes: "superscript" });
const NovaSuperscript = Superscript.extend({ excludes: "subscript" });

export const extensionsArr = [
  StarterKit.configure({ heading: false, link: false }), // replaced by NovaHeading/Link below
  NovaHeading,
  NovaAdmonition,
  NovaQuiz,
  TextStyleKit.configure({ lineHeight: false }), // color, backgroundColor, fontFamily, fontSize
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight.configure({ multicolor: true }),
  NovaSubscript,
  NovaSuperscript,
  Mermaid.configure({
    debounceMs: 400,
  }),
  // Table nodes are wired up individually (rather than via TableKit) so
  // TableCell/TableHeader can be swapped for the alignment-aware variants
  // below. `handleWidth` is widened past the 5px default so the column
  // resize handle has a real touch target on Android; `cellMinWidth`
  // keeps cells from being squeezed unusably thin by a finger drag.
  NovaTable.configure({
    resizable: true,
    lastColumnResizable: true,
    allowTableNodeSelection: true,
    handleWidth: 10,
    cellMinWidth: 40,
  }),
  TableRow,
  NovaTableHeader,
  NovaTableCell,
  ImageWithCaption.configure({
    inline: true,
    HTMLAttributes: {
      class: "lecture-image",
      "data-resize-wrapper": "true",
      allowBase64: false,
    },
    resize: {
      enabled: true,
      directions: ["top", "bottom", "left", "right"], // can be any direction or diagonal combination
      minWidth: 50,
      minHeight: 50,
      alwaysPreserveAspectRatio: true,
    },
  }),
  NovaImageGallery,
  NovaBox,
  Link.configure({
    openOnClick: false,
    markdownLinks: true,
    defaultProtocol: "https",
  }),
  Markdown.configure({
    indentation: {
      style: "space", // 'space' or 'tab'
      size: 2, // Number of spaces or tabs
    },
  }),
];
