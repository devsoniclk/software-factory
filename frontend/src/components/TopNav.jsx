import { NavLink } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

export default function TopNav({ onSearchOpen, onMenuClick }) {
  const isMobile = useMobile();

  return (
    <header style={{
      height: 'var(--topnav-height)',
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      zIndex: 20,
      position: 'relative',
    }}>
      {/* Hamburger — mobile only */}
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

      {/* Logo — matches sidebar width on desktop */}
      <NavLink
        to="/"
        style={{
          width: isMobile ? 'auto' : 'var(--sidebar-width)',
          flexGrow: isMobile ? 1 : 0,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isMobile ? '0 14px' : '0 18px',
          textDecoration: 'none',
          borderRight: '1px solid var(--border)',
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
        {!isMobile && (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            Software Factory
          </span>
        )}
      </NavLink>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0 }}>
        {/* Search — desktop: pill with shortcut hint */}
        {!isMobile ? (
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
        ) : (
          <button
            onClick={onSearchOpen}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', borderRadius: 8,
            }}
            aria-label="Search"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        )}

      </div>
    </header>
  );
}
