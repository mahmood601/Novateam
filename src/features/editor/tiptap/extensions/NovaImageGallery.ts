// NovaImageGallery.ts
// A container node that holds multiple figures/images and lays them out
// with CSS flexbox (wraps to new rows automatically). Built to sit next to
// NovaFigure — it accepts either bare `image` nodes or full `figure` nodes
// as children.

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGallery: {
      /** Insert an empty image gallery container at the cursor */
      setImageGallery: () => ReturnType
      /** Wrap the currently selected image/figure into a new gallery */
      wrapInImageGallery: () => ReturnType
    }
  }
}

export const NovaImageGallery = Node.create({
  name: 'imageGallery',
  group: 'block',
  // accepts one or more bare images or captioned figures, in any mix
  content: 'image*',
  draggable: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="image-gallery"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'image-gallery', class: 'nova-image-gallery' }, HTMLAttributes),
      0,
    ]
  },

  addCommands() {
    return {
      setImageGallery:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [],
          })
        },

      wrapInImageGallery:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name)
        },
    }
  },
})

export default NovaImageGallery

/*
CSS — this is what actually does the flex distribution:

.nova-image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0;
}

/* each child (bare image wrapper or figure) shares the row and wraps */
/*
.nova-image-gallery > .nova-image-wrapper,
.nova-image-gallery > .nova-figure {
  flex: 1 1 200px;   /* grow, shrink, base width before wrapping */
  /*
  max-width: 100%;
}

.nova-image-gallery > .nova-image-wrapper img,
.nova-image-gallery > .nova-figure img {
  width: 100%;
  height: auto;
  display: block;
}
*/