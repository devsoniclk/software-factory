import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Eye, Edit2, Columns } from 'lucide-react';

const MODES = ['edit', 'split', 'preview'];

export default function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Write markdown here...',
  rows = 8,
  label,
  hint,
  readOnly = false,
}) {
  const [mode, setMode] = useState('edit');

  const toolbar = !readOnly && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {label && (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        )}
        {hint && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: 2 }}>
        {[
          { id: 'edit', icon: Edit2, tip: 'Edit' },
          { id: 'split', icon: Columns, tip: 'Split' },
          { id: 'preview', icon: Eye, tip: 'Preview' },
        ].map(({ id, icon: Icon, tip }) => (
          <button
            key={id}
            title={tip}
            onClick={() => setMode(id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: mode === id ? 'var(--color-bg)' : 'transparent',
              boxShadow: mode === id ? 'var(--shadow-xs)' : 'none',
              color: mode === id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              transition: 'background 0.1s',
            }}
          >
            <Icon size={12} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );

  const editorPane = (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      readOnly={readOnly}
      className="input-base font-mono"
      style={{
        resize: 'vertical',
        fontSize: 12,
        lineHeight: 1.7,
        flex: 1,
        minHeight: rows * 22,
      }}
    />
  );

  const previewPane = (
    <div style={{
      flex: 1,
      minHeight: rows * 22,
      padding: '8px 12px',
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--border-emphasized)',
      borderRadius: 'var(--radius-md)',
      overflowY: 'auto',
      color: 'var(--text-primary)',
      fontSize: 13,
      lineHeight: 1.7,
    }}>
      {value ? (
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, marginTop: 14 }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, marginTop: 10 }}>{children}</h3>,
            p: ({ children }) => <p style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>,
            em: ({ children }) => <em style={{ color: 'var(--text-secondary)' }}>{children}</em>,
            ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: 3, color: 'var(--text-secondary)' }}>{children}</li>,
            code: ({ inline, children }) => inline
              ? <code style={{ fontSize: 11, background: 'var(--color-bg)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace', color: 'var(--accent)' }}>{children}</code>
              : <pre style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 6, fontSize: 11, overflowX: 'auto', border: '1px solid var(--border)' }}><code>{children}</code></pre>,
            blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--border-emphasized)', paddingLeft: 12, margin: '8px 0', color: 'var(--text-tertiary)' }}>{children}</blockquote>,
            hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />,
          }}
        >
          {value}
        </ReactMarkdown>
      ) : (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Preview will appear here</span>
      )}
    </div>
  );

  return (
    <div>
      {toolbar}
      <div style={{ display: 'flex', gap: 8 }}>
        {(mode === 'edit' || mode === 'split') && editorPane}
        {(mode === 'preview' || mode === 'split') && previewPane}
      </div>
    </div>
  );
}
