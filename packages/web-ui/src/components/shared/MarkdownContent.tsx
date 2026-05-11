'use client';

import { useMemo } from 'react';
import { marked } from 'marked';

marked.use({ gfm: true });

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const html = useMemo(() => marked.parse(content), [content]);

  return (
    <div
      className="markdown-content text-[14px] leading-relaxed text-[var(--color-text-primary)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
