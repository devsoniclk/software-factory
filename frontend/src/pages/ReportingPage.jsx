import { useParams } from 'react-router-dom';
import { useProjectReport } from '../api/hooks';
import GlassCard from '../components/GlassCard';
import { BarChart2 } from 'lucide-react';

export default function ReportingPage() {
  const { projectId } = useParams();
  const { data: report, isLoading } = useProjectReport(projectId);

  // Backend returns: { requirements:{total}, blueprints:{total}, work_orders:{total,by_status},
  //                    tests:{total,passed}, feedback:{total}, drift_alerts:{open}, notifications:{unread} }
  const r = report || {};
  const STATS = [
    { label: 'Requirements', value: r.requirements?.total ?? 0 },
    { label: 'Blueprints',   value: r.blueprints?.total ?? 0 },
    { label: 'Work Orders',  value: r.work_orders?.total ?? 0,
      sub: Object.entries(r.work_orders?.by_status || {}).map(([s,n]) => `${n} ${s}`).join(' · ') || undefined },
    { label: 'Tests',        value: r.tests?.total ?? 0,
      sub: r.tests?.total ? `${r.tests.passed} passed (${Math.round((r.tests.pass_rate||0)*100)}%)` : undefined },
    { label: 'Feedback',     value: r.feedback?.total ?? 0 },
    { label: 'Drift Alerts', value: r.drift_alerts?.open ?? 0, sub: 'open' },
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
