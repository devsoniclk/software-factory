import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, Check, Download, RefreshCw, Key, Zap, X, Loader } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { useOllamaStatus, useModelsList, useSwitchProvider } from '../api/hooks';
import { useQueryClient } from '@tanstack/react-query';

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
  const [pullStates, setPullStates] = useState({});
  const esRefs = useRef({});
  const qc = useQueryClient();

  const { data: ollamaStatus, refetch: refetchStatus } = useOllamaStatus();
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

  const pullModel = useCallback((modelName) => {
    if (esRefs.current[modelName]) return;

    setPullStates((s) => ({ ...s, [modelName]: { status: 'connecting', progress: null, error: null, label: 'Connecting…' } }));

    const url = `http://localhost:8099/ollama/pull/stream?name=${encodeURIComponent(modelName)}`;
    const es = new EventSource(url);
    esRefs.current[modelName] = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.error) {
          setPullStates((s) => ({ ...s, [modelName]: { status: 'error', progress: null, error: data.error } }));
          es.close();
          delete esRefs.current[modelName];
          return;
        }
        const pct = data.total && data.completed ? Math.round((data.completed / data.total) * 100) : null;
        const isDone = data.status === 'success' || data.status === 'done';
        setPullStates((s) => ({
          ...s,
          [modelName]: { status: isDone ? 'done' : 'pulling', progress: pct, error: null, label: data.status },
        }));
        if (isDone) {
          es.close();
          delete esRefs.current[modelName];
          qc.invalidateQueries({ queryKey: ['models'] });
        }
      } catch (_) {}
    };

    es.onerror = () => {
      setPullStates((s) => ({ ...s, [modelName]: { status: 'error', progress: null, error: 'Stream error' } }));
      es.close();
      delete esRefs.current[modelName];
    };
  }, [qc]);

  const cancelPull = (modelName) => {
    if (esRefs.current[modelName]) {
      esRefs.current[modelName].close();
      delete esRefs.current[modelName];
    }
    setPullStates((s) => { const n = { ...s }; delete n[modelName]; return n; });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Model Manager</h1>
          <p className="page-subtitle">Configure AI providers and models</p>
        </div>
      </div>

      <motion.div {...stagger(0)} style={{ display: 'inline-flex', gap: 0, padding: 3, borderRadius: 'var(--radius-card)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const isActive = activeProvider === p.id;
          return (
            <button key={p.id} onClick={() => setActiveProvider(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', background: isActive ? 'var(--color-bg)' : 'transparent', boxShadow: isActive ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s ease' }}>
              <Icon size={13} strokeWidth={1.5} />
              {p.label}
            </button>
          );
        })}
      </motion.div>

      {activeProvider === 'ollama' && (
        <motion.div {...stagger(1)} style={{ marginBottom: 20 }}>
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 10, height: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ollamaStatus?.running ? 'var(--status-success)' : 'var(--status-error)' }} />
                  {ollamaStatus?.running && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'rgba(40,205,65,0.25)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Ollama Server</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {ollamaStatus?.running ? `Running · ${ollamaStatus.models_count || 0} models loaded` : 'Not running. Start with ollama serve'}
                  </p>
                </div>
              </div>
              <button onClick={() => refetchStatus()} style={{ padding: 7, display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

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
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={apiKeys[activeProvider] ? '••••••••••••' : `Enter ${activeProvider} API key…`} className="input-base" style={{ flex: 1 }} />
                  <button onClick={saveApiKey} disabled={!apiKey.trim()} className="btn-ghost">Save</button>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

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
            {filteredModels.map((m, i) => {
              const mName = m.name || m.id;
              const pull = pullStates[mName];
              const isPulling = pull && (pull.status === 'connecting' || pull.status === 'pulling');
              return (
                <motion.div key={m.id || m.name} {...stagger(i + 2)}>
                  <GlassCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', flexShrink: 0 }}>
                          <Cpu size={16} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{mName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {m.size ? `${(m.size / 1e9).toFixed(1)}B params` : ''}
                            {m.quantization ? ` · ${m.quantization}` : ''}
                            {m.status === 'installed' && <span style={{ marginLeft: 6, color: 'var(--status-success)' }}>Installed</span>}
                          </div>
                          {pull && pull.status === 'error' && (
                            <div style={{ fontSize: 11, color: 'var(--status-error)', marginTop: 4 }}>{pull.error}</div>
                          )}
                          {isPulling && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                <Loader size={10} strokeWidth={2} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                  {pull.label || 'Pulling'}{pull.progress != null ? ` · ${pull.progress}%` : ''}
                                </span>
                              </div>
                              {pull.progress != null && (
                                <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pull.progress}%`, background: 'var(--accent)', transition: 'width 0.3s ease', borderRadius: 2 }} />
                                </div>
                              )}
                            </div>
                          )}
                          {pull?.status === 'done' && (
                            <span style={{ fontSize: 11, color: 'var(--status-success)', marginTop: 4, display: 'block' }}>Downloaded successfully</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        {m.status !== 'installed' && activeProvider === 'ollama' && (
                          isPulling ? (
                            <button onClick={() => cancelPull(mName)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--status-error)', background: 'transparent', cursor: 'pointer', color: 'var(--status-error)', fontFamily: 'inherit' }}>
                              <X size={12} strokeWidth={1.5} /> Cancel
                            </button>
                          ) : (
                            <button onClick={() => pullModel(mName)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                              <Download size={12} strokeWidth={1.5} /> Pull
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleSwitch(m.id || m.name)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', ...(m.active ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' } : { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }) }}
                        >
                          {m.active ? <><Check size={12} strokeWidth={2} /> Active</> : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
