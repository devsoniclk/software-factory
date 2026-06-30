import { useState, useEffect } from 'react';
import { useExternalAPIKeys, useCreateExternalAPIKey, useDeleteExternalAPIKey } from '../api/hooks';
import EmptyState from '../components/EmptyState';
import { Key, Copy, Check } from 'lucide-react';

export default function ExternalAPIKeysPage() {
  const { data: keys = [], isLoading } = useExternalAPIKeys();
  const create = useCreateExternalAPIKey();
  const deleteKey = useDeleteExternalAPIKey();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-clear key from state after 2 minutes for security
  useEffect(() => {
    if (!newKey) return;
    const t = setTimeout(() => setNewKey(null), 120_000);
    return () => clearTimeout(t);
  }, [newKey]);

  const handleCreate = async () => {
    const result = await create.mutateAsync(form);
    setNewKey(result.key);   // backend returns { key: rawKey, ... }
    setShowNew(false);
    setForm({ name: '', description: '' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">External API Keys</h1>
          <p className="page-subtitle">Manage API keys for headless automation and integrations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Key</button>
      </div>
      {newKey && (
        <div style={{ background: '#34C75918', border: '1px solid #34C75940', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Key created — copy it now, it won't be shown again:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00000018', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: '#34C759', flex: 1 }}>{newKey}</code>
            <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleCopy}>
              {copied ? <Check size={13} color="#34C759" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#FF9500', marginBottom: 8 }}>⚠ This key auto-clears from the page in 2 minutes.</p>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}
      {showNew && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <input className="input-base" placeholder="Key name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
          <input className="input-base" placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleCreate} disabled={!form.name}>Create</button>
          </div>
        </div>
      )}
      {isLoading ? <div className="skeleton" style={{ height: 100, borderRadius: 8 }} /> :
        keys.length === 0 ? <EmptyState icon={Key} title="No API keys" subtitle="Create keys for headless automation" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {keys.map(k => (
            <div key={k.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{k.name}</div>
                <code style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{k.key_prefix}••••••••</code>
                {k.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{k.description}</div>}
              </div>
              <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--text-tertiary)' }} onClick={() => deleteKey.mutate(k.id)}>Revoke</button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
