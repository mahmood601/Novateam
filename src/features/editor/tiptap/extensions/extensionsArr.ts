import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Mermaid } from "./mermaid";
import { NovaAdmonition } from "./NovaAdmonition";
import { NovaHeading } from "./NovaHeadingExtension";
import { NovaQuiz } from "./NovaQuiz";
import Link from "@tiptap/extension-link";
import { ImageWithCaption } from "./ImageWithCaption";
import NovaImageGallery from "./NovaImageGallery";

export const extensionsArr = [
  StarterKit.configure({ heading: false }), // replaced by NovaHeading below
  NovaHeading,
  NovaAdmonition,
  NovaQuiz,
  Mermaid.configure({
    debounceMs: 400,
  }),
  TableKit.configure({ table: { resizable: false } }),
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
  Markdown,
];
