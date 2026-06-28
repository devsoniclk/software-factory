import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, CheckCircle2, XCircle, Clock, Sparkles, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { StatusBadge } from '../components/Badge';
import { useProjects, useRequirements, useTestCases, useGenerateTests } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

function TestStatusIcon({ status }) {
  if (status === 'pass') return <CheckCircle2 size={14} strokeWidth={1.5} style={{ color: 'var(--status-success)', flexShrink: 0 }} />;
  if (status === 'fail') return <XCircle size={14} strokeWidth={1.5} style={{ color: 'var(--status-error)', flexShrink: 0 }} />;
  return <Clock size={14} strokeWidth={1.5} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />;
}

const SelectField = ({ value, onChange, children, disabled }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={onChange} disabled={disabled} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </select>
    <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
  </div>
);

export default function TestsPage() {
  const { projectId: urlProjectId } = useParams();
  const [localProjectId, setLocalProjectId] = useState('');
  const projectId = urlProjectId || localProjectId;
  const [reqId, setReqId] = useState('');

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: requirements } = useRequirements(projectId);
  const reqList = Array.isArray(requirements) ? requirements : requirements?.items || requirements?.requirements || [];
  const { data: tests, isLoading } = useTestCases(reqId);
  const testList = Array.isArray(tests) ? tests : tests?.items || tests?.tests || [];
  const genTests = useGenerateTests();

  const passCount = testList.filter((t) => t.status === 'pass').length;
  const failCount = testList.filter((t) => t.status === 'fail').length;
  const pendCount = testList.filter((t) => !t.status || t.status === 'pending').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">Test cases and coverage</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!urlProjectId && (
            <SelectField value={localProjectId} onChange={(e) => { setLocalProjectId(e.target.value); setReqId(''); }}>
              <option value="">Project…</option>
              {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </SelectField>
          )}
          <SelectField value={reqId} onChange={(e) => setReqId(e.target.value)} disabled={!projectId}>
            <option value="">Requirement…</option>
            {reqList.map((r) => <option key={r.id || r.requirement_id} value={r.id || r.requirement_id}>{r.title}</option>)}
          </SelectField>
          <button onClick={() => reqId && genTests.mutate({ requirementId: reqId })} disabled={!reqId || genTests.isPending} className="btn-ai">
            <Sparkles size={13} strokeWidth={1.5} /> {genTests.isPending ? 'Generating…' : 'AI Generate'}
          </button>
        </div>
      </div>

      {testList.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Passed', count: passCount, color: 'var(--status-success)' },
            { label: 'Failed', count: failCount, color: 'var(--status-error)' },
            { label: 'Pending', count: pendCount, color: 'var(--status-warning)' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-card)', background: 'var(--color-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!reqId ? (
        <EmptyState icon={FlaskConical} title="Select a requirement" description="Choose a project and requirement to view test cases." />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : testList.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No tests yet" description="Generate test cases from this requirement with AI." action="AI Generate" onAction={() => genTests.mutate({ requirementId: reqId })} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {testList.map((t, i) => (
            <motion.div key={t.id || t.test_id} {...stagger(i)}>
              <GlassCard>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: t.steps?.length ? 12 : 0 }}>
                  <TestStatusIcon status={t.status} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px', marginBottom: 4 }}>{t.title || t.name}</div>
                    {t.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t.description}</p>}
                  </div>
                  <StatusBadge status={t.status || 'pending'} />
                </div>
                {t.steps?.length > 0 && (
                  <ol style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 24 }}>
                    {t.steps.map((s, j) => (
                      <li key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ol>
                )}
                {t.expected_result && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(40,205,65,0.06)', border: '1px solid rgba(40,205,65,0.14)', fontSize: 12, color: 'var(--status-success)' }}>
                    Expected: {t.expected_result}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
