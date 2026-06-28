import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, Send, ChevronDown, ArrowUpCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { AIBadge } from '../components/Badge';
import { useProjects, useFeedback, useCreateFeedback, useParseFeedback, useLinkFeedback, useWorkOrdersForProject } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

const SOURCE_COLORS = {
  user: { bg: '#EBF8FF', color: '#0369A1', border: '#BAE6FD' },
  internal: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  support: { bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
};

export default function FeedbackPage() {
  const [projectId, setProjectId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [source, setSource]   = useState('user');
  const [content, setContent] = useState('');
  const [promoteTarget, setPromoteTarget] = useState(null); // fb item being promoted

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: feedback, isLoading } = useFeedback(projectId);
  const fbList = Array.isArray(feedback) ? feedback : feedback?.items || feedback?.feedback || [];
  const createFb  = useCreateFeedback(projectId);
  const parseFb   = useParseFeedback();
  const linkFb    = useLinkFeedback(projectId);
  const { data: allWorkOrders } = useWorkOrdersForProject(projectId);

  const handleSubmit = () => {
    if (!content.trim()) return;
    createFb.mutate(
      { source, content },
      { onSuccess: () => { setCreateOpen(false); setSource('user'); setContent(''); } }
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback</h1>
          <p className="page-subtitle">User signals and parsed insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
              <option value="">Select project…</option>
              {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => projectId && parseFb.mutate({ projectId })} disabled={!projectId || parseFb.isPending} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> {parseFb.isPending ? 'Parsing…' : 'AI Parse'}
          </button>
          <button onClick={() => setCreateOpen(true)} disabled={!projectId} className="btn-primary">
            <Send size={14} strokeWidth={1.5} /> Submit
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={MessageSquare} title="Select a project" description="Choose a project to view feedback." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      ) : fbList.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback yet" description="Submit user feedback to be parsed into actionable tasks." action="Submit Feedback" onAction={() => setCreateOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fbList.map((fb, i) => {
            const src = fb.source || 'user';
            const colors = SOURCE_COLORS[src] || SOURCE_COLORS.user;
            return (
              <motion.div key={fb.id || fb.feedback_id} {...stagger(i)}>
                <GlassCard>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, textTransform: 'capitalize' }}>{src}</span>
                      {fb.ai_parsed && <AIBadge />}
                    </div>
                    {fb.created_at && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: fb.parsed_tasks?.length ? 12 : 0 }}>{fb.content}</p>
                  {fb.parsed_tasks?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Parsed Tasks</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {fb.parsed_tasks.map((t, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{typeof t === 'string' ? t : t.title || t.description}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        {fb.linked_work_order_id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                            Linked
                          </span>
                        ) : (
                          <button
                            onClick={() => setPromoteTarget(fb)}
                            className="btn-ghost"
                            style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          >
                            <ArrowUpCircle size={13} strokeWidth={1.5} /> Promote to WO
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Promote to Work Order modal */}
      <Modal isOpen={!!promoteTarget} onClose={() => setPromoteTarget(null)} title="Promote to Work Order">
        {promoteTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Select a work order to link this feedback to:</p>
            {!allWorkOrders || allWorkOrders.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>No work orders found. Generate or create work orders first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {allWorkOrders.map((wo) => (
                  <button
                    key={wo.id || wo.work_order_id}
                    onClick={() => {
                      linkFb.mutate(
                        { fbId: promoteTarget.id || promoteTarget.feedback_id, workOrderId: wo.id || wo.work_order_id },
                        { onSuccess: () => setPromoteTarget(null) }
                      );
                    }}
                    disabled={linkFb.isPending}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{wo.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{wo.blueprint_name}</div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPromoteTarget(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Submit Feedback">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Source</label>
            <div style={{ position: 'relative' }}>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="input-base" style={{ appearance: 'none', paddingRight: 32 }}>
                <option value="user">User</option>
                <option value="internal">Internal</option>
                <option value="support">Support</option>
              </select>
              <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Feedback</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="What did users say?" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={!content.trim() || createFb.isPending} className="btn-primary">
              {createFb.isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
