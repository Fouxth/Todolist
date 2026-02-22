import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple Markdown renderer without external dependencies.
 * Supports: headers, bold, italic, code, links, lists, blockquotes, horizontal rules
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={`prose-custom ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Code (inline)
  result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-[#ff6b35] text-sm font-mono">$1</code>');

  // Bold + Italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em class="italic text-gray-300">$1</em>');
  // Strikethrough
  result = result.replace(/~~(.+?)~~/g, '<del class="line-through text-gray-500">$1</del>');

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$1</a>'
  );

  // Auto-links
  result = result.replace(
    /(?<!["\(])https?:\/\/[^\s<]+/g,
    '<a href="$&" target="_blank" rel="noopener" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$&</a>'
  );

  // Checkbox
  result = result.replace(/\[x\]/gi, '<span class="inline-block w-4 h-4 rounded bg-green-500/20 border border-green-500/40 text-green-400 text-xs text-center leading-4 mr-1">✓</span>');
  result = result.replace(/\[ \]/g, '<span class="inline-block w-4 h-4 rounded bg-white/5 border border-white/20 mr-1"></span>');

  return result;
}

function renderMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        output.push(`<pre class="bg-black/30 border border-white/5 rounded-lg p-4 my-2 overflow-x-auto"><code class="text-sm text-gray-300 font-mono">${escapeHtml(codeContent.join('\n'))}</code></pre>`);
        codeContent = [];
        inCodeBlock = false;
      } else {
        if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = headerMatch[1].length;
      const sizes = ['', 'text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-medium', 'text-xs font-medium'];
      output.push(`<h${level} class="${sizes[level]} text-white mt-4 mb-2">${renderInline(headerMatch[2])}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      output.push('<hr class="border-white/10 my-3" />');
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const quoteContent = line.trim().replace(/^>\s?/, '');
      output.push(`<blockquote class="border-l-2 border-[#ff6b35]/50 pl-4 my-2 text-gray-400 italic">${renderInline(quoteContent)}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
        output.push('<ul class="list-disc list-inside space-y-1 my-2 text-gray-300">');
        inList = true;
        listType = 'ul';
      }
      output.push(`<li class="text-sm">${renderInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
        output.push('<ol class="list-decimal list-inside space-y-1 my-2 text-gray-300">');
        inList = true;
        listType = 'ol';
      }
      output.push(`<li class="text-sm">${renderInline(olMatch[2])}</li>`);
      continue;
    }

    // Regular paragraph
    if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    output.push(`<p class="text-sm text-gray-300 my-1">${renderInline(line)}</p>`);
  }

  // Close any open list
  if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
  // Close any open code block
  if (inCodeBlock) {
    output.push(`<pre class="bg-black/30 border border-white/5 rounded-lg p-4 my-2 overflow-x-auto"><code class="text-sm text-gray-300 font-mono">${escapeHtml(codeContent.join('\n'))}</code></pre>`);
  }

  return output.join('\n');
}
