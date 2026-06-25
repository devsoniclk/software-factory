import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, CheckCircle2, FileText, GitBranch, ClipboardList, FlaskConical, ChevronDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useProjects } from '../api/hooks';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

function useProjectAnalytics(projectId) {
  return useQuery({
    queryKey: ['analytics', projectId],
    queryFn: () => client.get(`/analytics/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

const stagger = (i) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.05 } });

function HealthRing({ score }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 110, height: 110 }}>
      <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{pct}</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>Health</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)', i = 0 }) {
  return (
    <motion.div {...stagger(i)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{value ?? 0}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} strokeWidth={1.6} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

function BarRow({ label, value, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  draft: '#94a3b8', review: '#f59e0b', approved: '#22c55e', implemented: '#3b82f6',
  pending: '#f59e0b', in_progress: '#3b82f6', completed: '#22c55e', blocked: '#ef4444',
  passed: '#22c55e', failed: '#ef4444', skipped: '#94a3b8',
};

export default function AnalyticsPage() {
  const [projectId, setProjectId] = useState('');
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data, isLoading } = useProjectAnalytics(projectId);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Project health metrics and progress overview</p>
        </div>
        <div style={{ position: 'relative' }}>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            style={{ padding: '8px 32px 8px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">Select project…</option>
            {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
      </div>

      {!projectId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-tertiary)', fontSize: 13 }}>
          Select a project to view analytics
        </div>
      )}

      {projectId && isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {data && (
        <>
          {/* Health + top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>
            <motion.div {...stagger(0)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <HealthRing score={data.health_score} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {data.health_score >= 70 ? '✅ Healthy' : data.health_score >= 40 ? '⚠️ At Risk' : '🔴 Needs Work'}
              </div>
            </motion.div>
            <StatCard i={1} icon={FileText}     label="Requirements"  value={data.requirements.total}   sub={`${data.requirements.ai_generated} AI-generated`}       color="#3b82f6" />
            <StatCard i={2} icon={GitBranch}    label="Blueprints"    value={data.blueprints.total}                                                                     color="#8b5cf6" />
            <StatCard i={3} icon={ClipboardList} label="Work Orders"  value={data.work_orders.total}    sub={`${data.work_orders.completion_pct}% complete`}           color="#f59e0b" />
            <StatCard i={4} icon={FlaskConical}  label="Tests"        value={data.tests.total}           sub={`${data.tests.pass_rate}% pass rate`}                    color="#10b981" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Requirements breakdown */}
            <motion.div {...stagger(5)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} color="#3b82f6" /> Requirements by Status
              </div>
              {Object.entries(data.requirements.by_status).map(([s, v]) => (
                <BarRow key={s} label={s} value={v} max={data.requirements.total} color={STATUS_COLORS[s] || 'var(--accent)'} />
              ))}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                Avg {data.requirements.avg_ac_per_req} acceptance criteria / req
              </div>
            </motion.div>

            {/* Work orders breakdown */}
            <motion.div {...stagger(6)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClipboardList size={13} color="#f59e0b" /> Work Orders by Status
              </div>
              {Object.keys(data.work_orders.by_status).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No work orders yet</div>
              ) : Object.entries(data.work_orders.by_status).map(([s, v]) => (
                <BarRow key={s} label={s} value={v} max={data.work_orders.total} color={STATUS_COLORS[s] || 'var(--accent)'} />
              ))}
              {data.work_orders.total > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Completion</div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${data.work_orders.completion_pct}%` }} transition={{ duration: 0.8 }}
                      style={{ height: '100%', background: '#22c55e', borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginTop: 4 }}>{data.work_orders.completion_pct}%</div>
                </div>
              )}
            </motion.div>

            {/* Tests breakdown */}
            <motion.div {...stagger(7)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={13} color="#10b981" /> Test Results
              </div>
              {Object.keys(data.tests.by_status).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No tests yet</div>
              ) : Object.entries(data.tests.by_status).map(([s, v]) => (
                <BarRow key={s} label={s} value={v} max={data.tests.total} color={STATUS_COLORS[s] || 'var(--accent)'} />
              ))}
              {data.tests.total > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{data.tests.pass_rate}%</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>pass rate</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Work orders by blueprint */}
          {Object.keys(data.blueprints.work_orders_by_blueprint).length > 0 && (
            <motion.div {...stagger(8)} style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={13} color="#8b5cf6" /> Work Orders per Blueprint
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(data.blueprints.work_orders_by_blueprint).map(([name, count]) => {
                  const max = Math.max(...Object.values(data.blueprints.work_orders_by_blueprint));
                  return <BarRow key={name} label={name} value={count} max={max} color="#8b5cf6" />;
                })}
              </div>
            </motion.div>
          )}

          {/* Activity summary */}
          {data.recent_activity.total_events > 0 && (
            <motion.div {...stagger(9)} style={{ marginTop: 16, background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={13} color="var(--accent)" /> Recent Activity ({data.recent_activity.total_events} events)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(data.recent_activity.by_action).map(([action, count]) => (
                  <span key={action} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{count}</strong> {action}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
