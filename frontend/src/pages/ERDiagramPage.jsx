import { useParams } from 'react-router-dom';
import { Database } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function ERDiagramPage() {
  const { projectId } = useParams();
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ER Diagram</h1>
          <p className="page-subtitle">Entity-relationship diagram for the data model</p>
        </div>
      </div>
      {!projectId ? (
        <EmptyState icon={Database} title="Select a project" description="Choose a project to view its ER diagram." />
      ) : (
        <EmptyState icon={Database} title="ER Diagram coming soon" description={`Data model for project ${projectId} will render here.`} />
      )}
    </div>
  );
}
