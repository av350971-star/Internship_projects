import React, { useState } from 'react';

export default function ChatMessage({ message, onInspect }) {
  const isUser = message.role === 'user';
  const metrics = message.metrics;

  const renderContent = (content) => {
    if (isUser) {
      return <div className="user-bubble">{content}</div>;
    }

    // Assistant Markdown & Code parser
    return (
      <div className="assistant-container">
        <div className="assistant-avatar">⚡</div>
        <div className="assistant-body">
          <AssistantMarkdown text={content} />

          {/* Subtle Telemetry Footer (Non-intrusive) */}
          {metrics && (
            <div className="assistant-footer">
              {metrics.latency_ms !== undefined && (
                <span className="telemetry-tag latency" title="Latency">
                  ⚡ {metrics.latency_ms}ms
                </span>
              )}
              {metrics.total_tokens !== undefined && (
                <span className="telemetry-tag tokens" title="Prompt & Completion Tokens">
                  🪙 {metrics.total_tokens} tok ({metrics.prompt_tokens} in / {metrics.completion_tokens} out)
                </span>
              )}
              {metrics.estimated_cost !== undefined && (
                <span className="telemetry-tag cost" title="Estimated API Cost">
                  💰 ${metrics.estimated_cost.toFixed(6)}
                </span>
              )}
              <button
                className="btn-inspect-link"
                onClick={onInspect}
                title="Inspect raw request payload and response JSON"
              >
                Inspect 🔬
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`message-group ${isUser ? 'user' : 'assistant'}`}>
      {renderContent(message.content)}
    </div>
  );
}

function AssistantMarkdown({ text }) {
  if (!text) return null;

  // Split text by fenced code blocks: ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'code',
      code: match[2].trim()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return (
    <div>
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={idx} lang={part.lang} code={part.code} />;
        }
        return <FormattedParagraphs key={idx} text={part.content} />;
      })}
    </div>
  );
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span>{lang}</span>
        <button className="btn-copy-code" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy code'}
        </button>
      </div>
      <pre className="code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedParagraphs({ text }) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((para, i) => {
        if (!para.trim()) return null;
        return (
          <p key={i}>
            <InlineFormatting text={para} />
          </p>
        );
      })}
    </>
  );
}

function InlineFormatting({ text }) {
  // Simple bold and inline code formatter
  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    // Process bold **text** and inline `code`
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return (
      <React.Fragment key={lIdx}>
        {lIdx > 0 && <br />}
        {parts.map((p, pIdx) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            return <strong key={pIdx}>{p.slice(2, -2)}</strong>;
          }
          if (p.startsWith('`') && p.endsWith('`')) {
            return <code key={pIdx}>{p.slice(1, -1)}</code>;
          }
          return p;
        })}
      </React.Fragment>
    );
  });
}
