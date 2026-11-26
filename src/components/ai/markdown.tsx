"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Safe Markdown renderer: raw HTML is never rendered, links open in a new tab. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const safe = typeof href === "string" && /^(https?:|mailto:|\/)/i.test(href) ? href : undefined;
            return <a href={safe} target={safe?.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer nofollow">{children}</a>;
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
