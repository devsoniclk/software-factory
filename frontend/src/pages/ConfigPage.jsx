import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgentInstructions, useUpsertInstruction, useDocTemplates, useCreateDocTemplate, useWOStrategies } from '../api/hooks';

const MODULES = ['global', 'requirements', 'blueprints', 'work_orders', 'tests', 'feedback'];

export default function ConfigPage() {
  const { projectId } = useParams();
  const [tab, setTab] = useState('instructions');
  const { data: instructions = [] } = useAgentInstructions(projectId);
  const { data: templates = [] } = useDocTemplates(projectId);
  const { data: strategies = [] } = useWOStrategies();
  const upsert = useUpsertInstruction(projectId);
  const createTemplate = useCreateDocTemplate(projectId);
  const [editModule, setEditModule] = useState(null);
  const [editText, setEditText] = useState('');
  const [newTpl, setNewTpl] = useState({ name: '', template_type: 'requirement', body: '' });
  const [showNewTpl, setShowNewTpl] = useState(false);

  const getInstruction = (mod) => instructions.find(i => i.module === mod)?.instructions || '';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuration</h1>
          <p className="page-subtitle">Agent instructions, document templates, WO strategies</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['instructions', 'templates', 'strategies'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13 }}>
            {t === 'instructions' ? 'Agent Instructions' : t === 'templates' ? 'Doc Templates' : 'WO Strategies'}
          </button>
        ))}
      </div>

      {tab === 'instructions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map(mod => (
            <div key={mod} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{mod}</span>
                {editModule === mod ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditModule(null)}>Cancel</button>
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => { upsert.mutate({ module: mod, instructions: editText }); setEditModule(null); }}>Save</button>
                  </div>
                ) : (
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { setEditModule(mod); setEditText(getInstruction(mod)); }}>Edit</button>
                )}
              </div>
              {editModule === mod ? (
                <textarea className="input-base" value={editText} onChange={e => setEditText(e.target.value)} rows={4} style={{ width: '100%', resize: 'vertical' }} placeholder="Additional instructions for this module's AI agent..." />
              ) : (
                <p style={{ fontSize: 13, color: getInstruction(mod) ? 'var(--text-secondary)' : 'var(--text-tertiary)', whiteSpace: 'pre-wrap' }}>
                  {getInstruction(mod) || 'No custom instructions — using defaults.'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setShowNewTpl(true)}>+ New Template</button>
          </div>
          {showNewTpl && (
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
              <input className="input-base" placeholder="Template name" value={newTpl.name} onChange={e => setNewTpl(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 8, display: 'block', width: '100%' }} />
              <select className="input-base" value={newTpl.template_type} onChange={e => setNewTpl(p => ({ ...p, template_type: e.target.value }))} style={{ marginBottom: 8, display: 'block', width: '100%' }}>
                {['requirement', 'blueprint', 'work_order', 'test'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea className="input-base" rows={6} placeholder="Markdown template body with {{placeholders}}" value={newTpl.body} onChange={e => setNewTpl(p => ({ ...p, body: e.target.value }))} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowNewTpl(false)}>Cancel</button>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => { createTemplate.mutate(newTpl); setShowNewTpl(false); setNewTpl({ name: '', template_type: 'requirement', body: '' }); }}>Create</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No custom templates yet.</p>}
            {templates.map(t => (
              <div key={t.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{t.template_type}</span>
                  </div>
                </div>
                <pre style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, overflow: 'auto', maxHeight: 80 }}>{t.body}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'strategies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {strategies.map(s => (
            <div key={s.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                {s.is_builtin && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>built-in</span>}
              </div>
              {s.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{s.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
