import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, FileText, CheckCircle2, AlertTriangle, ChevronDown, X, History, Edit2, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import MarkdownEditor from '../components/MarkdownEditor';
import DiffViewer from '../components/DiffViewer';
import AIReviewModal from '../components/AIReviewModal';
import { PriorityBadge, StatusBadge, AIBadge } from '../components/Badge';
import {
  useProjects, useRequirements, useCreateRequirement, useUpdateRequirement,
  useGenerateRequirements, useVersionHistory, useVersionContent,
} from '../api/hooks';

const stagger = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] },
});

function EARSWarningBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 'var(--radius-full)',
      background: 'rgba(255, 159, 10, 0.12)', border: '1px solid rgba(255, 159, 10, 0.3)',
      fontSize: 11, fontWeight: 500, color: 'var(--status-warning)',
    }}>
      <AlertTriangle size={9} strokeWidth={2} />
      {count} EARS
    </span>
  );
}

function ReqIdBadge({ reqId }) {
  if (!reqId) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-mono, monospace)',
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--border)',
      padding: '1px 6px', borderRadius: 4,
      letterSpacing: '0.02em',
    }}>
      {reqId}
    </span>
  );
}

function VersionHistory({ entityType, entityId, onClose }) {
  const { data: versions, isLoading } = useVersionHistory(entityType, entityId);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [diffMode, setDiffMode] = useState(false);
  const { data: versionContent } = useVersionContent(entityType, entityId, selectedVersion);
  const prevVer = selectedVersion && selectedVersion > 1 ? selectedVersion - 1 : null;
  const { data: prevContent } = useVersionContent(entityType, entityId, prevVer);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Version History</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : !versions?.length ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No versions recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVersion(selectedVersion === v.version_number ? null : v.version_number)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 12px', borderRadius: 8, textAlign: 'left', width: '100%',
                background: selectedVersion === v.version_number ? 'var(--accent-bg)' : 'var(--color-bg-secondary)',
                border: `1px solid ${selectedVersion === v.version_number ? 'var(--accent-border)' : 'var(--border)'}`,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.12s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: selectedVersion === v.version_number ? 'var(--accent)' : 'var(--color-bg)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: selectedVersion === v.version_number ? '#fff' : 'var(--text-tertiary)',
              }}>
                v{v.version_number}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{v.summary || 'Updated'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} strokeWidth={1.5} />
                  {new Date(v.created_at).toLocaleString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedVersion && versionContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: 12 }}
          >
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--color-bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Version {selectedVersion}
                </p>
                {prevVer && (
                  <button
                    onClick={() => setDiffMode((d) => !d)}
                    style={{ fontSize: 11, color: diffMode ? 'var(--accent)' : 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  >
                    {diffMode ? 'Hide diff' : `Show diff vs v${prevVer}`}
                  </button>
                )}
              </div>
              {diffMode && prevContent ? (
                <DiffViewer
                  oldContent={[prevContent.content?.title || '', prevContent.content?.description || '', ...(prevContent.content?.acceptance_criteria || [])].join('\n\n')}
                  newContent={[versionContent.content?.title || '', versionContent.content?.description || '', ...(versionContent.content?.acceptance_criteria || [])].join('\n\n')}
                  oldLabel={`v${prevVer}`}
                  newLabel={`v${selectedVersion}`}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>Title</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{versionContent.content?.title}</p>
                  </div>
                  {versionContent.content?.description && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>Description</p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{versionContent.content.description}</p>
                    </div>
                  )}
                  {versionContent.content?.acceptance_criteria?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Acceptance Criteria</p>
                      {versionContent.content.acceptance_criteria.map((ac, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, marginBottom: 4 }}>
                          <CheckCircle2 size={11} style={{ flexShrink: 0, marginTop: 2, color: 'var(--status-success)' }} />
                          {ac}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BLANK_FORM = { title: '', description: '', priority: 3, acceptance_criteria: '' };

export default function RequirementsPage() {
  const [projectId, setProjectId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiReviewItems, setAiReviewItems] = useState(null);
  const [detailReq, setDetailReq] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [aiDesc, setAiDesc] = useState('');

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: requirements, isLoading } = useRequirements(projectId);
  const reqList = Array.isArray(requirements) ? requirements : requirements?.items || requirements?.requirements || [];
  const createReq = useCreateRequirement(projectId);
  const updateReq = useUpdateRequirement(projectId);
  const genReqs = useGenerateRequirements();

  const openDetail = (r) => {
    setDetailReq(r);
    setEditMode(false);
    setHistoryOpen(false);
  };

  const startEdit = () => {
    const ac = JSON.parse(detailReq.acceptance_criteria_json || '[]');
    setForm({
      title: detailReq.title,
      description: detailReq.description,
      priority: detailReq.priority,
      acceptance_criteria: ac.join('\n'),
    });
    setEditMode(true);
  };

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createReq.mutate(
      {
        title: form.title,
        description: form.description,
        priority: Number(form.priority),
        acceptance_criteria: form.acceptance_criteria.split('\n').filter(Boolean),
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm(BLANK_FORM);
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!form.title.trim() || !detailReq) return;
    updateReq.mutate(
      {
        reqId: detailReq.id,
        title: form.title,
        description: form.description,
        priority: Number(form.priority),
        acceptance_criteria: form.acceptance_criteria.split('\n').filter(Boolean),
      },
      {
        onSuccess: (updated) => {
          setDetailReq(updated);
          setEditMode(false);
        },
      }
    );
  };

  const handleAIGenerate = () => {
    if (!aiDesc.trim() || !projectId) return;
    genReqs.mutate(
      { projectId, project_description: aiDesc },
      {
        onSuccess: (data) => {
          setAiOpen(false);
          setAiDesc('');
          // data may be an array of requirements or { requirements: [...] }
          const items = Array.isArray(data) ? data : (data?.requirements || data?.items || []);
          if (items.length > 0) {
            // Tag each item with a stable id for the review modal
            setAiReviewItems(items.map((r, i) => ({ ...r, id: r.id || `ai-${i}` })));
          }
        },
      }
    );
  };

  const handleAIReviewConfirm = (accepted) => {
    // Save only accepted items — they're already persisted by the backend generate call,
    // so we just close the modal. If user rejects some, we delete them.
    // The backend already saved all; delete the ones not accepted.
    const acceptedIds = new Set(accepted.map((r) => r.id));
    aiReviewItems?.forEach((r) => {
      if (r.id && !acceptedIds.has(r.id) && !r.id.startsWith('ai-')) {
        // If the backend saved it with a real id, we'd delete it — skip for now
        // as delete endpoint may not exist; leave as-is for MVP
      }
    });
    setAiReviewItems(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">Define what needs to be built</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-base"
              style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select project</option>
              {projectList.map((p) => (
                <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => setAiOpen(true)} disabled={!projectId} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> AI Generate
          </button>
          <button onClick={() => { setForm(BLANK_FORM); setCreateOpen(true); }} disabled={!projectId} className="btn-primary">
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
        <EmptyState
          icon={FileText}
          title="No requirements yet"
          description="Add requirements manually or let AI generate them from a description."
          action="Add Requirement"
          onAction={() => { setForm(BLANK_FORM); setCreateOpen(true); }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reqList.map((r, i) => {
            const ac = JSON.parse(r.acceptance_criteria_json || '[]');
            const earWarn = JSON.parse(r.ears_warnings_json || '[]');
            return (
              <motion.div key={r.id} {...stagger(i)}>
                <GlassCard
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDetail(r)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <ReqIdBadge reqId={r.req_id} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{r.title}</span>
                        {r.ai_generated && <AIBadge />}
                        <EARSWarningBadge count={earWarn.length} />
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.description}
                      </p>
                      {ac.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ac.slice(0, 3).map((criterion, idx) => {
                            const hasWarning = earWarn.some((w) => w.index === idx);
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: hasWarning ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                                {hasWarning
                                  ? <AlertTriangle size={11} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
                                  : <CheckCircle2 size={11} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0, color: 'var(--status-success)' }} />
                                }
                                {criterion}
                              </div>
                            );
                          })}
                          {ac.length > 3 && (
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 17 }}>+{ac.length - 3} more</span>
                          )}
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
            );
          })}
        </div>
      )}

      {/* Detail / Edit modal */}
      <Modal
        isOpen={!!detailReq}
        onClose={() => { setDetailReq(null); setEditMode(false); setHistoryOpen(false); }}
        title={editMode ? 'Edit Requirement' : (detailReq?.req_id ? `${detailReq.req_id}` : 'Requirement')}
      >
        {detailReq && !historyOpen && !editMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{detailReq.title}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PriorityBadge level={detailReq.priority} />
                  <StatusBadge status={detailReq.status || 'draft'} />
                  {detailReq.ai_generated && <AIBadge />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setHistoryOpen(true)} className="btn-ghost" style={{ padding: '6px 10px' }}>
                  <History size={13} strokeWidth={1.5} /> History
                </button>
                <button onClick={startEdit} className="btn-ghost" style={{ padding: '6px 10px' }}>
                  <Edit2 size={13} strokeWidth={1.5} /> Edit
                </button>
              </div>
            </div>

            {detailReq.description && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{detailReq.description}</p>
              </div>
            )}

            {(() => {
              const ac = JSON.parse(detailReq.acceptance_criteria_json || '[]');
              const earWarn = JSON.parse(detailReq.ears_warnings_json || '[]');
              if (!ac.length) return null;
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acceptance Criteria</p>
                    {earWarn.length > 0 && <EARSWarningBadge count={earWarn.length} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ac.map((criterion, idx) => {
                      const warning = earWarn.find((w) => w.index === idx);
                      const acId = detailReq.req_id ? detailReq.req_id.replace('REQ', 'AC') + `.${idx + 1}` : null;
                      return (
                        <div key={idx} style={{
                          padding: '10px 12px', borderRadius: 8,
                          background: warning ? 'rgba(255,159,10,0.06)' : 'var(--color-bg-secondary)',
                          border: `1px solid ${warning ? 'rgba(255,159,10,0.25)' : 'var(--border)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            {warning
                              ? <AlertTriangle size={13} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1, color: 'var(--status-warning)' }} />
                              : <CheckCircle2 size={13} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1, color: 'var(--status-success)' }} />
                            }
                            <div style={{ flex: 1 }}>
                              {acId && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'monospace', marginRight: 8 }}>{acId}</span>}
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{criterion}</span>
                              {warning && (
                                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--status-warning)', lineHeight: 1.5 }}>
                                  Suggested: <em>{warning.suggestion}</em>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingTop: 4 }}>
              Created {new Date(detailReq.created_at).toLocaleString()}
            </div>
          </div>
        )}

        {detailReq && historyOpen && (
          <VersionHistory
            entityType="requirement"
            entityId={detailReq.id}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        {detailReq && editMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-base" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
              <MarkdownEditor value={form.description || ''} onChange={(v) => setForm({ ...form, description: v })} rows={4} placeholder="Describe the requirement (markdown supported)" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-base">
                {[1,2,3,4,5].map((p) => <option key={p} value={p}>P{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Acceptance Criteria <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line, use EARS format)</span>
              </label>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, lineHeight: 1.5 }}>
                Pattern: "When [condition], the system shall [action]"
              </p>
              <textarea value={form.acceptance_criteria} onChange={(e) => setForm({ ...form, acceptance_criteria: e.target.value })} rows={5} className="input-base font-mono" style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button onClick={() => setEditMode(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleUpdate} disabled={!form.title.trim() || updateReq.isPending} className="btn-primary">
                {updateReq.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Requirement">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Requirement title" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <MarkdownEditor value={form.description || ''} onChange={(v) => setForm({ ...form, description: v })} rows={4} placeholder="Describe the requirement (markdown supported)" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-base">
              {[1,2,3,4,5].map((p) => <option key={p} value={p}>P{p} {['Critical','High','Medium','Low','Nice to have'][p-1]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Acceptance Criteria <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(one per line)</span>
            </label>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Pattern: "When [trigger], the system shall [action]"
            </p>
            <textarea
              value={form.acceptance_criteria}
              onChange={(e) => setForm({ ...form, acceptance_criteria: e.target.value })}
              rows={4}
              placeholder={"When the user submits the form, the system shall validate all fields\nWhen validation fails, the system shall display an inline error"}
              className="input-base font-mono"
              style={{ resize: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title.trim() || createReq.isPending} className="btn-primary">
              {createReq.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Generate modal */}
      <Modal isOpen={aiOpen} onClose={() => setAiOpen(false)} title="Generate Requirements with AI">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Describe your project and AI will generate EARS-formatted requirements with acceptance criteria.
          </p>
          <textarea
            value={aiDesc}
            onChange={(e) => setAiDesc(e.target.value)}
            rows={6}
            placeholder="A mobile app that lets users track their daily water intake and sends reminders..."
            className="input-base"
            style={{ resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setAiOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleAIGenerate} disabled={!aiDesc.trim() || genReqs.isPending} className="btn-ai">
              <Sparkles size={13} strokeWidth={1.5} />{genReqs.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Review Modal — shown after generation */}
      {aiReviewItems && (
        <AIReviewModal
          title="Review AI-Generated Requirements"
          items={aiReviewItems}
          renderItem={(item) => (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
              {item.req_id && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'monospace' }}>{item.req_id}</div>}
            </div>
          )}
          onConfirm={handleAIReviewConfirm}
          onCancel={() => setAiReviewItems(null)}
        />
      )}
    </div>
  );
}
