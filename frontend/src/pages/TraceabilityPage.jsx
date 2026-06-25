import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, AlertCircle, RefreshCw } from 'lucide-react';
import { useProjects } from '../api/hooks';
import { useTraceability, useGaps } from '../api/hooks';
import TraceabilityChain from '../components/TraceabilityChain';

const SEV_STYLE = {
  high:   { bg: 'rgba(255,59,48,0.08)',  border: 'rgba(255,59,48,0.22)',  color: '#FF3B30' },
  medium: { bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.22)', color: '#B97000' },
  low:    { bg: 'rgba(0,82,255,0.07)',   border: 'rgba(0,82,255,0.18)',   color: '#0052FF' },
};

export default function TraceabilityPage() {
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || [];
  const [selectedProject, setSelectedProject] = useState('');
  const pid = selectedProject || projectList[0]?.id;

  const { data: traceData, isLoading: traceLoading, refetch: refetchTrace } = useTraceability(pid);
  const { data: gapsData, isLoading: gapsLoading } = useGaps(pid);

  const chains = traceData?.chains || [];
  const gaps = traceData?.gaps || [];
  const allGaps = gapsData?.gaps || [];

  return (
    <div style={{ padding: 'var(--page-padding)', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <GitBranch size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Traceability</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            REQ → Acceptance Criteria → Blueprint → Work Order chains
          </p>
        </motion.div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input-base"
            style={{ minWidth: 180, fontSize: 12 }}
          >
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => refetchTrace()}
            title="Refresh"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--color-bg)', cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Gap overview bar */}
      {allGaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: '14px 18px', background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertCircle size={15} strokeWidth={1.5} style={{ color: '#B97000' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {allGaps.length} Coverage Gap{allGaps.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allGaps.map((g, i) => {
              const s = SEV_STYLE[g.severity] || SEV_STYLE.low;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: s.bg, border: `1px solid ${s.border}`,
                  borderRadius: 8,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: s.color, minWidth: 48,
                  }}>{g.severity}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: s.color, minWidth: 80 }}>{g.entity}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.message}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Chains */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Traceability Chains</span>
          {chains.length > 0 && (
            <span style={{ fontSize: 11, background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 8px', color: 'var(--text-tertiary)' }}>
              {chains.length}
            </span>
          )}
        </div>
        {traceLoading ? (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0' }}>Loading traceability data…</div>
        ) : (
          <TraceabilityChain chains={chains} gaps={gaps} />
        )}
      </motion.div>
    </div>
  );
}
