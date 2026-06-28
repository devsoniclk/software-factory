import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { useProjects, useProjectAnalytics } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] } });

function healthColor(score) {
  if (score >= 70) return '#28cd41';
  if (score >= 40) return '#ff9f0a';
  return '#ff3b30';
}

function HealthRing({ score }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = healthColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={54} cy={54} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={54} y={54} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={color}>{score}</text>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health Score</span>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <GlassCard style={{ flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </GlassCard>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 90, flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color || 'var(--accent)', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 24, textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 10, borderRadius: 5, background: 'var(--color-bg-secondary)', overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 5, background: color || 'var(--accent)', transition: 'width 0.5s ease' }} />
    </div>
  );
}

const STATUS_COLORS = {
  draft: '#8e8e93',
  approved: '#28cd41',
  pending: '#ff9f0a',
  in_progress: 'var(--accent)',
  completed: '#28cd41',
  blocked: '#ff3b30',
  passed: '#28cd41',
  failed: '#ff3b30',
};

const PRIORITY_COLORS = { '1': '#ff3b30', '2': '#ff9f0a', '3': '#28cd41' };
const PRIORITY_LABELS = { '1': 'High', '2': 'Medium', '3': 'Low' };

export default function AnalyticsPage() {
  const [projectId, setProjectId] = useState('');
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: analytics, isLoading } = useProjectAnalytics(projectId);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Project health and delivery metrics</p>
        </div>
        <div style={{ position: 'relative' }}>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
            <option value="">Select project…</option>
            {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
          </select>
          <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
      </div>

      {!projectId ? (
        <EmptyState icon={BarChart2} title="Select a project" description="Choose a project to view analytics." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : !analytics ? (
        <EmptyState icon={BarChart2} title="No data yet" description="Start adding requirements, blueprints, and work orders to generate analytics." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Health + stat row */}
          <motion.div {...stagger(0)} style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px' }}>
              <HealthRing score={analytics.health_score ?? 0} />
            </GlassCard>
            <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
              <StatCard label="Requirements" value={analytics.requirements?.total ?? 0} sub={`${analytics.requirements?.ai_generated ?? 0} AI-generated`} />
              <StatCard label="Blueprints" value={analytics.blueprints?.total ?? 0} />
              <StatCard label="Work Orders" value={analytics.work_orders?.total ?? 0} sub={`${analytics.work_orders?.completion_pct?.toFixed(0) ?? 0}% done`} />
              <StatCard label="Tests" value={analytics.tests?.total ?? 0} sub={`${analytics.tests?.pass_rate?.toFixed(0) ?? 0}% pass`} />
            </div>
          </motion.div>

          {/* Requirements breakdown */}
          <motion.div {...stagger(1)}>
            <GlassCard>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Requirements</p>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>By Status</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(analytics.requirements?.by_status || {}).map(([k, v]) => (
                      <BarRow key={k} label={k} value={v} total={analytics.requirements?.total || 1} color={STATUS_COLORS[k]} />
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>By Priority</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(analytics.requirements?.by_priority || {}).map(([k, v]) => (
                      <BarRow key={k} label={PRIORITY_LABELS[k] || `P${k}`} value={v} total={analytics.requirements?.total || 1} color={PRIORITY_COLORS[k]} />
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>Acceptance Criteria</p>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{analytics.requirements?.total_acceptance_criteria ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>avg {analytics.requirements?.avg_ac_per_req?.toFixed(1) ?? '0'} per req</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Work orders */}
          <motion.div {...stagger(2)}>
            <GlassCard>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Work Orders</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <ProgressBar pct={analytics.work_orders?.completion_pct ?? 0} color="#28cd41" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{analytics.work_orders?.completion_pct?.toFixed(0) ?? 0}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {Object.entries(analytics.work_orders?.by_status || {}).map(([k, v]) => (
                  <BarRow key={k} label={k.replace('_', ' ')} value={v} total={analytics.work_orders?.total || 1} color={STATUS_COLORS[k]} />
                ))}
              </div>
              {Object.keys(analytics.blueprints?.work_orders_by_blueprint || {}).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>By Blueprint</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {Object.entries(analytics.blueprints?.work_orders_by_blueprint || {}).map(([bp, v]) => (
                      <BarRow key={bp} label={bp} value={v} total={analytics.work_orders?.total || 1} />
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Tests */}
          <motion.div {...stagger(3)}>
            <GlassCard>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Tests</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <ProgressBar pct={analytics.tests?.pass_rate ?? 0} color="#28cd41" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{analytics.tests?.pass_rate?.toFixed(0) ?? 0}% pass rate</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {Object.entries(analytics.tests?.by_status || {}).map(([k, v]) => (
                  <BarRow key={k} label={k} value={v} total={analytics.tests?.total || 1} color={STATUS_COLORS[k]} />
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent activity */}
          <motion.div {...stagger(4)}>
            <GlassCard>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Recent Activity</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{analytics.recent_activity?.total_events ?? 0} events</span>
                <span style={{ color: 'var(--border)' }}>·</span>
                {Object.entries(analytics.recent_activity?.by_action || {}).map(([action, count]) => (
                  <span key={action} style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--accent-bg)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                    {action} · {count}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>

        </div>
      )}
    </div>
  );
}
