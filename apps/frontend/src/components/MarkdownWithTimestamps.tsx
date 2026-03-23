import React, { ReactNode, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TimestampButton } from './TimestampButton';
import {
  parseTimestamp,
  formatTimestamp,
  normalizeTimestampSources,
} from '../utils/timestamp-utils';

export interface MarkdownWithTimestampsProps {
  content: string;
  onTimestampClick?: (timestamp: string) => void;
}

export const MarkdownWithTimestamps: React.FC<MarkdownWithTimestampsProps> = ({
  content,
  onTimestampClick,
}) => {
  const handleTimestampClick = useCallback(
    (seconds: number) => {
      const timestampText = formatTimestamp(seconds);
      console.log('MarkdownWithTimestamps handleTimestampClick:', timestampText, seconds);
      if (onTimestampClick) {
        onTimestampClick(timestampText);
      }
    },
    [onTimestampClick]
  );

  const renderTimestampElement = useCallback(
    (timestampText: string, originalSeconds: number, key: string): ReactNode => {
      return (
        <TimestampButton
          key={key}
          timestamp={timestampText}
          seconds={originalSeconds}
          onClick={handleTimestampClick}
          className="text-[11px]"
        />
      );
    },
    [handleTimestampClick]
  );

  const processTextWithTimestamps = (text: string): ReactNode[] => {
    const timestampPattern = /\(参考时间:\s*((?:\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?(?:,\s*)?)+)\)/g;

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    const allMatches: Array<{ index: number; length: number; element: ReactNode }> = [];

    let match: RegExpExecArray | null;
    timestampPattern.lastIndex = 0;
    while ((match = timestampPattern.exec(text)) !== null) {
      const timestampsStr = match[1];
      if (!timestampsStr) {
        continue;
      }

      const extractedTimestamps = timestampsStr.split(',').map((t) => t.trim());

      const allTimestamps: string[] = [];
      extractedTimestamps.forEach((ts) => {
        if (ts.includes('-')) {
          const parts = ts.split('-');
          if (parts[0]) {
            allTimestamps.push(parts[0]);
          }
        } else {
          allTimestamps.push(ts);
        }
      });

      const normalizedTimestamps = normalizeTimestampSources(allTimestamps, { limit: 5 });

      if (normalizedTimestamps.length === 0) {
        continue;
      }

      const timestampElements = normalizedTimestamps.flatMap((ts, idx) => {
        const seconds = parseTimestamp(ts);
        if (seconds === null) {
          return [];
        }

        const keyBase = `timestamp-${match!.index}-${idx}`;
        const elements: ReactNode[] = [];

        if (idx > 0) {
          elements.push(
            <span
              key={`${keyBase}-separator`}
              className="text-xs text-muted-foreground px-1 align-baseline"
            >
              ,
            </span>
          );
        }

        elements.push(renderTimestampElement(ts, seconds, keyBase));
        return elements;
      });

      if (timestampElements.length === 0) {
        continue;
      }

      const element =
        timestampElements.length === 1 ? (
          timestampElements[0]
        ) : (
          <span
            key={`timestamp-group-${match!.index}`}
            className="inline-flex flex-wrap items-center gap-1 align-baseline"
          >
            {timestampElements}
          </span>
        );

      allMatches.push({
        index: match.index,
        length: match[0].length,
        element,
      });
    }

    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach((matchInfo) => {
      if (matchInfo.index > lastIndex) {
        parts.push(text.slice(lastIndex, matchInfo.index));
      }

      parts.push(matchInfo.element);

      lastIndex = matchInfo.index + matchInfo.length;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const renderTextWithTimestamps = (children: ReactNode): ReactNode => {
    if (typeof children === 'string') {
      return processTextWithTimestamps(children);
    }

    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return <span key={index}>{processTextWithTimestamps(child)}</span>;
        }
        return child;
      });
    }

    return children;
  };

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{renderTextWithTimestamps(children)}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1 last:mb-0">{renderTextWithTimestamps(children)}</li>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto mb-2">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs" {...props}>
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold">{renderTextWithTimestamps(children)}</strong>
          ),
          em: ({ children }) => <em className="italic">{renderTextWithTimestamps(children)}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2">
              {renderTextWithTimestamps(children)}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2">{renderTextWithTimestamps(children)}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mb-2">{renderTextWithTimestamps(children)}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-2">{renderTextWithTimestamps(children)}</h3>
          ),
          text: ({ children }) => renderTextWithTimestamps(children) as any,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownWithTimestamps;
