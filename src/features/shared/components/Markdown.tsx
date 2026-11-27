import { createMemo } from 'solid-js';
import { marked } from 'marked';
import { sanitizeHtml } from '@/features/shared/lib/sanitizeHtml';

// Optional: Configure marked options (e.g., enable breaks for line returns)
marked.setOptions({
  breaks: true,
  gfm: true // GitHub Flavored Markdown (tables, autolinks, etc.)
});

export default function Markdown(props: { text?: string }) {
  // Use a memo so the string parsing only runs when props.text changes
  const htmlContent = createMemo(() => {
    if (!props.text) return '';
    // marked لا يعقّم ناتجه، والنص قادم من نموذج لغوي قد يتأثر بمحتوى المحاضرة،
    // لذلك يمرّ بـ DOMPurify قبل الحقن.
    return sanitizeHtml(marked.parse(props.text, { async: false }) as string);
  });

  return (
    <div 
      class="prose markdown-body" 
      innerHTML={htmlContent()} 
    />
  );
}
