// src/extensions/mermaid/types.ts
import type { Node } from '@tiptap/core'

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>
  /** زمن الـ debounce بالمللي ثانية (موصى به 300-500 لمخرجات AI) */
  debounceMs?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (content?: string) => ReturnType
      updateMermaid: (content: string) => ReturnType
    }
  }
}

export type MermaidNodeViewProps = {
  node: Node
  updateAttributes: (attrs: Record<string, any>) => void
  selected: boolean
  extension: {
    options: MermaidOptions
  }
}
