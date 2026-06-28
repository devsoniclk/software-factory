import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Sparkles, Play, Trash2, Copy, Check, ChevronDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { AIBadge } from '../components/Badge';
import { useProjects, useBlueprints, useQAFlows, useGenerateQAFlow, useRunQAFlow, useDeleteQAFlow } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

const STATUS_STYLES = {
  draft:   { color: 'var(--text-tertiary)', label: 'Draft' },
  ready:   { color: 'var(--accent)', label: 'Ready' },
  running: { color: '#ff9f0a', label: 'Running…' },
  passed:  { color: '#28cd41', label: 'Passed' },
  failed:  { color: '#ff3b30', label: 'Failed' },
};

function FlowCard({ flow, projectId, i }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const runFlow = useRunQAFlow();
  const deleteFlow = useDeleteQAFlow(projectId);
  const sty = STATUS_STYLES[flow.status] || STATUS_STYLES.draft;

  const copy = () => {
    navigator.clipboard.writeText(flow.test_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div {...stagger(i)}>
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{flow.name}</span>
            {flow.ai_generated && <AIBadge />}
            <span style={{ fontSize: 11, fontWeight: 600, color: sty.color, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: `${sty.color}18` }}>{sty.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {flow.test_code && (
              <button onClick={() => setExpanded(!expanded)} className="btn-ghost" style={{ fontSize: 12 }}>{expanded ? 'Hide' : 'View Code'}</button>
            )}
            <button onClick={() => runFlow.mutate(flow.id)} disabled={!flow.test_code || flow.status === 'running'} className="btn-ghost" style={{ fontSize: 12, color: 'var(--accent)' }}>
              <Play size={12} /> Run
            </button>
            <button onClick={() => deleteFlow.mutate(flow.id)} className="btn-ghost" style={{ fontSize: 12, color: '#ff3b30' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {flow.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{flow.description}</p>}
        {(flow.last_run_passed > 0 || flow.last_run_failed > 0) && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#28cd41', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> {flow.last_run_passed} passed</span>
            <span style={{ fontSize: 11, color: '#ff3b30', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={11} /> {flow.last_run_failed} failed</span>
            {flow.last_run_at && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last run: {new Date(flow.last_run_at).toLocaleString()}</span>}
          </div>
        )}
        <AnimatePresence>
          {expanded && flow.test_code && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', marginTop: 8 }}>
                <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', fontSize: 11, borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--border)', cursor: 'pointer', color: copied ? '#28cd41' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
                <pre style={{ padding: '12px 14px', fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', maxHeight: 320, color: 'var(--text-secondary)', margin: 0 }}>{flow.test_code}</pre>
              </div>
              {flow.last_run_output && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: flow.status === 'passed' ? 'rgba(40,205,65,0.06)' : 'rgba(255,59,48,0.06)', border: `1px solid ${flow.status === 'passed' ? 'rgba(40,205,65,0.2)' : 'rgba(255,59,48,0.2)'}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Last Run Output</div>
                  <pre style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', maxHeight: 200, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>{flow.last_run_output.slice(0, 2000)}</pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export default function QAFlowsPage() {
  const [projectId, setProjectId] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [blueprintId, setBlueprintId] = useState('');
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: blueprints } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || [];
  const { data: flows, isLoading } = useQAFlows(projectId);
  const flowList = Array.isArray(flows) ? flows : [];
  const generateFlow = useGenerateQAFlow(projectId);

  const handleGenerate = () => {
    if (!blueprintId) return;
    generateFlow.mutate({ blueprint_id: blueprintId, target_url: targetUrl }, {
      onSuccess: () => { setGenOpen(false); setBlueprintId(''); }
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">QA Flows</h1>
          <p className="page-subtitle">Generated Playwright test suites from acceptance criteria</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              <option value="">Select project…</option>
              {projectList.map(p => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => setGenOpen(true)} disabled={!projectId} className="btn-ai">
            <Sparkles size={13} /> Generate
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={FlaskConical} title="Select a project" description="Choose a project to manage its QA flows." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}</div>
      ) : flowList.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No QA flows yet" description="Generate Playwright test suites from blueprint acceptance criteria with AI." action="Generate Flow" onAction={() => setGenOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flowList.map((f, i) => <FlowCard key={f.id} flow={f} projectId={projectId} i={i} />)}
        </div>
      )}

      <Modal isOpen={genOpen} onClose={() => setGenOpen(false)} title="Generate QA Flow">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Blueprint</label>
            <div style={{ position: 'relative' }}>
              <select value={blueprintId} onChange={e => setBlueprintId(e.target.value)} className="input-base" style={{ appearance: 'none', paddingRight: 32 }}>
                <option value="">Select blueprint…</option>
                {bpList.map(b => <option key={b.id || b.blueprint_id} value={b.id || b.blueprint_id}>{b.name}</option>)}
              </select>
              <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Target URL</label>
            <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="http://localhost:3000" className="input-base" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: 10, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            AI will generate a Playwright TypeScript test file from all acceptance criteria in the selected blueprint's requirements. Run it with <code>npx playwright test</code>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setGenOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleGenerate} disabled={!blueprintId || generateFlow.isPending} className="btn-ai">
              {generateFlow.isPending ? <><Sparkles size={13} /> Generating…</> : <><Sparkles size={13} /> Generate</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
