import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Layers, Box, ShieldAlert, ChevronDown, Code2, Eye, History, Edit2, Network, BookOpen, AlertOctagon, GitBranch, Copy, Check } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { StatusBadge, AIBadge } from '../components/Badge';
import {
  useProjects, useBlueprints, useCreateBlueprint, useUpdateBlueprint,
  useGenerateBlueprint, useParsedBlueprint, useVersionHistory, useBlueprintMermaid,
} from '../api/hooks';
import client from '../api/client';

const stagger = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] },
});

const NODE_COLORS = {
  component: { bg: 'rgba(0,82,255,0.08)', border: 'rgba(0,82,255,0.2)', text: 'var(--accent)', icon: Box },
  model: { bg: 'rgba(40,205,65,0.08)', border: 'rgba(40,205,65,0.25)', text: 'var(--status-success)', icon: BookOpen },
  adr: { bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.25)', text: 'var(--status-warning)', icon: AlertOctagon },
};

const DSL_PLACEHOLDER = `## Component: AuthService
**Technology:** FastAPI, JWT
**Responsibilities:** Handle user authentication and token management
**Interfaces:** POST /auth/login, GET /auth/me
**Depends on:** #Database, #UserService

## Model: \`User\`
**Fields:** id (UUID), email (str), name (str), created_at (datetime)
**Relationships:** has many Session

## ADR: @UseJWT
**Context:** Need stateless authentication that scales horizontally
**Decision:** JWT tokens with 1h expiry plus refresh tokens
**Rationale:** No shared session state, works across multiple instances
**Consequences:** Must handle token revocation with a denylist`;

