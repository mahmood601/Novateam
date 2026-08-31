import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkObsidianCallout from 'remark-obsidian-callout';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';


export async function parseMarkdown(raw: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFrontmatter, ['yaml'])
        .use(remarkObsidianCallout)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(raw);

        
        
    return result.toString();
}