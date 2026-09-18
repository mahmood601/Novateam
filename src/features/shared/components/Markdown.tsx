import { createMemo } from 'solid-js';
import { marked } from 'marked';

// Optional: Configure marked options (e.g., enable breaks for line returns)
marked.setOptions({
  breaks: true,
  gfm: true // GitHub Flavored Markdown (tables, autolinks, etc.)
});

export default function Markdown(props) {
  // Use a memo so the string parsing only runs when props.text changes
  const htmlContent = createMemo(() => {
    if (!props.text) return '';
    return marked.parse(props.text);
  });

  return (
    <div 
      class="prose markdown-body" 
      innerHTML={htmlContent()} 
    />
  );
}