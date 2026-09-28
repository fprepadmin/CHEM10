import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  as?: 'div' | 'span';
}

/**
 * Parses inline text formatting:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - <u>underline</u> or <b>bold</b> or <strong>bold</strong> or <i>italic</i> or <em>italic</em>
 * - ~~strikethrough~~
 * - `code`
 */
function renderInlineFormattedText(text: string, baseKey: string | number): React.ReactNode {
  if (!text) return null;

  // Regex matches markdown formatting and standard HTML inline tags
  const inlineRegex = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|`[^`\n]+?`|<u>[\s\S]*?<\/u>|<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*[^*\n]+?\*)/g;

  const parts = text.split(inlineRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    const key = `${baseKey}-fmt-${idx}`;

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-bold text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Bold Underline __text__
    if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
      return (
        <strong key={key} className="font-bold underline text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Strikethrough ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={key} className="line-through opacity-80">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Code `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={key} className="px-1.5 py-0.5 mx-0.5 bg-slate-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-300 rounded font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }

    // HTML <u>
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      return (
        <u key={key} className="underline">
          {part.slice(3, -4)}
        </u>
      );
    }

    // HTML <b> / <strong>
    if (part.startsWith('<b>') && part.endsWith('</b>')) {
      return (
        <strong key={key} className="font-bold text-inherit">
          {part.slice(3, -4)}
        </strong>
      );
    }
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return (
        <strong key={key} className="font-bold text-inherit">
          {part.slice(8, -9)}
        </strong>
      );
    }

    // HTML <i> / <em>
    if (part.startsWith('<i>') && part.endsWith('</i>')) {
      return (
        <em key={key} className="italic text-inherit">
          {part.slice(3, -4)}
        </em>
      );
    }
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return (
        <em key={key} className="italic text-inherit">
          {part.slice(4, -5)}
        </em>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={key} className="italic text-inherit">
          {part.slice(1, -1)}
        </em>
      );
    }

    return (
      <span key={key} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

/**
 * Enhanced Math & Chemistry LaTeX renderer for Chem10
 * Parses and renders LaTeX blocks ($...$, $$...$$, \(...\), \[...\]) using KaTeX
 * and Markdown inline formatting (**bold**, *italic*, etc.)
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ 
  content, 
  className = '',
  as = 'div' 
}) => {
  const renderedParts = useMemo(() => {
    if (!content) return [];

    // Split content by LaTeX math delimiters:
    // 1. $$ ... $$ (display mode)
    // 2. \[ ... \] (display mode)
    // 3. $ ... $ (inline mode)
    // 4. \( ... \) (inline mode)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const tokens = content.split(regex);

    return tokens.map((token, index) => {
      if (!token) return null;

      // Check display mode: $$...$$ or \[...\]
      if (token.startsWith('$$') && token.endsWith('$$') && token.length >= 4) {
        const math = token.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false, output: 'html' });
          return <span key={index} className="my-2 block overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={index} className="font-mono text-cyan-600 font-semibold">{token}</span>;
        }
      }

      if (token.startsWith('\\[') && token.endsWith('\\]') && token.length >= 4) {
        const math = token.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false, output: 'html' });
          return <span key={index} className="my-2 block overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={index} className="font-mono text-cyan-600 font-semibold">{token}</span>;
        }
      }

      // Check inline mode: $...$ or \(...\)
      if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
        const math = token.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false, output: 'html' });
          return <span key={index} className="inline-block px-0.5 align-baseline" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={index} className="font-mono text-cyan-600 font-semibold">{token}</span>;
        }
      }

      if (token.startsWith('\\(') && token.endsWith('\\)') && token.length >= 4) {
        const math = token.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false, output: 'html' });
          return <span key={index} className="inline-block px-0.5 align-baseline" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={index} className="font-mono text-cyan-600 font-semibold">{token}</span>;
        }
      }

      // Plain text - parse markdown inline formatting (bold, italic, code, underline...)
      return renderInlineFormattedText(token, index);
    });
  }, [content]);

  if (as === 'span') {
    return <span className={`leading-relaxed ${className}`}>{renderedParts}</span>;
  }

  return <div className={`leading-relaxed ${className}`}>{renderedParts}</div>;
};
