import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgentHooks, useCreateAgentHook, useDeleteAgentHook, useTriggerHook } from '../api/hooks';
import EmptyState from '../components/EmptyState';
import { Zap } from 'lucide-react';

const EVENT_TYPES = ['indexing_complete', 'code_push', 'wo_completed', 'drift_detected', 'feedback_received'];
const ACTIONS = ['generate_work_orders', 'scan_drift', 'summarize', 'notify', 'run_qa'];

export default function HooksPage() {
  const { projectId } = useParams();
  const { data: hooks = [], isLoading } = useAgentHooks(projectId);
  const createHook = useCreateAgentHook(projectId);
  const deleteHook = useDeleteAgentHook(projectId);
  const triggerHook = useTriggerHook();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', event_type: EVENT_TYPES[0], action: ACTIONS[0] });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Hooks</h1>
          <p className="page-subtitle">Event-triggered automations that fire when conditions are met</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Hook</button>
      </div>
      {showNew && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <input className="input-base" placeholder="Hook name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
          <select className="input-base" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input-base" value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value }))} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => { createHook.mutate(form); setShowNew(false); setForm({ name: '', event_type: EVENT_TYPES[0], action: ACTIONS[0] }); }}>Create</button>
          </div>
        </div>
      )}
      {isLoading ? <div className="skeleton" style={{ height: 100, borderRadius: 8 }} /> :
        hooks.length === 0 ? <EmptyState icon={Zap} title="No hooks" subtitle="Create hooks to automate agent actions on events" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hooks.map(h => (
            <div key={h.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{h.event_type} → {h.action}</div>
                {h.last_triggered_at && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Last run: {h.last_triggered_at.slice(0, 16)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => triggerHook.mutate(h.id)}>Run</button>
                <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--text-tertiary)' }} onClick={() => deleteHook.mutate(h.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
