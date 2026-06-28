import { useParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function TraceabilityPage() {
  const { projectId } = useParams();
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Traceability</h1>
          <p className="page-subtitle">Requirements to tests coverage matrix</p>
        </div>
      </div>
      {!projectId ? (
        <EmptyState icon={Link2} title="Select a project" description="Choose a project to view traceability matrix." />
      ) : (
        <EmptyState icon={Link2} title="Traceability coming soon" description={`Coverage matrix for project ${projectId} will appear here.`} />
      )}
    </div>
  );
}
