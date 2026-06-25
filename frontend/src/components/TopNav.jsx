import { NavLink } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

const tabs = [
  { to: '/requirements', label: 'Requirements' },
  { to: '/blueprints',   label: 'Blueprints'   },
  { to: '/work-orders',  label: 'Work Orders'  },
  { to: '/tests',        label: 'Tests'        },
  { to: '/feedback',     label: 'Feedback'     },
  { to: '/audit',        label: 'Audit'        },
  { to: '/graph',        label: 'Graph'        },
  { to: '/models',       label: 'Models'       },
  { to: '/tokens',       label: 'Tokens'       },
];

export default function TopNav({ onSearchOpen, onMenuClick }) {
  const isMobile = useMobile();

  return (
    <header style={{
      height: 'var(--topnav-height)',
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
      zIndex: 20,
      position: 'relative',
    }}>
      {/* Hamburger  mobile only */}
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{
            width: 48, height: '100%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)',
            borderRight: '1px solid var(--border)',
          }}
          aria-label="Toggle navigation"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
      )}

      {/* Logo */}
      <NavLink
        to="/"
        style={{
          width: isMobile ? 'auto' : 'var(--sidebar-width)',
          flex: isMobile ? 1 : undefined,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isMobile ? '0 14px' : '0 18px',
          textDecoration: 'none',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          height: '100%',
        }}
      >
        <div style={{
          width: 24, height: 24,
          background: '#0A0A0A',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '-0.5px' }}>SF</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
          {isMobile ? 'SF' : 'Software Factory'}
        </span>
      </NavLink>

      {/* Tabs  desktop only */}
      {!isMobile && (
        <nav style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '0 12px',
          height: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                height: 30,
                padding: '0 10px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                transition: 'background 0.12s, color 0.12s',
              })}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0 }}>
        {/* Search  desktop only */}
        {!isMobile && (
          <button
            onClick={onSearchOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 30, padding: '0 10px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              fontSize: 12,
              fontFamily: 'inherit',
              transition: 'border-color 0.12s',
              minWidth: 180,
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-emphasized)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Search size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {['⌘', 'K'].map((k) => (
                <kbd key={k} style={{
                  fontSize: 10, padding: '1px 4px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--border-emphasized)',
                  borderRadius: 4,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}>{k}</kbd>
              ))}
            </div>
          </button>
        )}

        {/* Search icon  mobile only */}
        {isMobile && (
          <button
            onClick={onSearchOpen}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', borderRadius: 8,
            }}
            aria-label="Search"
          >
            <Search size={16} strokeWidth={1.5} />
          </button>
        )}

        {/* Avatar */}
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          letterSpacing: '0.02em',
          flexShrink: 0,
          cursor: 'pointer',
        }}>
          MR
        </div>
      </div>
    </header>
  );
}
