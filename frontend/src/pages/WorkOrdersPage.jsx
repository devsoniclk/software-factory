import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, ListChecks, Code2, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { StatusBadge, AIBadge } from '../components/Badge';
import { useBlueprints, useWorkOrders, useCreateWorkOrder, useGenerateWorkOrders, useProjects, useUpdateWorkOrderStatus } from '../api/hooks';

const WO_TRANSITIONS = {
  pending:     ['in_progress'],
  in_progress: ['completed', 'blocked'],
  blocked:     ['in_progress'],
  completed:   ['in_progress'],
};

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

const SelectField = ({ value, onChange, children, disabled }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={onChange} disabled={disabled} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </select>
    <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
  </div>
);

export default function WorkOrdersPage() {
  const { projectId: paramProjectId } = useParams();
  const [projectId, setProjectId]   = useState(paramProjectId || '');
  const [blueprintId, setBlueprintId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', files_to_modify: '' });

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: blueprints } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || blueprints?.blueprints || [];
  const { data: workOrders, isLoading } = useWorkOrders(blueprintId);
  const woList = Array.isArray(workOrders) ? workOrders : workOrders?.items || workOrders?.work_orders || [];
  const createWo = useCreateWorkOrder(blueprintId);
  const genWo = useGenerateWorkOrders();
  const updateStatus = useUpdateWorkOrderStatus(blueprintId);

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createWo.mutate(
      { ...form, files_to_modify: form.files_to_modify.split('\n').filter(Boolean) },
      { onSuccess: () => { setCreateOpen(false); setForm({ title: '', description: '', files_to_modify: '' }); } }
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">Atomic implementation tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SelectField value={projectId} onChange={(e) => { setProjectId(e.target.value); setBlueprintId(''); }}>
            <option value="">Project…</option>
            {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
          </SelectField>
          <SelectField value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} disabled={!projectId}>
            <option value="">Blueprint…</option>
            {bpList.map((b) => <option key={b.id || b.blueprint_id} value={b.id || b.blueprint_id}>{b.name}</option>)}
          </SelectField>
          <button onClick={() => blueprintId && genWo.mutate({ blueprintId })} disabled={!blueprintId} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> AI Generate
          </button>
          <button onClick={() => setCreateOpen(true)} disabled={!blueprintId} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Add
          </button>
        </div>
      </div>

      {!blueprintId ? (
        <EmptyState icon={ListChecks} title="Select a blueprint" description="Choose a project and blueprint to view work orders." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 88 }} />)}
        </div>
      ) : woList.length === 0 ? (
        <EmptyState icon={ListChecks} title="No work orders" description="Generate work orders from a blueprint or add manually." action="Add Work Order" onAction={() => setCreateOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {woList.map((wo, i) => (
            <motion.div key={wo.id || wo.work_order_id} {...stagger(i)}>
              <GlassCard>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {wo.wo_id && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'monospace', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>
                        {wo.wo_id}
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{wo.title}</span>
                    {wo.ai_generated && <AIBadge />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <StatusBadge status={wo.status || 'pending'} />
                    {(WO_TRANSITIONS[wo.status || 'pending'] || []).length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            updateStatus.mutate({ woId: wo.id || wo.work_order_id, status: e.target.value });
                            e.target.value = '';
                          }}
                          className="input-base"
                          style={{ fontSize: 12, padding: '3px 24px 3px 8px', appearance: 'none', cursor: 'pointer', height: 'auto' }}
                        >
                          <option value="">Move to…</option>
                          {(WO_TRANSITIONS[wo.status || 'pending'] || []).map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} strokeWidth={1.5} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: wo.ai_output || wo.files_to_modify?.length ? 12 : 0 }}>{wo.description}</p>
                {wo.ai_output && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', marginBottom: wo.files_to_modify?.length ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Code2 size={12} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Output</span>
                    </div>
                    <pre style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{wo.ai_output}</pre>
                  </div>
                )}
                {wo.files_to_modify?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {wo.files_to_modify.map((f, j) => (
                      <span key={j} style={{ padding: '2px 8px', fontSize: 12, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontFamily: 'inherit' }}>{f}</span>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Work Order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Work order title" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What needs to be done…" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Files to Modify <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span></label>
            <textarea value={form.files_to_modify} onChange={(e) => setForm({ ...form, files_to_modify: e.target.value })} rows={2} placeholder={'src/auth.py\nsrc/models.py'} className="input-base font-mono" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title.trim() || createWo.isPending} className="btn-primary">
              {createWo.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
