import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Settings, ChevronDown, X, FileText, GitBranch, ClipboardList, FlaskConical, MessageSquare, Shield, Network, Cpu, Zap, Link2, LayoutTemplate, Database, BarChart2 } from 'lucide-react';
import { useProjects } from '../api/hooks';
import { useState, useEffect, useRef } from 'react';
import { useMobile } from '../hooks/useMobile';

const contextItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/settings', icon: Settings,        label: 'Settings', end: false },
];

const sectionTabs = [
  { to: '/requirements', icon: FileText,      label: 'Requirements' },
  { to: '/blueprints',   icon: GitBranch,     label: 'Blueprints'   },
  { to: '/work-orders',  icon: ClipboardList, label: 'Work Orders'  },
  { to: '/tests',        icon: FlaskConical,  label: 'Tests'        },
  { to: '/feedback',     icon: MessageSquare, label: 'Feedback'     },
  { to: '/audit',        icon: Shield,        label: 'Audit'        },
  { to: '/graph',        icon: Network,       label: 'Graph'        },
  { to: '/models',       icon: Cpu,           label: 'Models'       },
  { to: '/tokens',       icon: Zap,           label: 'Tokens'       },
  { to: '/traceability', icon: Link2,          label: 'Traceability' },
  { to: '/templates',   icon: LayoutTemplate, label: 'Templates'    },
  { to: '/er-diagram',  icon: Database,       label: 'ER Diagram'   },
  { to: '/analytics',   icon: BarChart2,      label: 'Analytics'    },
];

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 7,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        background: isActive ? 'var(--accent-bg)' : 'transparent',
        transition: 'background 0.1s, color 0.1s',
      })}
    >
      <Icon size={14} strokeWidth={1.6} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const [projectOpen, setProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const isMobile = useMobile();

  useEffect(() => { setProjectOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProjectOpen(false);
    };
    if (projectOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectOpen]);

  const currentProject = selectedProject || projectList[0];

  const sidebarStyle = isMobile
    ? {
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        width: 260,
        zIndex: 100,
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: isOpen ? 'var(--shadow-xl)' : 'none',
      }
    : {
        width: 'var(--sidebar-width)',
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        position: 'relative',
      };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.32)',
              zIndex: 99,
            }}
          />
        )}
      </AnimatePresence>

      <aside style={sidebarStyle}>
        {/* Mobile header */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, background: '#0A0A0A', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>SF</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Software Factory</span>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', borderRadius: 6 }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Project selector */}
        <div style={{ padding: isMobile ? '12px 12px 10px' : '14px 12px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => setProjectOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '7px 10px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.12s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, background: 'var(--accent)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>
                  {(currentProject?.name || 'P')[0].toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProject?.name || 'Select project'}
              </span>
            </div>
            <ChevronDown size={12} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0, transform: projectOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          <AnimatePresence>
            {projectOpen && projectList.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: 'absolute', left: 12, right: 12, top: 72,
                  background: 'var(--color-bg)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--shadow-md)',
                  zIndex: 30, overflow: 'hidden',
                }}
              >
                {projectList.map((p) => (
                  <button
                    key={p.id || p.project_id}
                    onClick={() => { setSelectedProject(p); setProjectOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '9px 12px',
                      background: (currentProject?.id || currentProject?.project_id) === (p.id || p.project_id) ? 'var(--accent-bg)' : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.1s', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>{(p.name || 'P')[0].toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 400 }}>{p.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section tabs  mobile only */}
        {isMobile && (
          <div style={{ padding: '8px 8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px' }}>Sections</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingBottom: 8 }}>
              {sectionTabs.map(({ to, icon, label }) => (
                <NavItem key={to} to={to} icon={icon} label={label} end={false} />
              ))}
            </nav>
          </div>
        )}

        {/* Context nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {!isMobile && (
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 10px 6px' }}>Context</div>
          )}
          {contextItems.map(({ to, icon, label, end }) => (
            <NavItem key={to} to={to} icon={icon} label={label} end={end} />
          ))}
        </nav>
      </aside>
    </>
  );
}
