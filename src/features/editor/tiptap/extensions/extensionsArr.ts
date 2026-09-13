import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
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
  Highlight.configure({ multicolor: true }),
  NovaSubscript,
  NovaSuperscript,
  Mermaid.configure({
    debounceMs: 400,
  }),
  TableKit.configure({
    table: {
      resizable: true,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    },
  }),
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
  Link.configure({ openOnClick: false }),
  Markdown.configure({
    indentation: {
      style: "space", // 'space' or 'tab'
      size: 2, // Number of spaces or tabs
    },
  }),
];
