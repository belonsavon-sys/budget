"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { Components } from "react-markdown";

export default function MarkdownView({ content }: { content: string }) {
  const components: Components = {
    a: ({ href, children, ...rest }) => {
      // @txn:id links → /transactions#id
      if (href?.startsWith("@txn:")) {
        const id = href.slice("@txn:".length);
        return (
          <Link href={`/transactions#${id}`} className="text-[var(--accent)] underline">
            {children}
          </Link>
        );
      }
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className="prose prose-sm max-w-none text-[var(--ink)] [&_a]:text-[var(--accent)] [&_code]:bg-[var(--hover)] [&_code]:rounded [&_code]:px-1 [&_blockquote]:border-l-[var(--accent)] [&_h1]:text-[var(--ink)] [&_h2]:text-[var(--ink)] [&_h3]:text-[var(--ink)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
