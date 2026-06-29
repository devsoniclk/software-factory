import { useParams } from 'react-router-dom';
import { useMindmap } from '../api/hooks';
import EmptyState from '../components/EmptyState';
import { Network } from 'lucide-react';

export default function MindmapPage() {
  const { projectId } = useParams();
  const { data: graph, isLoading } = useMindmap(projectId);

  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const TYPE_COLOR = { requirement: '#0071E3', blueprint: '#34C759', work_order: '#FF9500' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Mindmap</h1>
          <p className="page-subtitle">Interactive graph of requirement and blueprint links</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{nodes.length} nodes · {edges.length} edges</span>
      </div>
      {isLoading ? <div className="skeleton" style={{ height: 300, borderRadius: 8 }} /> :
        nodes.length === 0 ? <EmptyState icon={Network} title="No graph data" subtitle="Add requirements and blueprints to see the mindmap" /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {nodes.map(n => (
            <div key={n.id} style={{ background: `${TYPE_COLOR[n.type] || '#888'}18`, border: `1px solid ${TYPE_COLOR[n.type] || '#888'}40`, borderRadius: 20, padding: '6px 14px', fontSize: 12, color: TYPE_COLOR[n.type] || 'var(--text-secondary)' }}>
              {n.label}
            </div>
          ))}
        </div>
        )
      }
    </div>
  );
}
