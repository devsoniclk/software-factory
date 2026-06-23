import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = true, style = {}, ...props }) {
  return (
    <motion.div
      className={className}
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-xs)',
        transition: 'box-shadow 0.18s var(--ease-standard), border-color 0.18s var(--ease-standard)',
        ...style,
      }}
      whileHover={hover ? {
        y: -1,
        boxShadow: '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
        borderColor: 'rgba(0,0,0,0.12)',
        transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
      } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
