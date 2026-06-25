import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Database, RefreshCw, TrendingDown, Clock, Cpu, BarChart2, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GlassCard from '../components/GlassCard';
import client from '../api/client';

const stagger = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] },
});

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)', i = 0 }) {
  return (
    <motion.div {...stagger(i)}>
      <GlassCard style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} strokeWidth={1.6} style={{ color }} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function BarRow({ label, value, max, tokens, sub }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {fmtNum(tokens)} tokens
          {sub && <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{sub}</span>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: '100%', borderRadius: 99, background: 'var(--accent)' }}
        />
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n) {
  return `${(n ?? 0).toFixed(1)}%`;
}

function CacheEntry({ entry, i }) {
  return (
    <motion.div {...stagger(i)} style={{
      display: 'grid', gridTemplateColumns: '1fr repeat(4, auto)',
      gap: 12, alignItems: 'center', padding: '10px 14px',
      background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)',
      fontSize: 12, marginBottom: 6,
    }}>
      <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 11 }}>
        {entry.key_prefix}…
      </span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{entry.hits} hits</span>
      <span style={{ color: 'var(--text-secondary)' }}>{fmtNum(entry.prompt_tokens + entry.completion_tokens)} tok</span>
      <span style={{ color: 'var(--text-tertiary)' }}>{Math.round(entry.age_seconds / 60)}m old</span>
      <span style={{
        padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 99,
        background: entry.alive ? 'rgba(40,205,65,0.1)' : 'rgba(196,0,10,0.07)',
        color: entry.alive ? '#15803D' : '#C4000A',
        border: `1px solid ${entry.alive ? 'rgba(40,205,65,0.2)' : 'rgba(196,0,10,0.15)'}`,
      }}>
        {entry.alive ? 'live' : 'expired'}
      </span>
    </motion.div>
  );
}

