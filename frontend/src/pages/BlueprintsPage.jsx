import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Layers, Box, ShieldAlert, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { StatusBadge, AIBadge } from '../components/Badge';
import { useProjects, useBlueprints, useCreateBlueprint, useGenerateBlueprint } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

export default function BlueprintsPage() {
  const [projectId, setProjectId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', decisions: '', components: '', constraints: '' });

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: blueprints, isLoading } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || blueprints?.blueprints || [];
  const createBp = useCreateBlueprint(projectId);
  const genBp = useGenerateBlueprint();

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createBp.mutate(
      {
        name: form.name,
        decisions:   form.decisions.split('\n').filter(Boolean),
        components:  form.components.split('\n').filter(Boolean),
        constraints: form.constraints.split('\n').filter(Boolean),
      },
      { onSuccess: () => { setCreateOpen(false); setForm({ name: '', decisions: '', components: '', constraints: '' }); } }
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Blueprints</h1>
          <p className="page-subtitle">Architecture and design decisions</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
              <option value="">Select project…</option>
              {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => projectId && genBp.mutate({ projectId })} disabled={!projectId} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> AI Generate
          </button>
          <button onClick={() => setCreateOpen(true)} disabled={!projectId} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Add
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={Layers} title="Select a project" description="Choose a project to view its blueprints." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : bpList.length === 0 ? (
        <EmptyState icon={Layers} title="No blueprints yet" description="Create a blueprint to define your architecture." action="Create Blueprint" onAction={() => setCreateOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bpList.map((bp, i) => (
            <motion.div key={bp.id || bp.blueprint_id} {...stagger(i)}>
              <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{bp.name}</span>
                    {bp.ai_generated && <AIBadge />}
                  </div>
                  <StatusBadge status={bp.status || 'draft'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                  {bp.decisions?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Decisions</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {bp.decisions.map((d, j) => <li key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {bp.components?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Components</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {bp.components.map((c, j) => (
                          <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 12, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <Box size={10} strokeWidth={1.5} />{c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {bp.constraints?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Constraints</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {bp.constraints.map((c, j) => (
                          <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <ShieldAlert size={12} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0, color: 'var(--status-warning)' }} />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Blueprint" maxWidth="max-w-xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Blueprint name" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Decisions <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span></label>
            <textarea value={form.decisions} onChange={(e) => setForm({ ...form, decisions: e.target.value })} rows={3} placeholder="Use REST API" className="input-base font-mono" style={{ resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Components <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span></label>
            <textarea value={form.components} onChange={(e) => setForm({ ...form, components: e.target.value })} rows={3} placeholder={'Auth Service\nDatabase'} className="input-base font-mono" style={{ resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Constraints <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span></label>
            <textarea value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} rows={2} placeholder="Must handle 1000 req/s" className="input-base font-mono" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim() || createBp.isPending} className="btn-primary">
              {createBp.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