function ParsedNodeCard({ node }) {
  const style = NODE_COLORS[node.type] || NODE_COLORS.component;
  const Icon = style.icon;
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: style.bg, border: `1px solid ${style.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={12} strokeWidth={1.5} style={{ color: style.text, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: style.text, textTransform: 'capitalize' }}>{node.type}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginLeft: 4 }}>{node.name}</span>
      </div>
      {Object.entries(node.properties || {}).map(([key, val]) => (
        <div key={key} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
          <span style={{ fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{key}: </span>
          {val}
        </div>
      ))}
    </div>
  );
}

function ParsedView({ projectId, bpId }) {
  const { data: parsed, isLoading } = useParsedBlueprint(projectId, bpId);

  if (isLoading) return <div className="skeleton" style={{ height: 100 }} />;
  if (!parsed?.nodes?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
        No DSL blocks detected. Add Component, Model, or ADR sections to the DSL editor.
      </div>
    );
  }

  const byType = parsed.nodes.reduce((acc, n) => {
    if (!acc[n.type]) acc[n.type] = [];
    acc[n.type].push(n);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(byType).map(([type, nodes]) => (
        <div key={type}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {type}s ({nodes.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nodes.map((n) => <ParsedNodeCard key={n.id} node={n} />)}
          </div>
        </div>
      ))}
      {parsed.edges?.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Relationships ({parsed.edges.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {parsed.edges.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Network size={10} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{e.source_id.split(':').pop()}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{e.relationship.replace('_', ' ')}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{e.target_id.split(':').pop()}</span>
              </div>
            ))}
          </div>
          {parsed.unresolved?.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-error)', marginBottom: 4 }}>Unresolved references</p>
              {parsed.unresolved.map((u, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--status-error)', fontFamily: 'monospace' }}>{u}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VersionHistoryPanel({ bpId }) {
  const { data: versions, isLoading } = useVersionHistory('blueprint', bpId);
  if (isLoading) return <div className="skeleton" style={{ height: 80 }} />;
  if (!versions?.length) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>No versions yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {versions.map((v) => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg-secondary)', border: '1px solid var(--border)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', flexShrink: 0 }}>
            v{v.version_number}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{v.summary}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{new Date(v.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const BLANK_FORM = { name: '', description: '', dsl_content: '', decisions: '', components: '', constraints: '' };

export default function BlueprintsPage() {
  const { projectId: paramProjectId } = useParams();
  const [projectId, setProjectId] = useState(paramProjectId || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailBp, setDetailBp] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [form, setForm] = useState(BLANK_FORM);
  const [mermaidBp, setMermaidBp] = useState(null);
  const [mermaidText, setMermaidText] = useState('');
  const [mermaidLoading, setMermaidLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMermaid = async (bp, e) => {
    e.stopPropagation();
    setMermaidBp(bp);
    setMermaidText('');
    setMermaidLoading(true);
    try {
      const r = await client.get(`/blueprints/${bp.id || bp.blueprint_id}/mermaid`);
      setMermaidText(r.data?.mermaid || r.data || '');
    } catch {
      setMermaidText('Error loading mermaid diagram.');
    } finally {
      setMermaidLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: blueprints, isLoading } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || blueprints?.blueprints || [];
  const createBp = useCreateBlueprint(projectId);
  const updateBp = useUpdateBlueprint(projectId);
  const genBp = useGenerateBlueprint();

  const openDetail = (bp) => {
    setDetailBp(bp);
    setEditMode(false);
    setDetailTab('overview');
  };

  const startEdit = () => {
    setForm({
      name: detailBp.name,
      description: detailBp.description || '',
      dsl_content: detailBp.dsl_content || '',
      decisions: '',
      components: '',
      constraints: '',
    });
    setEditMode(true);
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createBp.mutate(
      {
        name: form.name,
        description: form.description,
        dsl_content: form.dsl_content,
        decisions: [],
        components: [],
        constraints: [],
      },
      {
        onSuccess: (created) => {
          setCreateOpen(false);
          setForm(BLANK_FORM);
          setDetailBp(created);
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!form.name.trim() || !detailBp) return;
    updateBp.mutate(
      {
        bpId: detailBp.id,
        name: form.name,
        description: form.description,
        dsl_content: form.dsl_content,
        decisions: [],
        components: [],
        constraints: [],
      },
      {
        onSuccess: (updated) => {
          setDetailBp(updated);
          setEditMode(false);
        },
      }
    );
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'dsl', label: 'Parsed Nodes', icon: Network },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Blueprints</h1>
          <p className="page-subtitle">Architecture decisions and component graph</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
              <option value="">Select project</option>
              {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button
            onClick={() => projectId && genBp.mutate({ projectId })}
            disabled={!projectId || genBp.isPending}
            className="btn-ai"
          >
            <Sparkles size={13} strokeWidth={1.5} />{genBp.isPending ? 'Generating...' : 'AI Generate'}
          </button>
          <button onClick={() => { setForm(BLANK_FORM); setCreateOpen(true); }} disabled={!projectId} className="btn-primary">
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
        <EmptyState icon={Layers} title="No blueprints yet" description="Create a blueprint to define your architecture. Use the DSL to describe components, models, and ADRs." action="Create Blueprint" onAction={() => { setForm(BLANK_FORM); setCreateOpen(true); }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bpList.map((bp, i) => {
            const parsedNodes = JSON.parse(bp.parsed_nodes_json || '[]');
            const nodesByType = parsedNodes.reduce((a, n) => { a[n.type] = (a[n.type] || 0) + 1; return a; }, {});
            return (
              <motion.div key={bp.id} {...stagger(i)}>
                <GlassCard style={{ cursor: 'pointer' }} onClick={() => openDetail(bp)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: parsedNodes.length ? 14 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {bp.bp_id && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'monospace', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>
                          {bp.bp_id}
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{bp.name}</span>
                      {bp.ai_generated && <AIBadge />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>v{bp.version}</span>
                      <StatusBadge status="draft" />
                      <button
                        onClick={(e) => fetchMermaid(bp, e)}
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <GitBranch size={12} strokeWidth={1.5} /> Mermaid
                      </button>
                    </div>
                  </div>

                  {bp.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: parsedNodes.length ? 12 : 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {bp.description}
                    </p>
                  )}

                  {parsedNodes.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {Object.entries(nodesByType).map(([type, count]) => {
                        const style = NODE_COLORS[type] || NODE_COLORS.component;
                        return (
                          <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: style.bg, border: `1px solid ${style.border}`, fontSize: 11, color: style.text, fontWeight: 500 }}>
                            {count} {type}{count > 1 ? 's' : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={!!detailBp}
        onClose={() => { setDetailBp(null); setEditMode(false); }}
        title={editMode ? 'Edit Blueprint' : (detailBp?.bp_id || 'Blueprint')}
      >
        {detailBp && !editMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{detailBp.name}</h2>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Version {detailBp.version}</span>
              </div>
              <button onClick={startEdit} className="btn-ghost" style={{ padding: '6px 10px' }}>
                <Edit2 size={13} strokeWidth={1.5} /> Edit
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', border: 'none', background: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      color: detailTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: detailTab === t.id ? 500 : 400,
                      borderBottom: detailTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    <Icon size={13} strokeWidth={1.5} />{t.label}
                  </button>
                );
              })}
            </div>

            <div>
              {detailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {detailBp.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{detailBp.description}</p>
                  )}
                  {detailBp.dsl_content && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>DSL Content</p>
                      <pre style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, overflowX: 'auto', lineHeight: 1.7, maxHeight: 280, overflowY: 'auto' }}>
                        {detailBp.dsl_content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {detailTab === 'dsl' && <ParsedView projectId={projectId} bpId={detailBp.id} />}
              {detailTab === 'history' && <VersionHistoryPanel bpId={detailBp.id} />}
            </div>
          </div>
        )}

        {detailBp && editMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-base" style={{ resize: 'none' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>DSL Content</label>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Use ## Component:, ## Model:, ## ADR: sections</span>
              </div>
              <textarea
                value={form.dsl_content}
                onChange={(e) => setForm({ ...form, dsl_content: e.target.value })}
                rows={14}
                placeholder={DSL_PLACEHOLDER}
                className="input-base font-mono"
                style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.7 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button onClick={() => setEditMode(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleUpdate} disabled={!form.name.trim() || updateBp.isPending} className="btn-primary">
                {updateBp.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Mermaid modal */}
      <Modal isOpen={!!mermaidBp} onClose={() => { setMermaidBp(null); setMermaidText(''); setCopied(false); }} title={`Mermaid — ${mermaidBp?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mermaidLoading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : (
            <pre style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, overflowX: 'auto', lineHeight: 1.7, maxHeight: 360, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {mermaidText || 'No diagram available.'}
            </pre>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => { setMermaidBp(null); setMermaidText(''); setCopied(false); }} className="btn-ghost">Close</button>
            <button onClick={handleCopy} disabled={!mermaidText || mermaidLoading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Blueprint">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. v1 Architecture" className="input-base" autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief architectural overview" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>DSL Content</label>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Optional, can add later</span>
            </div>
            <textarea
              value={form.dsl_content}
              onChange={(e) => setForm({ ...form, dsl_content: e.target.value })}
              rows={8}
              placeholder={DSL_PLACEHOLDER}
              className="input-base font-mono"
              style={{ resize: 'none', fontSize: 12, lineHeight: 1.6 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim() || createBp.isPending} className="btn-primary">
              {createBp.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
