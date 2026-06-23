import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowUpRight, CheckCircle2, GitBranch, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import { useProjects, useCreateProject, useRequirements, useBlueprints, useWorkOrders, useTestCases, useFeedback } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] } });

const STATUS_STYLE = {
  pending:     { bg: 'rgba(255,159,10,0.10)',  color: '#B97000', border: 'rgba(255,159,10,0.22)'  },
  in_progress: { bg: 'rgba(0,82,255,0.08)',    color: '#0042CC', border: 'rgba(0,82,255,0.18)'   },
  in_review:   { bg: 'rgba(139,92,246,0.09)',  color: '#6D28D9', border: 'rgba(139,92,246,0.20)' },
  completed:   { bg: 'rgba(40,205,65,0.08)',   color: '#15803D', border: 'rgba(40,205,65,0.20)'  },
  done:        { bg: 'rgba(40,205,65,0.08)',   color: '#15803D', border: 'rgba(40,205,65,0.20)'  },
  active:      { bg: 'rgba(40,205,65,0.08)',   color: '#15803D', border: 'rgba(40,205,65,0.20)'  },
  draft:       { bg: 'rgba(0,0,0,0.05)',       color: '#555',    border: 'rgba(0,0,0,0.10)'      },
};

function StatusPill({ status }) {
  const s = (status || 'draft').toLowerCase().replace(/ /g, '_');
  const style = STATUS_STYLE[s] || STATUS_STYLE.draft;
  const label = (status || 'Draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span style={{
      padding: '2px 9px', fontSize: 11, fontWeight: 500, borderRadius: 999,
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
      whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>{label}</span>
  );
}

function StatCard({ label, value, sub, to, delay }) {
  const navigate = useNavigate();
  return (
    <motion.div {...stagger(delay)}
      onClick={() => navigate(to)}
      style={{
        background: 'var(--color-bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 22px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--border-emphasized)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <ArrowUpRight size={13} strokeWidth={1.5} style={{ position: 'absolute', top: 14, right: 14, color: 'var(--text-tertiary)' }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1 }}>{value ?? 0}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{sub}</div>}
    </motion.div>
  );
}

export default function Dashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];

  // Grab counts for the first project (or aggregate if multiple)
  const firstProject = projectList[0];
  const pid = firstProject?.id || firstProject?.project_id;
  const { data: reqs }       = useRequirements(pid);
  const { data: blueprints } = useBlueprints(pid);
  const { data: feedback }   = useFeedback(pid);

  const reqList  = Array.isArray(reqs)       ? reqs       : reqs?.requirements       || reqs?.items       || [];
  const bpList   = Array.isArray(blueprints)  ? blueprints  : blueprints?.blueprints  || blueprints?.items  || [];
  const fbList   = Array.isArray(feedback)    ? feedback    : feedback?.feedback      || feedback?.items    || [];

  // Work orders: flatten across blueprints (just use first bp for now)
  const firstBp = bpList[0];
  const bpid = firstBp?.id || firstBp?.blueprint_id;
  const { data: workOrders } = useWorkOrders(bpid);
  const woList = Array.isArray(workOrders) ? workOrders : workOrders?.work_orders || workOrders?.items || [];
  const pendingWo = woList.filter((w) => w.status !== 'completed' && w.status !== 'done');

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate({ name, description: desc }, {
      onSuccess: () => { setCreateOpen(false); setName(''); setDesc(''); }
    });
  };

  return (
    <div style={{ padding: 'var(--page-padding)', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <motion.div {...stagger(0)}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
            {firstProject?.name || 'Software Factory'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Track your progress across all modules
          </p>
        </motion.div>
        <motion.div {...stagger(1)}>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> New Project
          </button>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Requirements" value={reqList.length || 0}  sub="Feature nodes"       to="/requirements" delay={2} />
        <StatCard label="Blueprints"   value={bpList.length || 0}   sub="Blueprints created"  to="/blueprints"   delay={3} />
        <StatCard label="Work Orders"  value={`${woList.filter(w=>w.status==='completed'||w.status==='done').length}/${woList.length}`} sub="Completed" to="/work-orders" delay={4} />
        <StatCard label="Feedback"     value={fbList.length || 0}   sub="Feedback items"      to="/feedback"     delay={5} />
        <StatCard label="Tests"        value={0}                    sub="Test cases"           to="/tests"        delay={6} />
      </div>

      {/* Projects / Codebase card */}
      {projectList.length > 0 && (
        <motion.div {...stagger(7)} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projectList.map((p, i) => (
              <Link
                key={p.id || p.project_id}
                to={`/requirements?project=${p.id || p.project_id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'var(--color-bg)', border: '1px solid var(--border)',
                  borderRadius: 12, textDecoration: 'none',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  gap: 12,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-emphasized)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GitBranch size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                  {p.description && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.description}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.created_at && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  )}
                  <StatusPill status="active" />
                  <ArrowUpRight size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending work orders */}
      {pendingWo.length > 0 && (
        <motion.div {...stagger(8)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Pending Work Orders</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Active tasks that need attention</div>
            </div>
            <Link to="/work-orders" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View all</Link>
          </div>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {pendingWo.slice(0, 5).map((wo, i) => (
              <div
                key={wo.id || wo.work_order_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 18px',
                  borderBottom: i < Math.min(pendingWo.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</div>
                  {wo.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.description}</div>
                  )}
                </div>
                <StatusPill status={wo.status || 'pending'} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state when no projects */}
      {!projectsLoading && projectList.length === 0 && (
        <motion.div {...stagger(2)} style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={20} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Create your first project to get started.</div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2} /> Create Project
          </button>
        </motion.div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Project">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} placeholder="My Project" className="input-base" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What are you building?" className="input-base" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || createProject.isPending} className="btn-primary">
              {createProject.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
