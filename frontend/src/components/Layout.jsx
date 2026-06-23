import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } },
};

export default function Layout() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
      <TopNav
        onSearchOpen={() => setPaletteOpen(true)}
        onMenuClick={() => setSidebarOpen((o) => !o)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              style={{ minHeight: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette externalOpen={paletteOpen} onExternalClose={() => setPaletteOpen(false)} />
    </div>
  );
}
