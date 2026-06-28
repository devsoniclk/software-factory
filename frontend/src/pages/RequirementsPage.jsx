import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, FileText, CheckCircle2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, X, History, Edit2, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { PriorityBadge, StatusBadge, AIBadge } from '../components/Badge';
import {
  useProjects, useRequirements, useCreateRequirement, useUpdateRequirement,
  useUpdateRequirementStatus, useGenerateRequirements, useVersionHistory, useVersionContent,
} from '../api/hooks';

const PAGE_SIZE = 20;

// Valid status transitions
const REQ_TRANSITIONS = {
  draft:       ['review'],
  review:      ['approved', 'draft'],
  approved:    ['implemented'],
  implemented: [],
};

const stagger = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] },
});

function EARSWarningBadge({ warnings, count }) {
  const [showList, setShowList] = useState(false);
  if (!count) return null;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setShowList((v) => !v); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '1px 6px', borderRadius: 'var(--radius-full)',
        background: 'rgba(255, 159, 10, 0.12)', border: '1px solid rgba(255, 159, 10, 0.3)',
        fontSize: 11, fontWeight: 500, color: 'var(--status-warning)',
        cursor: 'pointer', position: 'relative',
      }}
    >
      <AlertTriangle size={9} strokeWidth={2} />
      {count} EARS warning{count !== 1 ? 's' : ''}
      {showList && Array.isArray(warnings) && warnings.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
            background: 'var(--color-bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: '8px 10px',
            minWidth: 240, maxWidth: 320,
          }}
        >
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, paddingBottom: 4 }}>
              {typeof w === 'string' ? w : w.message || w.suggestion || JSON.stringify(w)}
            </div>
          ))}
        </div>
      )}
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
  const { data: versionContent } = useVersionContent(entityType, entityId, selectedVersion);

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
            <div style={{
              padding: 14, borderRadius: 8,
              background: 'var(--color-bg-secondary)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Version {selectedVersion} Content
              </p>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pagination({ page, setPage, count }) {
  const hasPrev = page > 0;
  const hasNext = count === PAGE_SIZE; // if we got a full page, there may be more
  if (!hasPrev && !hasNext) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 16 }}>
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={!hasPrev}
        className="btn-ghost"
        style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ChevronLeft size={13} strokeWidth={1.5} /> Previous
      </button>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Page {page + 1}</span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={!hasNext}
        className="btn-ghost"
        style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        Next <ChevronRight size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
}

const BLANK_FORM = { title: '', description: '', priority: 3, acceptance_criteria: '' };

