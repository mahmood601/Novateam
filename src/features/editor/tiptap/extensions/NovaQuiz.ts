// `:::quiz id:123 :::` directive — an atom placeholder node for the
// reviewer to see; the actual quiz content is resolved elsewhere via
// `quizId`, not edited inline here.

import { Node, mergeAttributes } from "@tiptap/core";

export const NovaQuiz = Node.create({
  name: "novaQuiz",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      quizId: { default: "" },
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attrs) =>
          attrs.color ? { "data-color": attrs.color } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-nova-block="quiz"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-nova-block": "quiz",
        class: "nova-quiz-placeholder",
      }),
      `سؤال اختبار — ID: ${node.attrs.quizId}`,
    ];
  },
});
