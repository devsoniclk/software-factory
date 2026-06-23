import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, User, Cpu, Search, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { useAuditLogs } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

const ACTION_META = {
  create:   { bg: 'rgba(40,205,65,0.08)',  color: '#15803D', border: 'rgba(40,205,65,0.2)'  },
  update:   { bg: 'var(--accent-bg)',       color: 'var(--accent)', border: 'var(--accent-border)' },
  delete:   { bg: 'rgba(196,0,10,0.07)',   color: '#C4000A', border: 'rgba(196,0,10,0.18)'  },
  generate: { bg: 'rgba(0,113,227,0.06)',  color: '#0071E3', border: 'rgba(0,113,227,0.15)' },
  parse:    { bg: 'rgba(0,113,227,0.06)',  color: '#0071E3', border: 'rgba(0,113,227,0.15)' },
};

function ActionChip({ action }) {
  const m = ACTION_META[action] || { bg: 'var(--color-bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border)' };
  return (
    <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--radius-full)', background: m.bg, color: m.color, border: `1px solid ${m.border}`, textTransform: 'capitalize' }}>
      {action}
    </span>
  );
}

export default function AuditPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data: logs, isLoading } = useAuditLogs();
  const logList = Array.isArray(logs) ? logs : logs?.items || logs?.logs || [];

  const actions = useMemo(() => ['all', ...new Set(logList.map((l) => l.action).filter(Boolean))], [logList]);

  const filtered = useMemo(() => logList.filter((l) => {
    if (filter !== 'all' && l.action !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.action?.toLowerCase().includes(q) || l.entity_type?.toLowerCase().includes(q) || l.actor?.toLowerCase().includes(q);
    }
    return true;
  }), [logList, filter, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Full traceability of every action</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="input-base"
              style={{ paddingLeft: 30, width: 180 }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
              {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title={search || filter !== 'all' ? 'No matching logs' : 'No audit logs'} description={search || filter !== 'all' ? 'Try a different filter or search term.' : 'Actions will appear here as you use the app.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((log, i) => (
            <motion.div key={log.id || log.log_id || i} {...stagger(i)}>
              <GlassCard style={{ padding: '12px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ActionChip action={log.action} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {log.entity_type && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{log.entity_type} · </span>}
                      {log.entity_id || log.description || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {log.actor && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {log.actor === 'ai' ? <Cpu size={11} strokeWidth={1.5} /> : <User size={11} strokeWidth={1.5} />}
                        {log.actor}
                      </span>
                    )}
                    {log.created_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        <Clock size={11} strokeWidth={1.5} />
                        {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