export default function RequirementsPage() {
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();
  const [localProjectId, setLocalProjectId] = useState('');
  const projectId = urlProjectId || localProjectId;

  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailReq, setDetailReq] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [aiDesc, setAiDesc] = useState('');
  const [statusError, setStatusError] = useState(null);

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: requirements, isLoading } = useRequirements(projectId, page);
  const reqList = Array.isArray(requirements) ? requirements : requirements?.items || requirements?.requirements || [];
  const createReq = useCreateRequirement(projectId);
  const updateReq = useUpdateRequirement(projectId);
  const updateStatus = useUpdateRequirementStatus(projectId);
  const genReqs = useGenerateRequirements();

  const openDetail = (r) => {
    setDetailReq(r);
    setEditMode(false);
    setHistoryOpen(false);
    setStatusError(null);
  };

  const startEdit = () => {
    const ac = Array.isArray(detailReq.acceptance_criteria)
      ? detailReq.acceptance_criteria
      : (detailReq.acceptance_criteria_json ? JSON.parse(detailReq.acceptance_criteria_json) : []);
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

  const handleStatusChange = (newStatus) => {
    if (!detailReq) return;
    setStatusError(null);
    updateStatus.mutate(
      { reqId: detailReq.id, status: newStatus },
      {
        onSuccess: (updated) => setDetailReq(updated),
        onError: (err) => {
          const body = err.response?.data;
          if (body?.message) {
            const allowed = body.allowed?.join(', ') || 'none';
            setStatusError(`Cannot change status: ${body.message}. Allowed next statuses: ${allowed}`);
          } else {
            setStatusError('Status update failed.');
          }
        },
      }
    );
  };

  const handleAIGenerate = () => {
    if (!aiDesc.trim() || !projectId) return;
    genReqs.mutate(
      { projectId, project_description: aiDesc },
      { onSuccess: () => { setAiOpen(false); setAiDesc(''); } }
    );
  };

  const handleProjectChange = (pid) => {
    setLocalProjectId(pid);
    setPage(0);
    if (pid) navigate(`/project/${pid}/requirements`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">Define what needs to be built</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!urlProjectId && (
            <div style={{ position: 'relative' }}>
              <select
                value={localProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
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
          )}
          <button
            onClick={() => setAiOpen(true)}
            disabled={!projectId || genReqs.isPending}
            className="btn-ai"
          >
            <Sparkles size={13} strokeWidth={1.5} />
            {genReqs.isPending ? 'Generating…' : 'AI Generate'}
          </button>
          <button onClick={() => { setForm(BLANK_FORM); setCreateOpen(true); }} disabled={!projectId} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Add
          </button>
        </div>
      </div>

      {genReqs.isPending && (
        <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(0,82,255,0.06)', border: '1px solid rgba(0,82,255,0.15)', fontSize: 13, color: 'var(--accent)' }}>
          Generating requirements… this may take 20–30 seconds
        </div>
      )}

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
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reqList.map((r, i) => {
              // Support both new typed fields and old JSON strings
              const ac = Array.isArray(r.acceptance_criteria)
                ? r.acceptance_criteria
                : (r.acceptance_criteria_json ? JSON.parse(r.acceptance_criteria_json) : []);
              const earWarn = Array.isArray(r.ears_warnings)
                ? r.ears_warnings
                : (r.ears_warnings_json ? JSON.parse(r.ears_warnings_json) : []);
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
                          {earWarn.length > 0 && (
                            <EARSWarningBadge count={earWarn.length} warnings={earWarn} />
                          )}
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
          <Pagination page={page} setPage={setPage} count={reqList.length} />
        </>
      )}

      {/* Detail / Edit modal */}
      <Modal
        isOpen={!!detailReq}
        onClose={() => { setDetailReq(null); setEditMode(false); setHistoryOpen(false); setStatusError(null); }}
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

            {/* Status transitions */}
            {(() => {
              const current = (detailReq.status || 'draft').toLowerCase();
              const allowed = REQ_TRANSITIONS[current] || [];
              if (!allowed.length) return null;
              return (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Change Status</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {allowed.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={updateStatus.isPending}
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '4px 10px', textTransform: 'capitalize' }}
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                  {statusError && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(196,0,10,0.06)', border: '1px solid rgba(196,0,10,0.2)', fontSize: 12, color: '#C4000A' }}>
                      {statusError}
                    </div>
                  )}
                </div>
              );
            })()}

            {detailReq.description && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{detailReq.description}</p>
              </div>
            )}

            {(() => {
              const ac = Array.isArray(detailReq.acceptance_criteria)
                ? detailReq.acceptance_criteria
                : (detailReq.acceptance_criteria_json ? JSON.parse(detailReq.acceptance_criteria_json) : []);
              const earWarn = Array.isArray(detailReq.ears_warnings)
                ? detailReq.ears_warnings
                : (detailReq.ears_warnings_json ? JSON.parse(detailReq.ears_warnings_json) : []);
              if (!ac.length) return null;
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acceptance Criteria</p>
                    {earWarn.length > 0 && <EARSWarningBadge count={earWarn.length} warnings={earWarn} />}
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
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-base" style={{ resize: 'none' }} />
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
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the requirement" className="input-base" style={{ resize: 'none' }} />
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
    </div>
  );
}
