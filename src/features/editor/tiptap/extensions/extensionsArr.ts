import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Mermaid } from "./mermaid";
import { NovaAdmonition } from "./NovaAdmonition";
import { NovaHeading } from "./NovaHeadingExtension";
import { NovaQuiz } from "./NovaQuiz";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

export const extensionsArr = [
  StarterKit.configure({ heading: false }), // replaced by NovaHeading below
  NovaHeading,
  NovaAdmonition,
  NovaQuiz,
  Mermaid.configure({
    debounceMs: 400,
  }),
  TableKit.configure({ table: { resizable: false } }),
  Image.configure({ inline: true }),
  Link.configure({ openOnClick: false }),
  Markdown,
];
