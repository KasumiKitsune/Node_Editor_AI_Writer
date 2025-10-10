import React, { useEffect } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onHeadingsParse?: (headings: Heading[]) => void;
}

// This function handles inline markdown formatting like bold, italic, code, etc.
const renderLineWithInlineFormatting = (line: string): React.ReactNode => {
  // Regex to find all supported markdown tokens.
  // It looks for `code`, **bold**, *italic*, and ~~strikethrough~~.
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;
  const parts = line.split(regex);
  
  return parts.filter(part => part).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-gray-700 text-red-400 rounded px-1.5 py-0.5 text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={index}>{part.slice(2, -2)}</del>;
    }
    return part;
  });
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, onHeadingsParse }) => {
  const elements: React.ReactNode[] = [];
  const headings: Heading[] = [];
  const lines = (content || '').split('\n');
  let i = 0;

  const extractText = (markdownLine: string): string => {
    // This helper function removes markdown formatting to get plain text for TOC.
    return markdownLine
      .replace(/(`|~~|\*\*|\*)/g, ''); // Remove code, strikethrough, bold, italic markers
  };

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = extractText(headingMatch[2]);
      const id = `heading-${i}-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;
      headings.push({ id, text, level });

      // FIX: Changed JSX to React.JSX to correctly reference the intrinsic elements type from the imported React module.
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const headingClasses = [
        "font-bold mt-4 mb-2",
        "text-2xl border-b border-gray-600 pb-2",
        "text-xl border-b border-gray-700 pb-1",
        "text-lg",
      ];
      
      elements.push(
        <HeadingTag key={i} id={id} className={headingClasses[level-1]}>
          {renderLineWithInlineFormatting(headingMatch[2])}
        </HeadingTag>
      );
      i++; continue;
    }
    
    // Horizontal Rule
    if (line.match(/^(\*|-|_){3,}$/)) {
        elements.push(<hr key={i} className="my-6 border-gray-600" />);
        i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
        const blockquoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
            blockquoteLines.push(lines[i].substring(2));
            i++;
        }
        elements.push(
            <blockquote key={i} className="border-l-4 border-gray-500 pl-4 my-4 text-gray-400 italic">
                {blockquoteLines.map((l, idx) => <p key={idx}>{renderLineWithInlineFormatting(l)}</p>)}
            </blockquote>
        );
        continue;
    }
    
    // Code Block
    if (line.startsWith('```')) {
      const codeLines = [];
      i++; // Move past the opening ```
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<pre key={i} className="bg-gray-900 p-4 rounded-md my-4 overflow-x-auto"><code className="text-sm font-mono text-cyan-300">{codeLines.join('\n')}</code></pre>);
      i++; // Move past the closing ```
      continue;
    }

    // Unordered List
    if (line.match(/^(\*|\+|-)\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^(\*|\+|-)\s/)) {
        listItems.push(<li key={i}>{renderLineWithInlineFormatting(lines[i].substring(2))}</li>);
        i++;
      }
      elements.push(<ul key={i-1} className="list-disc pl-6 my-2 space-y-1">{listItems}</ul>);
      continue;
    }
    
    // Ordered List
    if (line.match(/^\d+\.\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(<li key={i}>{renderLineWithInlineFormatting(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      elements.push(<ol key={i-1} className="list-decimal pl-6 my-2 space-y-1">{listItems}</ol>);
      continue;
    }

    // Paragraphs (and text that falls through)
    if (line.trim() !== '') {
        const paraLines = [line];
        i++;
        // Continue consuming lines for the same paragraph until an empty line or a block-level token is found
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#|>|`{3}|(\*|-|_){3,}|(\*|\+|-)\s|\d+\.\s)/)) {
            paraLines.push(lines[i]);
            i++;
        }
        elements.push(<p key={i-1} className="my-2 leading-relaxed paragraph-indent">{renderLineWithInlineFormatting(paraLines.join('\n'))}</p>);
        continue;
    }
    
    i++; // Increment for empty lines
  }
  
  useEffect(() => {
    onHeadingsParse?.(headings);
  }, [content, onHeadingsParse]); // Rerun when content changes

  return (
    <div className={className}>
      <style>{`.paragraph-indent { text-indent: 2em; }`}</style>
      {elements}
    </div>
  );
};

export default MarkdownRenderer;