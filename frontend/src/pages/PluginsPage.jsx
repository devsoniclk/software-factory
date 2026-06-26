import { useState } from 'react';
import { motion } from 'framer-motion';
import { Puzzle, Plus, Trash2, ToggleLeft, ToggleRight, Zap, Check } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

function usePlugins() {
  return useQuery({
    queryKey: ['plugins'],
    queryFn: () => client.get('/plugins').then((r) => r.data),
  });
}

function useRegisterPlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/plugins/register', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });
}

function useDeletePlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/plugins/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });
}

function useTogglePlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }) => client.patch(`/plugins/${id}/toggle?enabled=${enabled}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });
}

const CATEGORY_COLOR = {
  ai:     { bg: 'rgba(0,82,255,0.08)',   color: '#0042CC', border: 'rgba(0,82,255,0.18)' },
  custom: { bg: 'rgba(139,92,246,0.09)', color: '#6D28D9', border: 'rgba(139,92,246,0.20)' },
};

function CategoryPill({ category }) {
  const s = CATEGORY_COLOR[category] || CATEGORY_COLOR.custom;
  return (
    <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {category}
    </span>
  );
}

function PluginCard({ plugin, onToggle, onDelete, delay }) {
  const isBuiltin = plugin.builtin;
  return (
    <motion.div {...stagger(delay)}>
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: plugin.enabled ? 'var(--accent-bg)' : 'var(--color-bg-secondary)', border: `1px solid ${plugin.enabled ? 'var(--accent-border)' : 'var(--border)'}`, flexShrink: 0 }}>
              {isBuiltin ? <Zap size={16} strokeWidth={1.5} style={{ color: plugin.enabled ? 'var(--accent)' : 'var(--text-tertiary)' }} /> : <Puzzle size={16} strokeWidth={1.5} style={{ color: plugin.enabled ? 'var(--accent)' : 'var(--text-tertiary)' }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{plugin.name}</span>
                <CategoryPill category={plugin.category || 'custom'} />
                {isBuiltin && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>BUILT-IN</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{plugin.description}</p>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                v{plugin.version}{plugin.author ? ` · ${plugin.author}` : ''}
                {plugin.endpoint && <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{plugin.endpoint}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => onToggle(plugin.id, !plugin.enabled)}
              title={plugin.enabled ? 'Disable' : 'Enable'}
              style={{ display: 'flex', alignItems: 'center', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: plugin.enabled ? 'var(--accent)' : 'var(--text-tertiary)', borderRadius: 8 }}
            >
              {plugin.enabled ? <ToggleRight size={20} strokeWidth={1.5} /> : <ToggleLeft size={20} strokeWidth={1.5} />}
            </button>
            {!isBuiltin && (
              <button
                onClick={() => onDelete(plugin.id)}
                style={{ display: 'flex', alignItems: 'center', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--status-error)', borderRadius: 8 }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function PluginsPage() {
  const { data, isLoading } = usePlugins();
  const register = useRegisterPlugin();
  const deletePlugin = useDeletePlugin();
  const togglePlugin = useTogglePlugin();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', description: '', version: '0.1.0', author: '', category: 'custom', endpoint: '' });

  const allPlugins = [...(data?.builtin || []), ...(data?.custom || [])];

  const handleSubmit = () => {
    if (!form.id.trim() || !form.name.trim()) return;
    register.mutate(form, { onSuccess: () => { setShowModal(false); setForm({ id: '', name: '', description: '', version: '0.1.0', author: '', category: 'custom', endpoint: '' }); } });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Plugins</h1>
          <p className="page-subtitle">Manage built-in and custom AI agent plugins</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Register Plugin
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : allPlugins.length === 0 ? (
        <EmptyState icon={Puzzle} title="No plugins" description="Register a custom plugin to extend AI capabilities." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data?.builtin?.length > 0 && (
            <p className="section-label" style={{ marginBottom: 8 }}>Built-in Agents</p>
          )}
          {data?.builtin?.map((p, i) => (
            <PluginCard key={p.id} plugin={p} delay={i}
              onToggle={(id, en) => togglePlugin.mutate({ id, enabled: en })}
              onDelete={(id) => deletePlugin.mutate(id)}
            />
          ))}
          {data?.custom?.length > 0 && (
            <p className="section-label" style={{ marginTop: 16, marginBottom: 8 }}>Custom Plugins</p>
          )}
          {data?.custom?.map((p, i) => (
            <PluginCard key={p.id} plugin={p} delay={i + (data?.builtin?.length || 0)}
              onToggle={(id, en) => togglePlugin.mutate({ id, enabled: en })}
              onDelete={(id) => deletePlugin.mutate(id)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register Plugin">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'id',          label: 'Plugin ID',    placeholder: 'my-plugin' },
            { key: 'name',        label: 'Name',         placeholder: 'My Plugin' },
            { key: 'description', label: 'Description',  placeholder: 'What does it do?' },
            { key: 'version',     label: 'Version',      placeholder: '0.1.0' },
            { key: 'author',      label: 'Author',       placeholder: 'Your name' },
            { key: 'endpoint',    label: 'Endpoint URL', placeholder: 'http://localhost:9000/agent' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</label>
              <input
                className="input-base"
                style={{ width: '100%' }}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Category</label>
            <select className="input-base" style={{ width: '100%' }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option value="ai">AI</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={!form.id.trim() || !form.name.trim() || register.isPending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} strokeWidth={2} /> {register.isPending ? 'Registering…' : 'Register'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
