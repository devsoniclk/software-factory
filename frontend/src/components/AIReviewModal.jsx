/**
 * AIReviewModal — shows AI-generated items (requirements or blueprint)
 * and lets the user accept/reject each one before saving.
 *
 * Props:
 *   title       string
 *   items       Array<{ id: string, title: string, description?: string, [extra]: any }>
 *   renderItem  (item) => ReactNode   — optional custom row renderer
 *   onConfirm   (acceptedItems) => void
 *   onCancel    () => void
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

function ItemRow({ item, accepted, onToggle, renderItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasDesc = !!(item.description || item.acceptance_criteria?.length);

  return (
    <div style={{
      border: `1.5px solid ${accepted ? 'var(--accent)' : '#f87171'}`,
      borderRadius: 10,
      overflow: 'hidden',
      background: accepted ? 'var(--accent-bg)' : '#fff1f2',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <button
          onClick={() => onToggle(item.id)}
          style={{
            width: 28, height: 28, borderRadius: 14,
            background: accepted ? 'var(--accent)' : '#ef4444',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          {accepted
            ? <Check size={13} color="#fff" strokeWidth={2.5} />
            : <X size={13} color="#fff" strokeWidth={2.5} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {renderItem ? renderItem(item) : (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title || item.name}
            </div>
          )}
        </div>

        {hasDesc && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && hasDesc && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
          >
            <div style={{ padding: '10px 14px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item.description && <p style={{ margin: '0 0 8px' }}>{item.description}</p>}
              {item.acceptance_criteria?.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {item.acceptance_criteria.map((ac, i) => (
                    <li key={i} style={{ marginBottom: 3 }}>{typeof ac === 'string' ? ac : ac.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIReviewModal({ title = 'Review AI Suggestions', items = [], renderItem, onConfirm, onCancel }) {
  const [accepted, setAccepted] = useState(() => new Set(items.map((i) => i.id ?? i.title)));

  function toggle(id) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function acceptAll() { setAccepted(new Set(items.map((i) => i.id ?? i.title))); }
  function rejectAll() { setAccepted(new Set()); }

  function handleConfirm() {
    const kept = items.filter((i) => accepted.has(i.id ?? i.title));
    onConfirm(kept);
  }

  const acceptedCount = accepted.size;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%', maxWidth: 600,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                {acceptedCount} of {items.length} accepted
              </div>
            </div>
            <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={acceptAll}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 7, fontSize: 12, fontWeight: 500, color: 'var(--accent)', cursor: 'pointer' }}
            >
              <CheckCircle size={12} /> Accept All
            </button>
            <button
              onClick={rejectAll}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}
            >
              <XCircle size={12} /> Reject All
            </button>
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => {
            const id = item.id ?? item.title;
            return (
              <ItemRow
                key={id}
                item={item}
                accepted={accepted.has(id)}
                onToggle={toggle}
                renderItem={renderItem}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={acceptedCount === 0}
            style={{ padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: acceptedCount === 0 ? 'not-allowed' : 'pointer', opacity: acceptedCount === 0 ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            Save {acceptedCount} Item{acceptedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
