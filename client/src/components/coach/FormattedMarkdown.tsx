import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Regex to match **bold**, *italic*, or `code`
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  parts.forEach((part, index) => {
    if (!part) return;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      elements.push(
        <strong key={index} className="font-bold text-[var(--text-main)]">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      elements.push(
        <em key={index} className="italic text-[var(--text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      elements.push(
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-card-subtle)] text-red-400 font-mono text-xs border border-white/5"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else {
      elements.push(<span key={index}>{part}</span>);
    }
  });

  return elements;
}

/**
 * Lightweight, dependency-free, XSS-safe Markdown parser for AI Coach responses
 */
export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    // 1. Empty lines -> skip
    if (!line) {
      index++;
      continue;
    }

    // 2. Horizontal divider: ---
    if (/^---{1,}$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className="my-3 border-t border-[var(--border-subtle)]" />);
      index++;
      continue;
    }

    // 3. Headings: #, ##, ###
    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${index}`} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      index++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${index}`} className="text-base font-extrabold text-white mt-4 mb-2 tracking-tight">
          {renderInlineFormatting(line.slice(3))}
        </h3>
      );
      index++;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${index}`} className="text-lg font-black text-white mt-4 mb-2 tracking-tight">
          {renderInlineFormatting(line.slice(2))}
        </h2>
      );
      index++;
      continue;
    }

    // 4. Blockquotes: > quote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index++;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-3 border-[var(--primary)] bg-red-950/20 px-3 py-1.5 my-2.5 rounded-r-md text-xs italic text-[var(--text-secondary)]"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineFormatting(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Tables: | Header | Header |
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|') && lines[index].trim().endsWith('|')) {
        tableLines.push(lines[index].trim());
        index++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // line 1 is separator |---|---|
        const bodyRows = tableLines.slice(2).map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                <tr>
                  {headerRow.map((head, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-semibold">
                      {renderInlineFormatting(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bodyRows.map((cols, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    {cols.map((col, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[var(--text-main)]">
                        {renderInlineFormatting(col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 6. Bullet lists: * or -
    if (/^(\*|-)\s+/.test(line)) {
      const listItems: string[] = [];
      while (index < lines.length && /^(\*|-)\s+/.test(lines[index].trim())) {
        listItems.push(lines[index].trim().replace(/^(\*|-)\s+/, ''));
        index++;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-2 space-y-1.5 pl-4 list-disc text-xs sm:text-sm text-[var(--text-secondary)]">
          {listItems.map((item, itmIdx) => (
            <li key={itmIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Numbered lists: 1. 2.
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        listItems.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index++;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-2 space-y-1.5 pl-4 list-decimal text-xs sm:text-sm text-[var(--text-secondary)]">
          {listItems.map((item, itmIdx) => (
            <li key={itmIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Standard paragraph
    blocks.push(
      <p key={`p-${index}`} className="my-1.5 text-xs sm:text-sm leading-relaxed text-[var(--text-main)]">
        {renderInlineFormatting(line)}
      </p>
    );
    index++;
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
};
