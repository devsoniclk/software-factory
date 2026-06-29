import { useParams } from 'react-router-dom';
import { useFeedbackThemes, useGroomThemes, useDeleteFeedbackTheme } from '../api/hooks';
import EmptyState from '../components/EmptyState';
import { Tags } from 'lucide-react';

export default function FeedbackThemesPage() {
  const { projectId } = useParams();
  const { data: themes = [], isLoading } = useFeedbackThemes(projectId);
  const groom = useGroomThemes(projectId);
  const deleteTheme = useDeleteFeedbackTheme(projectId);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback Themes</h1>
          <p className="page-subtitle">AI-grouped clusters of related feedback items</p>
        </div>
        <button className="btn-ai" onClick={() => groom.mutate()} disabled={groom.isPending}>
          {groom.isPending ? 'Grooming…' : '✦ Groom Themes'}
        </button>
      </div>
      {isLoading ? <div className="skeleton" style={{ height: 150, borderRadius: 8 }} /> :
        themes.length === 0 ? <EmptyState icon={Tags} title="No themes" subtitle='Click "Groom Themes" to let AI cluster your feedback' /> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {themes.map(t => (
            <div key={t.id} style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${t.color}40`, borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  {t.ai_generated && <span style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>AI</span>}
                </div>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => deleteTheme.mutate(t.id)}>Remove</button>
              </div>
              {t.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.description}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{JSON.parse(t.feedback_ids_json || '[]').length} items</p>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
