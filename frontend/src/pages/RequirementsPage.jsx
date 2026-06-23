import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { PriorityBadge, StatusBadge, AIBadge } from '../components/Badge';
import { useProjects, useRequirements, useCreateRequirement, useGenerateRequirements } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

export default function RequirementsPage() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get('project') || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'P3', acceptance_criteria: '' });
  const [aiDesc, setAiDesc] = useState('');

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: requirements, isLoading } = useRequirements(projectId);
  const reqList = Array.isArray(requirements) ? requirements : requirements?.items || requirements?.requirements || [];
  const createReq = useCreateRequirement(projectId);
  const genReqs = useGenerateRequirements();

  useEffect(() => {
    const p = searchParams.get('project');
    if (p) setProjectId(p);
  }, [searchParams]);

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createReq.mutate(
      { ...form, acceptance_criteria: form.acceptance_criteria.split('\n').filter(Boolean) },
      { onSuccess: () => { setCreateOpen(false); setForm({ title: '', description: '', priority: 'P3', acceptance_criteria: '' }); } }
    );
  };

  const handleAIGenerate = () => {
    if (!aiDesc.trim() || !projectId) return;
    genReqs.mutate({ projectId, project_description: aiDesc }, { onSuccess: () => { setAiOpen(false); setAiDesc(''); } });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">Define what needs to be built</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-base"
              style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select project…</option>
              {projectList.map((p) => (
                <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => setAiOpen(true)} disabled={!projectId} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> AI Generate
          </button>
          <button onClick={() => setCreateOpen(true)} disabled={!projectId} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Add
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={FileText} title="Select a project" description="Choose a project above to view its requirements." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : reqList.length === 0 ? (
        <EmptyState icon={FileText} title="No requirements yet" description="Add requirements manually or let AI generate them from a description." action="Add Requirement" onAction={() => setCreateOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reqList.map((r, i) => (
            <motion.div key={r.id || r.requirement_id} {...stagger(i)}>
              <GlassCard>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{r.title}</span>
                      {r.ai_generated && <AIBadge />}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description}
                    </p>
                    {r.acceptance_criteria?.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {r.acceptance_criteria.map((ac, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <CheckCircle2 size={12} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0, color: 'var(--status-success)' }} />
                            {ac}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <PriorityBadge level={r.priority} />
                    <StatusBadge status={r.status || 'draft'} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Requirement">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Requirement title" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the requirement…" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-base">
              {['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Acceptance Criteria <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span></label>
            <textarea value={form.acceptance_criteria} onChange={(e) => setForm({ ...form, acceptance_criteria: e.target.value })} rows={3} placeholder={'User can log in\nPassword is validated'} className="input-base font-mono" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title.trim() || createReq.isPending} className="btn-primary">
              {createReq.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={aiOpen} onClose={() => setAiOpen(false)} title="Generate Requirements with AI">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Describe your project and AI will generate a set of requirements.</p>
          <textarea
            value={aiDesc}
            onChange={(e) => setAiDesc(e.target.value)}
            rows={6}
            placeholder="A mobile app that lets users track their daily water intake and sends reminders…"
            className="input-base"
            style={{ resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setAiOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleAIGenerate} disabled={!aiDesc.trim() || genReqs.isPending} className="btn-ai">
              <Sparkles size={13} strokeWidth={1.5} />{genReqs.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
