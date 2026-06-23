import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{
        width: 48, height: 48,
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon size={22} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 6,
        letterSpacing: '-0.2px',
      }}>{title}</h3>
      <p style={{
        fontSize: 13, color: 'var(--text-secondary)',
        maxWidth: 260, lineHeight: 1.6, marginBottom: action ? 20 : 0,
      }}>{description}</p>
      {action && onAction && (
        <button onClick={onAction} className="btn-primary" style={{ fontSize: '0.8125rem' }}>
          {action}
        </button>
      )}
    </motion.div>
  );
}
