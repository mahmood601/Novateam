import { mergeAttributes, Node } from "@tiptap/core";

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class:
          "page-break-after: always: border-top: 2px dashed #94a3b8; margin: 2rem 0;",
      }),
    ];
  },

  addCommands(): any {
    return {
      insertPageBreak:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});
