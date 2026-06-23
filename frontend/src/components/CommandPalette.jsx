import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, FileText, Layers, ListChecks,
  FlaskConical, MessageSquare, GitFork, Shield, Cpu, Settings,
} from 'lucide-react';

const commands = [
  { id: 'dashboard',    label: 'Go to Dashboard',       icon: LayoutDashboard, path: '/' },
  { id: 'requirements', label: 'Go to Requirements',    icon: FileText,         path: '/requirements' },
  { id: 'blueprints',   label: 'Go to Blueprints',      icon: Layers,           path: '/blueprints' },
  { id: 'work-orders',  label: 'Go to Work Orders',     icon: ListChecks,       path: '/work-orders' },
  { id: 'tests',        label: 'Go to Tests',           icon: FlaskConical,     path: '/tests' },
  { id: 'feedback',     label: 'Go to Feedback',        icon: MessageSquare,    path: '/feedback' },
  { id: 'graph',        label: 'Go to Knowledge Graph', icon: GitFork,          path: '/graph' },
  { id: 'audit',        label: 'Go to Audit Trail',     icon: Shield,           path: '/audit' },
  { id: 'models',       label: 'Go to Model Manager',   icon: Cpu,              path: '/models' },
  { id: 'settings',     label: 'Open Settings',         icon: Settings,         path: '/' },
];

export default function CommandPalette({ externalOpen, onExternalClose }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen || internalOpen;
  const setOpen = (v) => { setInternalOpen(v); if (!v && onExternalClose) onExternalClose(); };
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (externalOpen) { setQuery(''); setSelected(0); }
  }, [externalOpen]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setSelected(0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q));
  }, [query]);

  const execute = (cmd) => {
    navigate(cmd.path);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selected]) execute(filtered[selected]);
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            style={{
              width: '100%', maxWidth: 480,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
            }}>
              <Search size={17} strokeWidth={1.6} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 15, color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <kbd style={{
                padding: '2px 6px', fontSize: 11,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--border-emphasized)',
                borderRadius: 6, color: 'var(--text-tertiary)',
                fontFamily: 'inherit',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '6px 0' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                  No results
                </div>
              )}
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                const isSelected = i === selected;
                return (
                  <button
                    key={cmd.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 18px',
                      background: isSelected ? 'var(--accent-bg)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: 14,
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'background 0.1s, color 0.1s',
                      fontFamily: 'inherit',
                    }}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? 'var(--accent-bg)' : 'var(--color-bg-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border)'}`,
                    }}>
                      <Icon size={14} strokeWidth={1.6} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                    </div>
                    {cmd.label}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '10px 18px',
              borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-tertiary)',
            }}>
              {[['↑↓', 'Navigate'], ['↵', 'Select'], ['ESC', 'Close']].map(([key, label]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <kbd style={{
                    padding: '1px 5px', fontSize: 10,
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--border-emphasized)',
                    borderRadius: 4, fontFamily: 'inherit',
                  }}>{key}</kbd>
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
