import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) { document.body.style.overflow = ''; return; }
    document.body.style.overflow = 'hidden';
    const id = setTimeout(() =>
      contentRef.current?.querySelector('input, textarea, select')?.focus(), 80
    );
    return () => { clearTimeout(id); document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.36)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.target === overlayRef.current && onClose()}
        >
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            className={`w-full ${maxWidth}`}
            style={{
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            {title && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px 16px',
                borderBottom: '1px solid var(--border)',
              }}>
                <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-full)',
                    background: 'var(--color-bg-secondary)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                    transition: 'background-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}
            <div style={{ padding: '20px 24px' }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
