import { useParams } from 'react-router-dom';
import { useProjectReport } from '../api/hooks';
import GlassCard from '../components/GlassCard';
import { BarChart2 } from 'lucide-react';

export default function ReportingPage() {
  const { projectId } = useParams();
  const { data: report, isLoading } = useProjectReport(projectId);

  const metrics = report?.metrics || {};
  const STATS = [
    { label: 'Requirements', value: metrics.requirements_total || 0, sub: `${metrics.requirements_approved || 0} approved` },
    { label: 'Blueprints', value: metrics.blueprints_total || 0 },
    { label: 'Work Orders', value: metrics.work_orders_total || 0, sub: `${metrics.work_orders_done || 0} done` },
    { label: 'Tests', value: metrics.tests_total || 0, sub: `${metrics.tests_passed || 0} passed` },
    { label: 'Feedback', value: metrics.feedback_total || 0 },
    { label: 'Drift Alerts', value: metrics.drift_open || 0, sub: 'open' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporting</h1>
          <p className="page-subtitle">Project metrics snapshot and health overview</p>
        </div>
      </div>
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {STATS.map(s => (
            <GlassCard key={s.label} style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.sub}</div>}
            </GlassCard>
          ))}
        </div>
      )}
      {report?.generated_at && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 24 }}>Generated at {report.generated_at.slice(0, 16)}</p>}
    </div>
  );
}
