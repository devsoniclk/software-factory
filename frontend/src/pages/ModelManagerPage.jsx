import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, Check, Download, RefreshCw, Key, Zap } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { useOllamaStatus, useModelsList, useSwitchProvider } from '../api/hooks';

const stagger = (i) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] } });

const PROVIDERS = [
  { id: 'ollama',   label: 'Ollama',    sub: 'Local models',     icon: Server },
  { id: 'mimo',     label: 'MiMo',      sub: 'Xiaomi models',    icon: Zap    },
  { id: 'openai',   label: 'OpenAI',    sub: 'GPT-4o, etc.',     icon: Cpu    },
  { id: 'deepseek', label: 'DeepSeek',  sub: 'V3, Coder',        icon: Cpu    },
];

export default function ModelManagerPage() {
  const [activeProvider, setActiveProvider] = useState('ollama');
  const [apiKey, setApiKey] = useState('');
  const [apiKeys, setApiKeys] = useState({});

  const { data: ollamaStatus } = useOllamaStatus();
  const { data: models, isLoading } = useModelsList();
  const switchProvider = useSwitchProvider();

  const modelList = Array.isArray(models) ? models : models?.items || models?.models || [];
  const filteredModels = modelList.filter((m) => !m.provider || m.provider === activeProvider);

  const handleSwitch = (modelId) => {
    switchProvider.mutate({ provider: activeProvider, model: modelId, api_key: apiKeys[activeProvider] });
  };

  const saveApiKey = () => {
    setApiKeys((prev) => ({ ...prev, [activeProvider]: apiKey }));
    setApiKey('');
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Model Manager</h1>
          <p className="page-subtitle">Configure AI providers and models</p>
        </div>
      </div>

      {/* Segmented provider control */}
      <motion.div {...stagger(0)} style={{ display: 'inline-flex', gap: 0, padding: 3, borderRadius: 'var(--radius-card)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const isActive = activeProvider === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--color-bg)' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} strokeWidth={1.5} />
              {p.label}
            </button>
          );
        })}
      </motion.div>

      {/* Ollama status pill */}
      {activeProvider === 'ollama' && (
        <motion.div {...stagger(1)} style={{ marginBottom: 20 }}>
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 10, height: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ollamaStatus?.running ? 'var(--status-success)' : 'var(--status-error)' }} />
                  {ollamaStatus?.running && (
                    <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'rgba(40,205,65,0.25)', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Ollama Server</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {ollamaStatus?.running ? `Running · ${ollamaStatus.models_count || 0} models loaded` : 'Not running. Start with ollama serve'}
                  </p>
                </div>
              </div>
              <button style={{ padding: 7, display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* API key (non-ollama) */}
      {activeProvider !== 'ollama' && (
        <motion.div {...stagger(1)} style={{ marginBottom: 20 }}>
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', flexShrink: 0 }}>
                <Key size={14} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>API Key</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={apiKeys[activeProvider] ? '••••••••••••' : `Enter ${activeProvider} API key…`}
                    className="input-base"
                    style={{ flex: 1 }}
                  />
                  <button onClick={saveApiKey} disabled={!apiKey.trim()} className="btn-ghost">Save</button>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Model list */}
      <div>
        <p className="section-label">Available Models</p>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
          </div>
        ) : filteredModels.length === 0 ? (
          <EmptyState icon={Cpu} title="No models found" description={activeProvider === 'ollama' ? 'Make sure Ollama is running and has models installed.' : `No models configured for ${activeProvider}.`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredModels.map((m, i) => (
              <motion.div key={m.id || m.name} {...stagger(i + 2)}>
                <GlassCard>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', flexShrink: 0 }}>
                        <Cpu size={16} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{m.name || m.id}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {m.size ? `${(m.size / 1e9).toFixed(1)}B params` : ''}
                          {m.quantization ? ` · ${m.quantization}` : ''}
                          {m.status === 'installed' && <span style={{ marginLeft: 6, color: 'var(--status-success)' }}>Installed</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {m.status !== 'installed' && activeProvider === 'ollama' && (
                        <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                          <Download size={12} strokeWidth={1.5} /> Pull
                        </button>
                      )}
                      <button
                        onClick={() => handleSwitch(m.id || m.name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                          fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-md)', border: 'none',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          ...(m.active
                            ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                            : { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }),
                        }}
                      >
                        {m.active ? <><Check size={12} strokeWidth={2} /> Active</> : 'Activate'}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>
    </div>
  );
}
