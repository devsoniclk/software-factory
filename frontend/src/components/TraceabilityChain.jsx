import { ArrowRight, AlertCircle, CheckCircle2, GitBranch, FileText, Layers, ClipboardList } from 'lucide-react';

const NODE_TYPES = {
  requirement: { icon: FileText,     color: '#0052FF', bg: 'rgba(0,82,255,0.08)',   border: 'rgba(0,82,255,0.20)',  label: 'Requirement' },
  ac:          { icon: CheckCircle2, color: '#15803D', bg: 'rgba(40,205,65,0.08)',  border: 'rgba(40,205,65,0.22)', label: 'Acceptance Criteria' },
  blueprint:   { icon: Layers,       color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.22)', label: 'Blueprint' },
  workorder:   { icon: ClipboardList,color: '#B97000', bg: 'rgba(255,159,10,0.09)', border: 'rgba(255,159,10,0.22)', label: 'Work Order' },
};

function Node({ type, id, title, status, warnings }) {
  const cfg = NODE_TYPES[type] || NODE_TYPES.requirement;
  const Icon = cfg.icon;

  return (
    <div style={{
      padding: '10px 14px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
      minWidth: 200,
      maxWidth: 260,
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} strokeWidth={1.5} style={{ color: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
      </div>
      {id && (
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: cfg.color, marginBottom: 4, background: 'rgba(255,255,255,0.4)', padding: '1px 5px', borderRadius: 4, display: 'inline-block' }}>
          {id}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{title}</div>
      {warnings > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <AlertCircle size={11} strokeWidth={1.5} style={{ color: '#B97000' }} />
          <span style={{ fontSize: 10, color: '#B97000' }}>{warnings} EARS warning{warnings > 1 ? 's' : ''}</span>
        </div>
      )}
      {status && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{status}</div>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-tertiary)' }}>
      <ArrowRight size={14} strokeWidth={1.5} />
    </div>
  );
}

function GapBadge({ label }) {
  return (
    <div style={{
      padding: '8px 12px',
      border: '1px dashed rgba(255,59,48,0.35)',
      background: 'rgba(255,59,48,0.04)',
      borderRadius: 10,
      minWidth: 140,
      textAlign: 'center',
    }}>
      <AlertCircle size={14} strokeWidth={1.5} style={{ color: '#FF3B30', marginBottom: 4 }} />
      <div style={{ fontSize: 11, color: '#FF3B30', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Not linked</div>
    </div>
  );
}

export default function TraceabilityChain({ chains = [], gaps = [] }) {
  if (!chains.length && !gaps.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <GitBranch size={28} strokeWidth={1} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No traceability data yet.</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Create requirements and link them to blueprints to see chains.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Gap summary */}
      {gaps.length > 0 && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.20)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AlertCircle size={13} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FF3B30' }}>{gaps.length} traceability gap{gaps.length > 1 ? 's' : ''} detected</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                <span style={{ color: '#FF3B30', flexShrink: 0 }}>•</span>
                {g.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chains */}
      {chains.map((chain, ci) => (
        <div key={ci} style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
            {/* Requirement node */}
            <Node
              type="requirement"
              id={chain.req_id}
              title={chain.req_title}
              warnings={chain.ears_warnings}
            />

            {/* Acceptance criteria column */}
            {chain.criteria?.length > 0 ? (
              <>
                <Arrow />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chain.criteria.map((ac, ai) => (
                    <Node
                      key={ai}
                      type="ac"
                      id={`${chain.req_id?.replace('REQ','AC')}.${ai + 1}`}
                      title={ac.text?.length > 80 ? ac.text.slice(0, 80) + '…' : ac.text}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Arrow />
                <GapBadge label="No AC defined" />
              </>
            )}

            {/* Blueprint node */}
            {chain.blueprints?.length > 0 ? (
              <>
                <Arrow />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chain.blueprints.map((bp, bi) => (
                    <Node
                      key={bi}
                      type="blueprint"
                      id={bp.bp_id}
                      title={bp.name}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Arrow />
                <GapBadge label="No Blueprint" />
              </>
            )}

            {/* Work orders */}
            {chain.work_orders?.length > 0 ? (
              <>
                <Arrow />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chain.work_orders.map((wo, wi) => (
                    <Node
                      key={wi}
                      type="workorder"
                      title={wo.title}
                      status={wo.status}
                    />
                  ))}
                </div>
              </>
            ) : (
              chain.blueprints?.length > 0 && (
                <>
                  <Arrow />
                  <GapBadge label="No Work Orders" />
                </>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
