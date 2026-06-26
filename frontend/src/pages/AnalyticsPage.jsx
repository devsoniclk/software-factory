import { useParams } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function AnalyticsPage() {
  const { projectId } = useParams();
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Project metrics and insights</p>
        </div>
      </div>
      {!projectId ? (
        <EmptyState icon={BarChart2} title="Select a project" description="Choose a project to view analytics." />
      ) : (
        <EmptyState icon={BarChart2} title="Analytics coming soon" description={`Metrics for project ${projectId} will appear here.`} />
      )}
    </div>
  );
}
