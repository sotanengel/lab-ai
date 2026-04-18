"use client";

import ReactMarkdown from "react-markdown";
import { defaultSchema } from "rehype-sanitize";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"]],
  },
  // Keep classes that come from remark-gfm + react-markdown plugins, but
  // disallow inline event handlers and javascript: URLs (defaults already
  // forbid them via defaultSchema).
};

interface Props {
  children: string;
}

export function Markdown({ children }: Props) {
  return (
    <div className="prose-sm max-w-none break-words leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          h1: ({ children }) => <h1 className="mt-3 mb-2 text-base font-bold">{children}</h1>,
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 text-sm font-semibold opacity-90">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-xs uppercase tracking-wider opacity-70">{children}</h3>
          ),
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-1.5 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-1.5 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => (
            <code
              className={`rounded-sm bg-black/40 px-1 py-0.5 text-[11px] font-mono ${className ?? ""}`}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-auto rounded-md bg-black/50 p-3 text-[11px]">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-auto rounded-md border border-white/10">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-white/5 px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-white/5 px-2 py-1 align-top">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-white/30 pl-3 opacity-80">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
