const priorityColors = {
  P1: { bg: '#FFF0EE', color: '#C4000A', border: 'rgba(196,0,10,0.15)' },
  P2: { bg: '#FFF4EC', color: '#C93B00', border: 'rgba(201,59,0,0.15)' },
  P3: { bg: '#EBF3FD', color: '#0071E3', border: 'rgba(0,113,227,0.20)' },
  P4: { bg: 'var(--color-bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border)' },
  P5: { bg: 'var(--color-bg-secondary)', color: 'var(--text-tertiary)', border: 'var(--border)' },
};

const statusColors = {
  draft:       { dot: 'var(--text-tertiary)',  color: 'var(--text-tertiary)' },
  active:      { dot: 'var(--status-success)', color: 'var(--status-success)' },
  in_progress: { dot: 'var(--accent)',         color: 'var(--accent)' },
  completed:   { dot: 'var(--status-success)', color: 'var(--status-success)' },
  failed:      { dot: 'var(--status-error)',   color: 'var(--status-error)' },
  fail:        { dot: 'var(--status-error)',   color: 'var(--status-error)' },
  pass:        { dot: 'var(--status-success)', color: 'var(--status-success)' },
  pending:     { dot: 'var(--status-warning)', color: 'var(--status-warning)' },
};

export function PriorityBadge({ level }) {
  if (!level) return null;
  const c = priorityColors[level] || priorityColors.P5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.01em',
      borderRadius: 'var(--radius-full)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {level}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  const c = statusColors[status] || statusColors.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, color: c.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot, flexShrink: 0,
      }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function AIBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', fontSize: 11, fontWeight: 500,
      color: 'var(--accent)',
      background: 'var(--accent-bg)',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--accent-border)',
    }}>
      <span style={{ fontSize: 9 }}>✦</span>
      AI
    </span>
  );
}
