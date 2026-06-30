import { useState, useEffect } from 'react';
import { useGlobalSearch } from '../api/hooks';
import { Search } from 'lucide-react';

const TYPE_LABEL = { requirement: 'REQ', blueprint: 'BLU', work_order: 'WO', feedback: 'FB' };
const TYPE_COLOR = { requirement: '#0071E3', blueprint: '#34C759', work_order: '#FF9500', feedback: '#AF52DE' };

export default function GlobalSearchPage() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: results = [], isFetching } = useGlobalSearch(q);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Search</h1>
          <p className="page-subtitle">Search across requirements, blueprints, work orders, and feedback</p>
        </div>
      </div>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input className="input-base" placeholder="Search everything…" value={input} onChange={e => setInput(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} autoFocus />
      </div>
      {isFetching && <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Searching…</div>}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((r, i) => (
            <div key={i} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[r.type] || '#888', background: `${TYPE_COLOR[r.type] || '#888'}18`, padding: '2px 6px', borderRadius: 4 }}>{TYPE_LABEL[r.type] || r.type}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title || r.name}</span>
              </div>
              {r.excerpt && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{r.excerpt}</p>}
            </div>
          ))}
        </div>
      )}
      {q.length > 1 && !isFetching && results.length === 0 && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No results for "{input}"</p>
      )}
    </div>
  );
}
