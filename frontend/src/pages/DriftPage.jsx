import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, RefreshCw, Info, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useProjects, useDriftAlerts, useScanDrift, useResolveAlert } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

const SEVERITY_STYLES = {
  critical: { color: '#ff3b30', bg: 'rgba(255,59,48,0.1)', icon: AlertTriangle },
  warning:  { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: AlertTriangle },
  info:     { color: 'var(--accent)', bg: 'var(--accent-bg)', icon: Info },
};

function AlertCard({ alert, onResolve, onAcknowledge, i }) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [note, setNote] = useState('');
  const sty = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const Icon = sty.icon;

  return (
    <motion.div {...stagger(i)}>
      <GlassCard style={{ borderLeft: `3px solid ${sty.color}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <Icon size={15} strokeWidth={1.5} style={{ color: sty.color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{alert.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{alert.description}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {alert.blueprint_reference && (
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blueprint says</span>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2, padding: '2px 8px', background: 'var(--color-bg-secondary)', borderRadius: 4 }}>{alert.blueprint_reference}</div>
                  </div>
                )}
                {alert.code_reality && (
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code has</span>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2, padding: '2px 8px', background: 'var(--color-bg-secondary)', borderRadius: 4 }}>{alert.code_reality}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {alert.status === 'open' && (
              <>
                <button onClick={() => onAcknowledge(alert.id)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>Acknowledge</button>
                <button onClick={() => setResolveOpen(true)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: '#28cd41' }}>
                  <CheckCircle size={12} strokeWidth={1.5} /> Resolve
                </button>
              </>
            )}
            {alert.status !== 'open' && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#28cd41', padding: '3px 8px', background: 'rgba(40,205,65,0.1)', borderRadius: 'var(--radius-full)' }}>{alert.status}</span>
            )}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
          Detected {new Date(alert.detected_at).toLocaleString()} · {alert.alert_type}
        </div>
      </GlassCard>

      <Modal isOpen={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve Alert">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{alert.title}</p>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Resolution Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What was fixed or why this can be ignored…" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setResolveOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => { onResolve(alert.id, note); setResolveOpen(false); }} className="btn-primary">Mark Resolved</button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

export default function DriftPage() {
  const [projectId, setProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: alerts, isLoading } = useDriftAlerts(projectId, statusFilter);
  const alertList = Array.isArray(alerts) ? alerts : [];
  const scanDrift = useScanDrift(projectId);
  const resolveAlert = useResolveAlert();

  const openCount = alertList.filter(a => a.status === 'open').length;
  const criticalCount = alertList.filter(a => a.severity === 'critical').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Drift Inbox</h1>
          <p className="page-subtitle">Blueprint vs. code mismatches</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              <option value="">Select project…</option>
              {projectList.map(p => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              {['open','acknowledged','resolved','all'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => projectId && scanDrift.mutate()} disabled={!projectId || scanDrift.isPending} className="btn-ai">
            <RefreshCw size={13} strokeWidth={1.5} style={{ animation: scanDrift.isPending ? 'spin 1s linear infinite' : 'none' }} />
            {scanDrift.isPending ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>
      </div>

      {projectId && alertList.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <GlassCard style={{ flex: 1, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: openCount > 0 ? '#ff9f0a' : '#28cd41' }}>{openCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Open Alerts</div>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: criticalCount > 0 ? '#ff3b30' : 'var(--text-primary)' }}>{criticalCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Critical</div>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{alertList.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Total ({statusFilter})</div>
          </GlassCard>
        </div>
      )}

      {!projectId ? (
        <EmptyState icon={AlertTriangle} title="Select a project" description="Choose a project to view its drift alerts." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      ) : alertList.length === 0 ? (
        <EmptyState icon={CheckCircle} title={statusFilter === 'open' ? "No open drift alerts" : "No alerts"} description={statusFilter === 'open' ? "Run a drift scan to detect blueprint vs. code mismatches." : "No alerts match the current filter."} action="Scan Now" onAction={() => projectId && scanDrift.mutate()} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertList.map((alert, i) => (
            <AlertCard
              key={alert.id} alert={alert} i={i}
              onResolve={(id, note) => resolveAlert.mutate({ alertId: id, status: 'resolved', resolution_note: note })}
              onAcknowledge={(id) => resolveAlert.mutate({ alertId: id, status: 'acknowledged', resolution_note: '' })}
            />
          ))}
        </div>
      )}

      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
