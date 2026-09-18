import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

export const ImageWithCaption = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: null },
    };
  },

  // @ts-ignore - official image typings do not include the custom caption attribute
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    const { caption, ...attrs } = HTMLAttributes;
    const img = [
      'img',
      mergeAttributes(this.options.HTMLAttributes, attrs),
    ];

    if (!caption) return img;

    return [
      'div',
      { class: 'image-with-caption' },
      img,
      ['div', { class: 'image-caption' }, caption],
    ];
  },

  // @ts-ignore - custom node view matches runtime behavior, but official typings are narrower
  addNodeView() {
    return (props: any) => {
      const parentView = this.parent?.();
      if (!parentView) return null;

      const view = parentView(props);
      if (!view) return null;

      const cap = document.createElement('div');
      cap.textContent = props.node.attrs.caption ?? '';
      cap.classList.add('image-caption');
      cap.contentEditable = 'true';

      cap.addEventListener('blur', () => {
        const pos = props.getPos();
        if (typeof pos !== 'number') return;
        const text = (cap.textContent ?? '').trim();
        props.editor.commands.command(({ tr }: any) => {
          tr.setNodeMarkup(pos, undefined, {
            ...props.editor.state.doc.nodeAt(pos)?.attrs,
            caption: text || null,
          });
          return true;
        });
      });

      (view.dom as HTMLElement).appendChild(cap);

      return {
        dom: view.dom,
        update: (node: any, decorations: any, inner: any) => {
          if (document.activeElement !== cap) {
            cap.textContent = node.attrs.caption ?? '';
          }
          return view.update?.(node, decorations, inner) ?? true;
        },
        destroy: () => view.destroy?.(),
        ignoreMutation: (m: any) =>
          cap.contains(m.target as Node) ||
          (view.ignoreMutation?.(m) ?? false),
        stopEvent: (e: any) =>
          cap.contains(e.target as Node) || (view.stopEvent?.(e) ?? false),
      };
    };
  },
});