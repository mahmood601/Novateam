// `:::quiz {quizId="123"}` directive — atom placeholder node. Uses
// createAtomBlockMarkdownSpec since it has attributes but no content.
// Same missing-markdown-spec bug as NovaNote — added here now.

import { Node, mergeAttributes, createAtomBlockMarkdownSpec, nodeInputRule } from "@tiptap/core";

export const NovaQuiz = Node.create({
  name: "novaQuiz",
  group: "block",
  atom: true,
  selectable: true,

  // novaQuiz is an atom node (no content to wrap into), so
  // wrappingInputRule can never succeed here — findWrapping() has
  // nothing valid to wrap and silently no-ops, meaning ":::quiz "
  // never actually turned into a node. nodeInputRule inserts the
  // atom directly instead of trying to wrap surrounding content.
  addInputRules() {
    return [
      nodeInputRule({
        find: /^:::quiz\s$/,
        type: this.type,
      }),
    ];
  },

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

  ...createAtomBlockMarkdownSpec({
    nodeName: "novaQuiz",
    name: "quiz",
    requiredAttributes: ["quizId"],
    allowedAttributes: ["quizId"], // color excluded — computed, never authored
  }),
});