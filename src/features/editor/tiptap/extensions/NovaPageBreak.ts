// Manual page break: `:::pagebreak :::` in Markdown.
//
// What it IS: an empty atom block, rendered as
//   <div class="nova-page-break" data-nova-block="page-break" data-break-after="page"></div>
//
// How each place treats that empty <div>:
//  - Editor:        styled as a dashed line with a label (page-break.css,
//                   scoped to `.tiptap`, so it only exists while editing).
//  - Reading view:  an empty div has zero height → invisible. No CSS needed.
//  - Print:         Paged.js sees `break-after: page` (from the stylesheet
//                   injected in LecturePrint.tsx + the data-break-after
//                   attribute) and starts a new page after this element.
//
// Same pattern as NovaQuiz: an atom node (no content), so it uses
// createAtomBlockMarkdownSpec, and an *input* rule that inserts the node
// directly (wrappingInputRule can't work on atoms).

import {
  Node,
  mergeAttributes,
  createAtomBlockMarkdownSpec,
  nodeInputRule,
} from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    novaPageBreak: {
      /** Insert a manual page break at the cursor. */
      setPageBreak: () => ReturnType;
    };
  }
}

export const NovaPageBreak = Node.create({
  name: "novaPageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addInputRules() {
    return [
      nodeInputRule({
        find: /^:::pagebreak\s$/,
        type: this.type,
      }),
    ];
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "page-break",
        "data-break-after": "page",
        class: "nova-page-break",
      }),
    ];
  },

  addCommands() {
    return {
      // Modeled on Tiptap's own setHorizontalRule: insert the atom, then make
      // sure there is somewhere to keep typing *after* it. An atom can't hold
      // the cursor, so without a paragraph after it the writer would be stuck.
      setPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const { $to } = tr.selection;
                const posAfter = $to.end();

                if ($to.nodeAfter) {
                  if ($to.nodeAfter.isTextblock) {
                    tr.setSelection(TextSelection.create(tr.doc, $to.pos + 1));
                  } else if ($to.nodeAfter.isBlock) {
                    tr.setSelection(NodeSelection.create(tr.doc, $to.pos));
                  } else {
                    tr.setSelection(TextSelection.create(tr.doc, $to.pos));
                  }
                } else {
                  const node = $to.parent.type.contentMatch.defaultType?.create();
                  if (node) {
                    tr.insert(posAfter, node);
                    tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
                  }
                }

                tr.scrollIntoView();
              }
              return true;
            })
            .run(),
    };
  },

  // Markdown: `:::pagebreak :::` (so AI-formatted lectures can include it too).
  ...createAtomBlockMarkdownSpec({
    nodeName: "novaPageBreak",
    name: "pagebreak",
  }),
});
