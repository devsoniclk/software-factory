import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useArtifacts, useDeleteArtifact } from '../api/hooks';
import client from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/EmptyState';
import { Paperclip, Trash2 } from 'lucide-react';

export default function ArtifactsPage() {
  const { projectId } = useParams();
  const { data: artifacts = [], isLoading } = useArtifacts(projectId);
  const deleteArtifact = useDeleteArtifact(projectId);
  const fileRef = useRef();
  const qc = useQueryClient();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await client.post(`/artifacts/project/${projectId}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    qc.invalidateQueries(['artifacts', projectId]);
    fileRef.current.value = '';
  };

  const fmt = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Artifacts</h1>
          <p className="page-subtitle">Uploaded files used as agent context (notes, mockups, legacy docs)</p>
        </div>
        <button className="btn-primary" onClick={() => fileRef.current?.click()}>Upload File</button>
        <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleUpload} />
      </div>
      {isLoading ? <div className="skeleton" style={{ height: 120, borderRadius: 8 }} /> :
        artifacts.length === 0 ? <EmptyState icon={Paperclip} title="No artifacts" subtitle="Upload notes, mockups, or legacy docs to inject into AI context" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {artifacts.map(a => (
            <div key={a.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.filename}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{fmt(a.size_bytes)} · {a.content_type}</div>
                {a.text_content && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{a.text_content.slice(0, 100)}…</div>}
              </div>
              <button className="btn-ghost" style={{ color: 'var(--text-tertiary)' }} onClick={() => deleteArtifact.mutate(a.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
