import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, AlertTriangle, MousePointerClick, Bug, MessageSquare, ArrowUpCircle, X, Copy, Check, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useProjects, useBlueprints, useFrictionEvents, useDismissEvent, usePromoteEvent, useWidgetSnippet } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

const TYPE_STYLES = {
  rage_click:       { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', icon: MousePointerClick, label: 'Rage Click' },
  error:            { color: '#ff3b30', bg: 'rgba(255,59,48,0.08)', icon: Bug,              label: 'JS Error'   },
  long_pause:       { color: '#8e8e93', bg: 'var(--color-bg-secondary)', icon: AlertTriangle, label: 'Long Pause' },
  repeated_action:  { color: '#bf5af2', bg: 'rgba(191,90,242,0.08)', icon: AlertTriangle, label: 'Repeated Action' },
  feedback:         { color: 'var(--accent)', bg: 'var(--accent-bg)', icon: MessageSquare, label: 'User Feedback' },
};

function EventCard({ event, blueprints, i }) {
  const dismiss = useDismissEvent();
  const promote = usePromoteEvent();
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [bpId, setBpId] = useState('');
  const sty = TYPE_STYLES[event.event_type] || TYPE_STYLES.feedback;
  const Icon = sty.icon;

  return (
    <motion.div {...stagger(i)}>
      <GlassCard style={{ borderLeft: `3px solid ${sty.color}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: sty.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: sty.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: sty.color }}>{sty.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(event.created_at).toLocaleString()}</span>
              </div>
              {event.message && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>{event.message}</p>}
              {event.page_url && <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{event.page_url}</div>}
              {event.element_selector && <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)', marginTop: 2 }}>selector: {event.element_selector}</div>}
            </div>
          </div>
          {event.status === 'open' && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setPromoteOpen(true)} className="btn-ghost" style={{ fontSize: 12, color: 'var(--accent)' }}>
                <ArrowUpCircle size={12} /> Promote
              </button>
              <button onClick={() => dismiss.mutate(event.id)} className="btn-ghost" style={{ fontSize: 12 }}>
                <X size={12} />
              </button>
            </div>
          )}
          {event.status !== 'open' && (
            <span style={{ fontSize: 11, fontWeight: 600, color: event.status === 'promoted' ? '#28cd41' : 'var(--text-tertiary)', padding: '3px 8px', background: event.status === 'promoted' ? 'rgba(40,205,65,0.1)' : 'var(--color-bg-secondary)', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
              {event.status}
            </span>
          )}
        </div>
      </GlassCard>

      <Modal isOpen={promoteOpen} onClose={() => setPromoteOpen(false)} title="Promote to Work Order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sty.label}: {event.message?.slice(0, 100)}</p>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Blueprint</label>
            <div style={{ position: 'relative' }}>
              <select value={bpId} onChange={e => setBpId(e.target.value)} className="input-base" style={{ appearance: 'none', paddingRight: 32 }}>
                <option value="">Select blueprint…</option>
                {blueprints.map(b => <option key={b.id || b.blueprint_id} value={b.id || b.blueprint_id}>{b.name}</option>)}
              </select>
              <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setPromoteOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => { promote.mutate({ eventId: event.id, blueprint_id: bpId }); setPromoteOpen(false); }} disabled={!bpId || promote.isPending} className="btn-primary">
              {promote.isPending ? 'Creating…' : 'Create Work Order'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function SnippetCard({ projectId }) {
  const [copied, setCopied] = useState(false);
  const { data } = useWidgetSnippet(projectId);

  if (!data?.snippet) return null;
  const copy = () => { navigator.clipboard.writeText(data.snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <GlassCard style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Embed Widget</span>
        <button onClick={copy} className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.6 }}>{data.snippet}</code>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>Paste this into your app's HTML to capture friction events and enable the support chat widget.</p>
    </GlassCard>
  );
}

export default function LiveAssistancePage() {
  const [projectId, setProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: blueprints } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || [];
  const { data: events, isLoading } = useFrictionEvents(projectId, statusFilter);
  const eventList = Array.isArray(events) ? events : [];

  const errorCount   = eventList.filter(e => e.event_type === 'error').length;
  const rageCount    = eventList.filter(e => e.event_type === 'rage_click').length;
  const feedbackCount = eventList.filter(e => e.event_type === 'feedback').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Assistance</h1>
          <p className="page-subtitle">Friction events, support chat, and session insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              <option value="">Select project…</option>
              {projectList.map(p => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              {['open','promoted','dismissed','all'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={Radio} title="Select a project" description="Choose a project to view friction events and embed the support widget." />
      ) : (
        <>
          <SnippetCard projectId={projectId} />
          {eventList.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {[{ label: 'Errors', value: errorCount, color: '#ff3b30' }, { label: 'Rage Clicks', value: rageCount, color: '#ff9f0a' }, { label: 'Feedback', value: feedbackCount, color: 'var(--accent)' }].map(s => (
                <GlassCard key={s.label} style={{ flex: 1, minWidth: 90, padding: '10px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
                </GlassCard>
              ))}
            </div>
          )}
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}</div>
          ) : eventList.length === 0 ? (
            <EmptyState icon={Radio} title="No friction events" description="Embed the widget in your app to start capturing user friction events in real-time." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eventList.map((e, i) => <EventCard key={e.id} event={e} blueprints={bpList} i={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
