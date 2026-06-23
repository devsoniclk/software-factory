import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Bell, Palette, Shield, ChevronRight, Check, Globe } from 'lucide-react';
import { applyTheme, applyAccent } from '../hooks/useTheme';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

const SECTIONS = [
  { id: 'general',       label: 'General',       icon: Globe },
  { id: 'backend',       label: 'Backend',        icon: Server },
  { id: 'appearance',    label: 'Appearance',     icon: Palette },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'privacy',       label: 'Privacy',        icon: Shield },
];

function SectionRow({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 10px', borderRadius: 10, border: 'none',
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'background 0.12s, color 0.12s',
        textAlign: 'left',
      }}
    >
      <Icon size={14} strokeWidth={1.5} />
      {label}
      {active && <ChevronRight size={12} strokeWidth={1.5} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
        transition: 'background 0.2s',
        position: 'relative', flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
      }} />
    </button>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-xs)', padding: '4px 20px', marginBottom: 20 }}>
      {children}
    </div>
  );
}

const DEFAULT_SETTINGS = {
  backendUrl: 'http://localhost:8000',
  apiTimeout: '30',
  theme: 'system',
  accentColor: '#0071E3',
  compactMode: false,
  notifyOnComplete: true,
  notifyOnError: true,
  emailDigest: false,
  analyticsOptOut: false,
  retainLogs: '90',
};

function load() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('sf_settings') || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(load);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => {
    if (key === 'theme') applyTheme(val);
    if (key === 'accentColor') applyAccent(val);
    setSettings((s) => ({ ...s, [key]: val }));
  };

  const saveAll = () => {
    localStorage.setItem('sf_settings', JSON.stringify(settings));
    applyTheme(settings.theme || 'system');
    if (settings.accentColor) applyAccent(settings.accentColor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ACCENT_OPTIONS = ['#0071E3', '#28CD41', '#FF9F0A', '#C4000A', '#9333EA', '#0891B2'];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">App configuration and preferences</p>
        </div>
        <button onClick={saveAll} className="btn-primary" style={{ minWidth: 80 }}>
          {saved ? <><Check size={13} strokeWidth={2} /> Saved</> : 'Save'}
        </button>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24 }}>
        {/* Sidebar nav */}
        <motion.div {...stagger(0)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map((s) => (
              <SectionRow key={s.id} icon={s.icon} label={s.label} active={activeSection === s.id} onClick={() => setActiveSection(s.id)} />
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div key={activeSection} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>
          {activeSection === 'general' && (
            <>
              <p className="section-label">General</p>
              <Card>
                <SettingRow label="Application Name" description="Display name used throughout the UI">
                  <input defaultValue="1024 Studio" className="input-base" style={{ width: 180, textAlign: 'right' }} />
                </SettingRow>
                <SettingRow label="Default Project" description="Pre-select this project on all pages">
                  <select className="input-base" style={{ width: 160 }}>
                    <option value="">None</option>
                  </select>
                </SettingRow>
                <SettingRow label="Compact Mode" description="Reduce padding and increase information density">
                  <Toggle checked={settings.compactMode} onChange={(v) => set('compactMode', v)} />
                </SettingRow>
              </Card>
            </>
          )}

          {activeSection === 'backend' && (
            <>
              <p className="section-label">Backend Connection</p>
              <Card>
                <SettingRow label="API Base URL" description="Base URL of the software-factory backend">
                  <input
                    value={settings.backendUrl}
                    onChange={(e) => set('backendUrl', e.target.value)}
                    placeholder="http://localhost:8000"
                    className="input-base"
                    style={{ width: 220, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </SettingRow>
                <SettingRow label="Request Timeout" description="Seconds before a request is cancelled">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={settings.apiTimeout}
                      onChange={(e) => set('apiTimeout', e.target.value)}
                      min="5" max="120"
                      className="input-base"
                      style={{ width: 70, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>s</span>
                  </div>
                </SettingRow>
              </Card>
              <p className="section-label">Connection Status</p>
              <Card>
                <SettingRow label="API Health" description={settings.backendUrl}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-warning)', display: 'inline-block' }} />
                    Unknown
                  </span>
                </SettingRow>
              </Card>
            </>
          )}

          {activeSection === 'appearance' && (
            <>
              <p className="section-label">Theme</p>
              <Card>
                <SettingRow label="Color Scheme" description="Choose light, dark, or follow system preference">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['system', 'light', 'dark'].map((t) => (
                      <button
                        key={t}
                        onClick={() => set('theme', t)}
                        style={{
                          padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 8,
                          border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                          textTransform: 'capitalize', transition: 'all 0.12s',
                          background: settings.theme === t ? 'var(--accent-bg)' : 'transparent',
                          color: settings.theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                          borderColor: settings.theme === t ? 'var(--accent-border)' : 'var(--border)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label="Accent Color" description="Primary interactive color throughout the UI" style={{ borderBottom: 'none' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ACCENT_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => set('accentColor', c)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', background: c,
                          border: settings.accentColor === c ? `2px solid ${c}` : '2px solid transparent',
                          outline: settings.accentColor === c ? `2px solid ${c}` : '2px solid transparent',
                          outlineOffset: 2,
                          cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                          transition: 'outline 0.12s',
                        }}
                      />
                    ))}
                  </div>
                </SettingRow>
              </Card>
            </>
          )}

          {activeSection === 'notifications' && (
            <>
              <p className="section-label">Notifications</p>
              <Card>
                <SettingRow label="AI Task Completed" description="Notify when an AI generation task finishes">
                  <Toggle checked={settings.notifyOnComplete} onChange={(v) => set('notifyOnComplete', v)} />
                </SettingRow>
                <SettingRow label="Errors and Failures" description="Notify when a task fails or throws an error">
                  <Toggle checked={settings.notifyOnError} onChange={(v) => set('notifyOnError', v)} />
                </SettingRow>
                <SettingRow label="Email Digest" description="Receive a daily summary of activity via email">
                  <Toggle checked={settings.emailDigest} onChange={(v) => set('emailDigest', v)} />
                </SettingRow>
              </Card>
            </>
          )}

          {activeSection === 'privacy' && (
            <>
              <p className="section-label">Data & Privacy</p>
              <Card>
                <SettingRow label="Analytics Opt-Out" description="Disable anonymous usage analytics">
                  <Toggle checked={settings.analyticsOptOut} onChange={(v) => set('analyticsOptOut', v)} />
                </SettingRow>
                <SettingRow label="Log Retention" description="Days to retain audit logs before automatic deletion">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={settings.retainLogs}
                      onChange={(e) => set('retainLogs', e.target.value)}
                      min="1" max="365"
                      className="input-base"
                      style={{ width: 70, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>days</span>
                  </div>
                </SettingRow>
              </Card>
              <Card>
                <SettingRow label="Clear Local Data" description="Remove all cached data and settings from this browser">
                  <button
                    onClick={() => { localStorage.clear(); setSettings(DEFAULT_SETTINGS); }}
                    style={{
                      padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 8,
                      border: '1px solid rgba(196,0,10,0.3)', color: '#C4000A',
                      background: 'rgba(196,0,10,0.06)', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.12s',
                    }}
                  >
                    Clear
                  </button>
                </SettingRow>
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
