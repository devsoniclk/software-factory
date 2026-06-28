import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Play, Trash2, ChevronDown, ExternalLink, Loader, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useProjects, useSimulatorRuns, useSimulatorScreens, useCreateSimulatorRun, useDeleteSimulatorRun } from '../api/hooks';
import { useQueryClient } from '@tanstack/react-query';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

const STATUS_ICON = {
  pending: <Clock size={13} style={{ color: '#8e8e93' }} />,
  running: <Loader size={13} style={{ color: '#ff9f0a', animation: 'spin 1s linear infinite' }} />,
  done:    <CheckCircle size={13} style={{ color: '#28cd41' }} />,
  error:   <AlertCircle size={13} style={{ color: '#ff3b30' }} />,
};

function ScreenCard({ screen }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
      {screen.screenshot_b64 ? (
        <img src={`data:image/png;base64,${screen.screenshot_b64}`} alt={screen.route} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
      ) : screen.placeholder_svg ? (
        <div style={{ width: '100%', height: 140 }} dangerouslySetInnerHTML={{ __html: screen.placeholder_svg }} />
      ) : (
        <div style={{ width: '100%', height: 140, background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Monitor size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screen.route}</div>
        {screen.title && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screen.title}</div>}
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{screen.selector_count} interactive elements</div>
      </div>
    </div>
  );
}

function RunCard({ run, projectId, i }) {
  const [expanded, setExpanded] = useState(false);
  const { data: screens } = useSimulatorScreens(expanded ? run.id : null);
  const deleteRun = useDeleteSimulatorRun(projectId);
  const qc = useQueryClient();

  // Auto-poll if running
  if (run.status === 'running' || run.status === 'pending') {
    setTimeout(() => qc.invalidateQueries({ queryKey: ['simulator-runs', projectId] }), 3000);
  }

  return (
    <motion.div {...stagger(i)}>
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {STATUS_ICON[run.status] || STATUS_ICON.pending}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{run.target_url}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {run.screen_count} screens · depth {run.max_depth}
                {run.completed_at && ` · ${new Date(run.completed_at).toLocaleString()}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {run.status === 'done' && (
              <button onClick={() => setExpanded(!expanded)} className="btn-ghost" style={{ fontSize: 12 }}>
                {expanded ? 'Hide' : 'View Map'}
              </button>
            )}
            <button onClick={() => deleteRun.mutate(run.id)} className="btn-ghost" style={{ fontSize: 12, color: '#ff3b30' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {expanded && screens?.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {screens.map(s => <ScreenCard key={s.id} screen={s} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {run.error_message && <div style={{ marginTop: 8, fontSize: 11, color: '#ff3b30' }}>{run.error_message}</div>}
      </GlassCard>
    </motion.div>
  );
}

export default function SimulatorPage() {
  const [projectId, setProjectId] = useState('');
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [form, setForm] = useState({ target_url: 'http://localhost:3000', max_depth: 2 });

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: runs, isLoading } = useSimulatorRuns(projectId);
  const runList = Array.isArray(runs) ? runs : [];
  const createRun = useCreateSimulatorRun(projectId);

  const handleCreate = () => {
    if (!form.target_url) return;
    createRun.mutate(form, { onSuccess: () => setNewRunOpen(false) });
  };

  return (
    <div className="page-container">
      <style>{'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulator</h1>
          <p className="page-subtitle">Crawl your live app and build a spatial map of screens</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              <option value="">Select project…</option>
              {projectList.map(p => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => setNewRunOpen(true)} disabled={!projectId} className="btn-primary">
            <Play size={13} /> New Crawl
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={Monitor} title="Select a project" description="Choose a project to run the app simulator." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}</div>
      ) : runList.length === 0 ? (
        <EmptyState icon={Monitor} title="No crawl runs" description="Point the simulator at your running app to build a spatial map of all screens." action="New Crawl" onAction={() => setNewRunOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runList.map((r, i) => <RunCard key={r.id} run={r} projectId={projectId} i={i} />)}
        </div>
      )}

      <Modal isOpen={newRunOpen} onClose={() => setNewRunOpen(false)} title="New Simulator Run">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Target URL</label>
            <input value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} placeholder="http://localhost:3000" className="input-base" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Max Depth <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(1–3)</span></label>
            <input type="number" min={1} max={3} value={form.max_depth} onChange={e => setForm({...form, max_depth: parseInt(e.target.value)})} className="input-base" style={{ width: 80 }} />
          </div>
          <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            The simulator will crawl your app starting from the target URL, discover all linked pages, and take screenshots if Playwright is installed. Otherwise it maps routes via link extraction.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setNewRunOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!form.target_url || createRun.isPending} className="btn-primary">
              {createRun.isPending ? 'Starting…' : 'Start Crawl'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
