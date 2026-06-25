import { useState } from 'react';
import { useTemplates, useTemplate, useApplyTemplate } from '../api/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutTemplate, FileText, GitBranch, ChevronRight, X, Check, Loader } from 'lucide-react';

function TemplateCard({ tmpl, onSelect, selected }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => onSelect(tmpl)}
      style={{
        padding: 18,
        borderRadius: 12,
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-bg)' : 'var(--color-bg-secondary)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LayoutTemplate size={16} color="#fff" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{tmpl.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{tmpl.category}</div>
          </div>
        </div>
        {selected && <Check size={16} color="var(--accent)" strokeWidth={2} />}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>{tmpl.description}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
          <FileText size={10} /> {tmpl.req_count} reqs
        </span>
        {tmpl.has_blueprint && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
            <GitBranch size={10} /> blueprint
          </span>
        )}
      </div>
    </motion.div>
  );
}

function ApplyModal({ template, onClose, onSuccess }) {
  const { data: detail } = useTemplate(template?.id);
  const applyMutation = useApplyTemplate();
  const [form, setForm] = useState({ project_name: template?.name || '', project_description: template?.description || '' });
  const [done, setDone] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await applyMutation.mutateAsync({
        templateId: template.id,
        project_name: form.project_name,
        project_description: form.project_description,
      });
      setDone(result);
      onSuccess?.(result);
    } catch {}
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.18 }}
        style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 540, overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Apply Template</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{template?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, display: 'flex' }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {done ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} color="#059669" strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Project Created!</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}><strong>{done.project_name}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {done.requirements_created} requirements{done.blueprint_created ? ' + blueprint' : ''} created
            </div>
            <button onClick={onClose} style={{ marginTop: 22, padding: '9px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
            {detail?.requirements?.length > 0 && (
              <div style={{ marginBottom: 18, padding: 14, background: 'var(--color-bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Includes</div>
                {detail.requirements.slice(0, 4).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={10} color="var(--text-tertiary)" /> {r.title}
                  </div>
                ))}
                {detail.requirements.length > 4 && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>+{detail.requirements.length - 4} more</div>
                )}
              </div>
            )}

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Project Name</span>
              <input
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</span>
              <textarea
                value={form.project_description}
                onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button type="submit" disabled={applyMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: applyMutation.isPending ? 0.7 : 1 }}>
                {applyMutation.isPending ? <Loader size={13} className="spin" /> : <ChevronRight size={13} />}
                {applyMutation.isPending ? 'Creating…' : 'Create Project'}
              </button>
            </div>
            {applyMutation.isError && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                Failed: {applyMutation.error?.response?.data?.detail || applyMutation.error?.message}
              </div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);

  if (isLoading) return <div style={{ padding: 40, fontSize: 13, color: 'var(--text-tertiary)' }}>Loading templates…</div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Project Templates</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Start a new project from a pre-built template with requirements and blueprints included.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {(templates || []).map((t) => (
          <TemplateCard key={t.id} tmpl={t} selected={selected?.id === t.id} onSelect={setSelected} />
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--accent-bg)', border: '1.5px solid var(--accent)', borderRadius: 12 }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong>{selected.name}</strong> selected — {selected.req_count} requirements{selected.has_blueprint ? ', blueprint' : ''}
          </div>
          <button
            onClick={() => setApplying(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Use Template <ChevronRight size={13} />
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {applying && selected && (
          <ApplyModal
            template={selected}
            onClose={() => { setApplying(false); }}
            onSuccess={() => { setSelected(null); }}
          />
        )}
      </AnimatePresence>

      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
