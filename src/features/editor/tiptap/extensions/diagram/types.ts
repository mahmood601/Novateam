// src/extensions/diagram/types.ts
import type { Node } from '@tiptap/core'

export interface DiagramOptions {
  HTMLAttributes: Record<string, any>
  /** زمن الـ debounce بالمللي ثانية (موصى به 300-500 لمخرجات AI) */
  debounceMs?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagram: {
      setDiagram: (content?: string) => ReturnType
      updateDiagram: (content: string) => ReturnType
    }
  }
}

export type DiagramNodeViewProps = {
  node: Node
  updateAttributes: (attrs: Record<string, any>) => void
  selected: boolean
  extension: {
    options: DiagramOptions
  }
}