function RecentCall({ call, i }) {
  return (
    <motion.div {...stagger(i)} style={{
      display: 'grid', gridTemplateColumns: '140px 1fr 80px 80px 60px',
      gap: 10, alignItems: 'center', padding: '10px 14px',
      background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'transparent',
      borderRadius: 'var(--radius-md)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 10 }}>
        {call.timestamp?.slice(11, 19)}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {call.model} <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>{call.agent_type}</span>
      </span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{fmtNum(call.prompt_tokens)}</span>
      <span style={{ color: 'var(--accent)', textAlign: 'right' }}>{fmtNum(call.completion_tokens)}</span>
      <span style={{
        textAlign: 'center', padding: '2px 6px', fontSize: 10, fontWeight: 600, borderRadius: 99,
        background: call.cache_hit ? 'rgba(40,205,65,0.1)' : 'var(--color-bg-tertiary)',
        color: call.cache_hit ? '#15803D' : 'var(--text-tertiary)',
        border: `1px solid ${call.cache_hit ? 'rgba(40,205,65,0.2)' : 'var(--border)'}`,
      }}>
        {call.cache_hit ? 'cache' : 'live'}
      </span>
    </motion.div>
  );
}

export default function TokenUsagePage() {
  const [tab, setTab] = useState('overview');
  const qc = useQueryClient();

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['token-summary'],
    queryFn: () => client.get('/token-usage/summary').then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: globalData } = useQuery({
    queryKey: ['token-global'],
    queryFn: () => client.get('/token-usage/global').then(r => r.data),
    refetchInterval: 10_000,
  });

  const { data: byAgent } = useQuery({
    queryKey: ['token-by-agent'],
    queryFn: () => client.get('/token-usage/by-agent').then(r => r.data),
    enabled: tab === 'breakdown',
  });

  const { data: byModel } = useQuery({
    queryKey: ['token-by-model'],
    queryFn: () => client.get('/token-usage/by-model').then(r => r.data),
    enabled: tab === 'breakdown',
  });

  const { data: cacheData } = useQuery({
    queryKey: ['token-cache'],
    queryFn: () => client.get('/token-usage/cache').then(r => r.data),
    enabled: tab === 'cache',
    refetchInterval: 20_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['token-recent'],
    queryFn: () => client.get('/token-usage/recent?limit=30').then(r => r.data),
    enabled: tab === 'recent',
    refetchInterval: 8_000,
  });

  const evictMut = useMutation({
    mutationFn: () => client.post('/token-usage/cache/evict-expired'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['token-cache'] }),
  });

  const clearCacheMut = useMutation({
    mutationFn: () => client.delete('/token-usage/cache'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['token-cache', 'token-global'] }),
  });

  const maxAgentTokens = useMemo(() => {
    const rows = byAgent?.rows || [];
    return Math.max(1, ...rows.map(r => r.total_tokens || 0));
  }, [byAgent]);

  const maxModelTokens = useMemo(() => {
    const rows = byModel?.rows || [];
    return Math.max(1, ...rows.map(r => r.total_tokens || 0));
  }, [byModel]);

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'cache',     label: 'Cache' },
    { id: 'recent',    label: 'Recent Calls' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Token Usage</h1>
          <p className="page-subtitle">Track, cache and eliminate wasted LLM compute</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
        >
          <RefreshCw size={13} strokeWidth={1.8} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard i={0} icon={Zap} label="Lifetime Tokens" value={fmtNum(summary?.lifetime_total_tokens)} sub="all time" color="var(--accent)" />
        <StatCard i={1} icon={TrendingDown} label="Tokens Saved" value={fmtNum(summary?.lifetime_tokens_saved)} sub={`${fmtPct(summary?.lifetime_efficiency_pct)} efficiency`} color="#28CD41" />
        <StatCard i={2} icon={Database} label="Cache Entries" value={fmtNum(summary?.live_cache_entries)} sub={`${fmtNum(summary?.live_cache_hits)} hits this session`} color="#FF9F0A" />
        <StatCard i={3} icon={BarChart2} label="Total Calls" value={fmtNum(summary?.lifetime_calls)} sub={`${fmtNum(globalData?.call_count)} this session`} color="#BF5AF2" />
      </div>

      {/* Live session bar */}
      {globalData && (
        <motion.div {...stagger(4)}>
          <GlassCard style={{ padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Live Session Budget
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {fmtNum(globalData.total_tokens)} / 500K tokens
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (globalData.total_tokens / 500_000) * 100)}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  height: '100%', borderRadius: 99,
                  background: globalData.total_tokens > 400_000
                    ? '#FF3B30'
                    : globalData.total_tokens > 200_000
                    ? '#FF9F0A'
                    : 'var(--accent)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              {[
                { label: 'Input', value: fmtNum(globalData.input_tokens) },
                { label: 'Output', value: fmtNum(globalData.output_tokens) },
                { label: 'Cache hits', value: globalData.cache_hits },
                { label: 'Saved', value: fmtNum(globalData.tokens_saved) },
                { label: 'Efficiency', value: fmtPct(globalData.efficiency_pct) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: 'none', border: 'none',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              How the engine saves tokens
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  icon: Database, color: '#28CD41',
                  title: 'Prompt Cache',
                  body: 'Identical prompts (SHA-256 keyed) are served from memory with configurable TTL per agent type. Agent loops with side effects bypass the cache automatically.',
                },
                {
                  icon: TrendingDown, color: 'var(--accent)',
                  title: 'Prompt Compression',
                  body: 'When a conversation exceeds 12K tokens, middle messages are dropped oldest-first while preserving the system prompt and the latest user turn.',
                },
                {
                  icon: Zap, color: '#FF9F0A',
                  title: 'Dedup Guard',
                  body: 'The same prompt sent twice within 30 seconds returns the cached result, stopping runaway agents and UI double-submits from burning extra tokens.',
                },
              ].map(({ icon: Icon, color, title, body }) => (
                <div key={title} style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Icon size={15} strokeWidth={1.6} style={{ color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Breakdown */}
      {tab === 'breakdown' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>By Agent Type</h3>
            {(byAgent?.rows || []).map(r => (
              <BarRow key={r.agent_type} label={r.agent_type} value={r.total_tokens} max={maxAgentTokens} tokens={r.total_tokens} sub={`${r.calls} calls`} />
            ))}
          </GlassCard>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>By Model</h3>
            {(byModel?.rows || []).map(r => (
              <BarRow key={`${r.provider}/${r.model}`} label={r.model} value={r.total_tokens} max={maxModelTokens} tokens={r.total_tokens} sub={`${r.calls} calls`} />
            ))}
          </GlassCard>
        </motion.div>
      )}

      {/* Cache */}
      {tab === 'cache' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => evictMut.mutate()}
              disabled={evictMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
            >
              <Clock size={12} /> Evict Expired
            </button>
            <button
              onClick={() => clearCacheMut.mutate()}
              disabled={clearCacheMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(196,0,10,0.07)', border: '1px solid rgba(196,0,10,0.18)', color: '#C4000A', fontSize: 12, cursor: 'pointer' }}
            >
              <Trash2 size={12} /> Clear All
            </button>
          </div>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
              Cache Entries ({(cacheData?.entries || []).length})
            </h3>
            {(cacheData?.entries || []).length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No cache entries yet. Make some AI calls to populate the cache.</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, auto)', gap: 8, padding: '6px 14px', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Key</span><span>Hits</span><span>Tokens</span><span>Age</span><span>Status</span>
            </div>
            {(cacheData?.entries || []).map((e, i) => <CacheEntry key={e.key_prefix} entry={e} i={i} />)}
          </GlassCard>
        </motion.div>
      )}

      {/* Recent calls */}
      {tab === 'recent' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Recent Calls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px 80px 60px', gap: 10, padding: '6px 14px', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Time</span><span>Model / Agent</span><span style={{ textAlign: 'right' }}>Input</span><span style={{ textAlign: 'right' }}>Output</span><span style={{ textAlign: 'center' }}>Source</span>
            </div>
            {(recent?.calls || []).length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '0 14px' }}>No calls logged yet.</p>
            )}
            {(recent?.calls || []).map((c, i) => <RecentCall key={c.id} call={c} i={i} />)}
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
