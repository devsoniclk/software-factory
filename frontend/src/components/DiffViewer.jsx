import { diffLines } from 'diff';

export default function DiffViewer({ oldContent = '', newContent = '', oldLabel = 'Previous', newLabel = 'Current' }) {
  const changes = diffLines(oldContent, newContent);

  if (!oldContent && !newContent) {
    return <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '12px 0' }}>No content to compare.</div>;
  }

  let oldLine = 1;
  let newLine = 1;

  const rows = [];
  for (const part of changes) {
    const lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    for (const line of lines) {
      if (part.removed) {
        rows.push({ type: 'removed', oldNum: oldLine++, newNum: null, text: line });
      } else if (part.added) {
        rows.push({ type: 'added', oldNum: null, newNum: newLine++, text: line });
      } else {
        rows.push({ type: 'context', oldNum: oldLine++, newNum: newLine++, text: line });
      }
    }
  }

  const COLOR = {
    removed: { bg: 'rgba(255,59,48,0.06)', border: 'rgba(255,59,48,0.18)', num: 'rgba(255,59,48,0.35)', text: '#cc2222', prefix: '−' },
    added:   { bg: 'rgba(40,205,65,0.06)', border: 'rgba(40,205,65,0.18)', num: 'rgba(40,205,65,0.35)', text: '#156e2b', prefix: '+' },
    context: { bg: 'transparent', border: 'transparent', num: 'var(--text-tertiary)', text: 'var(--text-secondary)', prefix: ' ' },
  };

  const hasChanges = rows.some((r) => r.type !== 'context');

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.65, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1, padding: '6px 12px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, fontFamily: 'inherit' }}>
          {oldLabel}
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, padding: '6px 12px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, fontFamily: 'inherit' }}>
          {newLabel}
        </div>
      </div>

      {!hasChanges ? (
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>No differences found.</div>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 400 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 36 }} />
              <col />
            </colgroup>
            <tbody>
              {rows.map((row, i) => {
                const c = COLOR[row.type];
                return (
                  <tr key={i} style={{ background: c.bg }}>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: c.num, userSelect: 'none', borderRight: `1px solid ${c.border}`, whiteSpace: 'nowrap', minWidth: 28 }}>
                      {row.oldNum ?? ''}
                    </td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: c.num, userSelect: 'none', borderRight: `1px solid ${c.border}`, whiteSpace: 'nowrap', minWidth: 28 }}>
                      {row.newNum ?? ''}
                    </td>
                    <td style={{ padding: '1px 10px', color: c.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      <span style={{ userSelect: 'none', marginRight: 8, opacity: 0.6 }}>{c.prefix}</span>
                      {row.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
