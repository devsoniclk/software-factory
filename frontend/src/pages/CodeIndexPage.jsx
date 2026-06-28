import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, RefreshCw, Search, Code2, CheckCircle, AlertCircle, Loader, Plus, Trash2, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useProjects, useRepositories, useCreateRepository, useDeleteRepository, useTriggerIndex, useRepoStatus, useCodeSearch } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04 } });

function StatusPill({ status }) {
  const map = {
    idle:     { color: 'var(--text-tertiary)', bg: 'var(--color-bg-secondary)', label: 'Idle' },
    indexing: { color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', label: 'Indexing…' },
    ready:    { color: '#28cd41', bg: 'rgba(40,205,65,0.1)', label: 'Ready' },
    error:    { color: '#ff3b30', bg: 'rgba(255,59,48,0.1)', label: 'Error' },
  };
  const m = map[status] || map.idle;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: m.bg, color: m.color }}>
      {status === 'indexing' && <Loader size={10} style={{ display: 'inline', marginRight: 4, animation: 'spin 1s linear infinite' }} />}
      {m.label}
    </span>
  );
}

function RepoCard({ repo, onIndex, onDelete, i }) {
  const { data: live } = useRepoStatus(repo.id);
  const r = live || repo;
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchResults } = useCodeSearch(repo.id, searchQ);

  return (
    <motion.div {...stagger(i)}>
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderOpen size={16} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: 2 }}>{r.local_path}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill status={r.status} />
            {r.symbol_count > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.symbol_count.toLocaleString()} symbols</span>
            )}
            <button onClick={() => setShowSearch(!showSearch)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
              <Search size={12} strokeWidth={1.5} />
            </button>
            <button onClick={() => onIndex(r.id)} disabled={r.status === 'indexing'} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
              <RefreshCw size={12} strokeWidth={1.5} style={{ animation: r.status === 'indexing' ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => onDelete(r.id)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: '#ff3b30' }}>
              <Trash2 size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {r.last_indexed_at && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: showSearch ? 12 : 0 }}>
            Last indexed: {new Date(r.last_indexed_at).toLocaleString()}
            {r.error_message && <span style={{ color: '#ff3b30', marginLeft: 8 }}>⚠ {r.error_message.slice(0, 80)}</span>}
          </div>
        )}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <input
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search symbols… (class name, function, etc.)"
                className="input-base"
                style={{ marginBottom: 10 }}
              />
              {searchResults?.results?.map((sym, j) => (
                <div key={sym.id} style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Code2 size={12} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sym.name}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 600 }}>{sym.symbol_type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>score: {sym.score}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{sym.file_path}:{sym.line_start}</div>
                  {sym.docstring && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{sym.docstring.slice(0, 150)}</div>}
                </div>
              ))}
              {searchQ.length > 1 && (!searchResults?.results?.length) && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 12px' }}>No symbols match "{searchQ}"</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export default function CodeIndexPage() {
  const [projectId, setProjectId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', local_path: '', branch: 'main' });

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: repos, isLoading } = useRepositories(projectId);
  const repoList = Array.isArray(repos) ? repos : [];
  const createRepo = useCreateRepository(projectId);
  const deleteRepo = useDeleteRepository(projectId);
  const triggerIndex = useTriggerIndex();

  const handleAdd = () => {
    if (!form.name || !form.local_path) return;
    createRepo.mutate(form, {
      onSuccess: () => { setAddOpen(false); setForm({ name: '', local_path: '', branch: 'main' }); }
    });
  };

  return (
    <div className="page-container">
      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div className="page-header">
        <div>
          <h1 className="page-title">Code Index</h1>
          <p className="page-subtitle">Connect repositories and search symbols</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none' }}>
              <option value="">Select project…</option>
              {projectList.map(p => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          <button onClick={() => setAddOpen(true)} disabled={!projectId} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Add Repo
          </button>
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={Code2} title="Select a project" description="Choose a project to manage its connected repositories." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : repoList.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No repositories" description="Connect a local repository to enable code-grounded features." action="Add Repository" onAction={() => setAddOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {repoList.map((r, i) => (
            <RepoCard
              key={r.id} repo={r} i={i}
              onIndex={id => triggerIndex.mutate(id)}
              onDelete={id => deleteRepo.mutate(id)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Repository">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="My App" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Local Path</label>
            <input value={form.local_path} onChange={e => setForm({...form, local_path: e.target.value})} placeholder="/Users/you/projects/my-app" className="input-base" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Branch</label>
            <input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} placeholder="main" className="input-base" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setAddOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleAdd} disabled={!form.name || !form.local_path || createRepo.isPending} className="btn-primary">
              {createRepo.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
