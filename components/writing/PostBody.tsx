import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { highlightCodeBlocks } from '@/lib/markdown';

/**
 * Renders a post body from Markdown.
 *
 * A Server Component, so react-markdown, remark-gfm and the highlighted output
 * all stay out of the client bundle — the reader receives HTML.
 *
 * Code blocks are highlighted before the render (see lib/markdown.ts) and
 * looked up here by their own source text. That indirection exists because
 * Shiki is async and react-markdown is not; without it the choice would be
 * shipping a highlighter to the browser or shipping no highlighting.
 */
export async function PostBody({ markdown }: { markdown: string }) {
  const highlighted = await highlightCodeBlocks(markdown);

  return (
    <div className="prose-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /**
           * react-markdown hands block code to `code` inside a `pre`. Shiki's
           * output is its own `<pre>`, so the wrapper is unwrapped here to
           * avoid nesting one inside another — which is invalid, and which
           * browsers resolve by breaking the layout.
           */
          pre({ children }) {
            return <>{children}</>;
          },

          code({ className, children, ...props }) {
            const text = String(children).replace(/\n$/, '');
            const isBlock = /language-/.test(className ?? '') || text.includes('\n');

            if (!isBlock) {
              return (
                <code className="rounded-sm border border-rule bg-surface-2 px-1.5 py-0.5 text-[0.87em]">
                  {children}
                </code>
              );
            }

            const html = highlighted.get(text.trim());

            // No entry means an unknown language. Plain, readable, not a crash.
            if (!html) {
              return (
                <pre className="overflow-x-auto rounded-sm border border-rule bg-surface-2 p-4 text-sm">
                  <code {...props}>{children}</code>
                </pre>
              );
            }

            return (
              <div
                className="shiki-block overflow-x-auto rounded-sm border border-rule"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          },

          /** Heading anchors (FR-09), so a section can be linked directly. */
          h2({ children, ...props }) {
            const id = headingId(children);
            return (
              <h2 id={id} {...props}>
                <a href={`#${id}`} className="heading-anchor">
                  {children}
                </a>
              </h2>
            );
          },
          h3({ children, ...props }) {
            const id = headingId(children);
            return (
              <h3 id={id} {...props}>
                <a href={`#${id}`} className="heading-anchor">
                  {children}
                </a>
              </h3>
            );
          },

          /** Outbound links open in a new tab; in-page anchors must not. */
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                {...(isExternal ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function headingId(children: React.ReactNode): string {
  return String(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
