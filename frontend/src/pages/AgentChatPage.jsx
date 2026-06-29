import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgentChatHistory, useSendAgentChat } from '../api/hooks';
import { Send } from 'lucide-react';

export default function AgentChatPage() {
  const { projectId } = useParams();
  const { data: history = [], isLoading } = useAgentChatHistory(projectId);
  const send = useSendAgentChat(projectId);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    send.mutate({ question: input });
    setInput('');
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Chat</h1>
          <p className="page-subtitle">Persistent AI assistant with project context</p>
        </div>
        <span style={{ fontSize: 11, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>AI</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        {isLoading ? <div className="skeleton" style={{ height: 100, borderRadius: 8 }} /> :
          history.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 10 }}>
              <div style={{ maxWidth: '75%', background: m.role === 'user' ? 'var(--accent)' : 'var(--color-bg-secondary)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', borderRadius: 12, padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                {m.content}
              </div>
            </div>
          ))
        }
        {send.isPending && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--text-tertiary)' }}>Thinking…</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <input className="input-base" style={{ flex: 1 }} placeholder="Ask about this project…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} />
        <button className="btn-primary" onClick={handleSend} disabled={send.isPending || !input.trim()}><Send size={14} /></button>
      </div>
    </div>
  );
}
