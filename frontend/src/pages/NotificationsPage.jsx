import { useParams } from 'react-router-dom';
import { useNotifications, useMarkNotifRead, useMarkAllRead } from '../api/hooks';
import EmptyState from '../components/EmptyState';
import { Bell } from 'lucide-react';

const TYPE_COLOR = { info: '#0071E3', success: '#34C759', warning: '#FF9500', error: '#FF3B30', flag: '#FF6B6B', feedback: '#AF52DE', hook: '#5AC8FA' };

export default function NotificationsPage() {
  const { projectId } = useParams();
  const { data: notifs = [], isLoading } = useNotifications(projectId);
  const markRead = useMarkNotifRead(projectId);
  const markAll = useMarkAllRead(projectId);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Hook results, flags raised, feedback arrived</p>
        </div>
        {notifs.some(n => !n.read) && <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => markAll.mutate()}>Mark all read</button>}
      </div>
      {isLoading ? <div className="skeleton" style={{ height: 150, borderRadius: 8 }} /> :
        notifs.length === 0 ? <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifs.map(n => (
            <div key={n.id} onClick={() => { if (!n.read) markRead.mutate(n.id); }} style={{ background: n.read ? 'var(--color-bg-secondary)' : 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, cursor: n.read ? 'default' : 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[n.notification_type] || '#ccc', flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{n.created_at?.slice(0, 16)}</div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
