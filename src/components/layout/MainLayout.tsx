import React from 'react';
import { Compass, Sparkles, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { BackgroundAtmosphere } from './BackgroundAtmosphere';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <BackgroundAtmosphere>
      <header
        style={{
          padding: 'var(--space-md) var(--space-xl)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(255, 244, 219, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Compass style={{ color: 'var(--color-deep-forest)', width: 26, height: 26 }} />
          <h1
            style={{
              margin: 0,
              fontSize: '1.4rem',
              fontFamily: 'var(--font-family-serif)',
              letterSpacing: '0.06em',
              color: 'var(--color-deep-forest)',
            }}
          >
            RYOKO
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Palette size={16} style={{ color: 'var(--color-moss)' }} /> Visual Museum & Design System
          </span>
        </div>
      </header>

      <main style={{ padding: 'var(--space-xl)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      <footer
        style={{
          padding: 'var(--space-lg)',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(229, 216, 200, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} style={{ color: 'var(--color-rosy-brown)' }} />
          RYOKO — Interactive Vintage Travel Journal Design Museum (Phase 1 Foundation)
        </div>
      </footer>
    </BackgroundAtmosphere>
  );
};
