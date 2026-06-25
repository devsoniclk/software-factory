import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, ZoomIn, ZoomOut, Maximize, ChevronDown, RefreshCw } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useProjects } from '../api/hooks';
import client from '../api/client';
import { useQuery } from '@tanstack/react-query';

function useERDiagram(projectId) {
  return useQuery({
    queryKey: ['er-diagram', projectId],
    queryFn: () => client.get(`/er-diagram/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

// Pastel palette for entity cards
const PALETTE = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

function getColor(idx) { return PALETTE[idx % PALETTE.length]; }

const CARD_WIDTH = 200;
const FIELD_HEIGHT = 26;
const HEADER_HEIGHT = 38;
const CARD_PADDING = 10;

function entityCardHeight(entity) {
  return HEADER_HEIGHT + entity.fields.length * FIELD_HEIGHT + CARD_PADDING;
}

export default function ERDiagramPage() {
  const [projectId, setProjectId] = useState('');
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: erData, isLoading, refetch } = useERDiagram(projectId);

  const canvasRef = useRef(null);
  const panRef = useRef({ x: 40, y: 40, scale: 1 });
  const posRef = useRef({});   // entity name → {x, y}
  const dragRef = useRef(null);
  const animRef = useRef(null);
  const [hoveredEntity, setHoveredEntity] = useState(null);

  // Assign positions when data arrives
  useEffect(() => {
    if (!erData?.entities) return;
    const entities = erData.entities;
    const cols = Math.ceil(Math.sqrt(entities.length)) || 1;
    const newPos = {};
    entities.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (!posRef.current[e.name]) {
        newPos[e.name] = { x: 60 + col * (CARD_WIDTH + 80), y: 60 + row * 220 };
      } else {
        newPos[e.name] = posRef.current[e.name];
      }
    });
    posRef.current = newPos;
  }, [erData]);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (document.hidden) { animRef.current = requestAnimationFrame(draw); return; }
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      const { x: px, y: py, scale } = panRef.current;
      const entities = erData?.entities || [];
      const relationships = erData?.relationships || [];

      ctx.clearRect(0, 0, w, h);

      // Subtle grid
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);

      const gridSize = 40;
      const startX = -px / scale;
      const startY = -py / scale;
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      for (let x = startX - (startX % gridSize); x < startX + w / scale; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + h / scale); ctx.stroke();
      }
      for (let y = startY - (startY % gridSize); y < startY + h / scale; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + w / scale, y); ctx.stroke();
      }

      // Draw relationship lines
      for (const rel of relationships) {
        const srcPos = posRef.current[rel.source];
        const tgtPos = posRef.current[rel.target];
        if (!srcPos || !tgtPos) continue;

        const srcEntity = entities.find((e) => e.name === rel.source);
        const tgtEntity = entities.find((e) => e.name === rel.target);
        const srcH = srcEntity ? entityCardHeight(srcEntity) : HEADER_HEIGHT;
        const tgtH = tgtEntity ? entityCardHeight(tgtEntity) : HEADER_HEIGHT;

        const sx = srcPos.x + CARD_WIDTH;
        const sy = srcPos.y + srcH / 2;
        const tx = tgtPos.x;
        const ty = tgtPos.y + tgtH / 2;

        const cx1 = sx + Math.abs(tx - sx) * 0.5;
        const cx2 = tx - Math.abs(tx - sx) * 0.5;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cx1, sy, cx2, ty, tx, ty);
        ctx.strokeStyle = 'rgba(99,102,241,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead at target
        const angle = Math.atan2(ty - sy, tx - sx);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - 10 * Math.cos(angle - 0.4), ty - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(tx - 10 * Math.cos(angle + 0.4), ty - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = 'rgba(99,102,241,0.5)';
        ctx.fill();

        // Cardinality label
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2 - 8;
        ctx.fillStyle = '#6366F1';
        ctx.font = 'bold 10px -apple-system, Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rel.cardinality || '', midX, midY);
      }

      // Draw entity cards
      entities.forEach((entity, idx) => {
        const pos = posRef.current[entity.name];
        if (!pos) return;
        const color = getColor(idx);
        const cardH = entityCardHeight(entity);
        const isHovered = hoveredEntity === entity.name;

        // Card shadow
        if (isHovered) {
          ctx.shadowColor = color + '44';
          ctx.shadowBlur = 16;
        }

        // Card background
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, CARD_WIDTH, cardH, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isHovered ? color : 'rgba(0,0,0,0.10)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Header
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, CARD_WIDTH, HEADER_HEIGHT, [10, 10, 0, 0]);
        ctx.fillStyle = color;
        ctx.fill();

        // Header icon + name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px -apple-system, Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(entity.name, pos.x + 12, pos.y + 24);

        // Fields
        entity.fields.forEach((field, fi) => {
          const fy = pos.y + HEADER_HEIGHT + fi * FIELD_HEIGHT;

          // Alternate row bg
          if (fi % 2 === 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.02)';
            ctx.fillRect(pos.x + 1, fy, CARD_WIDTH - 2, FIELD_HEIGHT);
          }

          // Divider
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x + 8, fy); ctx.lineTo(pos.x + CARD_WIDTH - 8, fy); ctx.stroke();

          // PK key icon
          if (field.pk) {
            ctx.fillStyle = '#F59E0B';
            ctx.font = '10px -apple-system';
            ctx.fillText('🔑', pos.x + 8, fy + 17);
          }

          // Field name
          ctx.fillStyle = '#1D1D1F';
          ctx.font = `${field.pk ? 600 : 400} 11px -apple-system, Inter, sans-serif`;
          ctx.textAlign = 'left';
          const fname = field.name.length > 14 ? field.name.slice(0, 13) + '…' : field.name;
          ctx.fillText(fname, pos.x + (field.pk ? 24 : 12), fy + 17);

          // Field type (right-aligned, muted)
          ctx.fillStyle = '#999';
          ctx.font = '10px -apple-system, Inter, monospace';
          ctx.textAlign = 'right';
          const ftype = field.type.length > 8 ? field.type.slice(0, 7) + '…' : field.type;
          ctx.fillText(ftype, pos.x + CARD_WIDTH - 8, fy + 17);
        });
      });

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [erData, hoveredEntity]);

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      panRef.current.scale = Math.max(0.3, Math.min(3, panRef.current.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [erData]);

  const hitTest = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: px, y: py, scale } = panRef.current;
    const mx = (clientX - rect.left - px) / scale;
    const my = (clientY - rect.top - py) / scale;
    const entities = erData?.entities || [];
    return entities.find((e) => {
      const pos = posRef.current[e.name];
      if (!pos) return false;
      const h = entityCardHeight(e);
      return mx >= pos.x && mx <= pos.x + CARD_WIDTH && my >= pos.y && my <= pos.y + h;
    }) || null;
  }, [erData]);

  const handleMouseDown = useCallback((e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const { x: px, y: py, scale } = panRef.current;
      const mx = (e.clientX - rect.left - px) / scale;
      const my = (e.clientY - rect.top - py) / scale;
      const pos = posRef.current[hit.name];
      dragRef.current = { name: hit.name, offsetX: mx - pos.x, offsetY: my - pos.y };
    } else {
      dragRef.current = { panning: true, startX: e.clientX - panRef.current.x, startY: e.clientY - panRef.current.y };
    }
  }, [hitTest]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { x: px, y: py, scale } = panRef.current;

    if (dragRef.current?.panning) {
      panRef.current.x = e.clientX - dragRef.current.startX;
      panRef.current.y = e.clientY - dragRef.current.startY;
      return;
    }
    if (dragRef.current?.name) {
      const mx = (e.clientX - rect.left - px) / scale;
      const my = (e.clientY - rect.top - py) / scale;
      posRef.current[dragRef.current.name] = {
        x: mx - dragRef.current.offsetX,
        y: my - dragRef.current.offsetY,
      };
      return;
    }
    const hit = hitTest(e.clientX, e.clientY);
    setHoveredEntity(hit?.name || null);
  }, [hitTest]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const zoom = (dir) => { panRef.current.scale = Math.max(0.3, Math.min(3, panRef.current.scale * (dir === 'in' ? 1.2 : 0.8))); };
  const resetView = () => { panRef.current = { x: 40, y: 40, scale: 1 }; };

  const iconBtnStyle = {
    padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)',
  };

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>ER Diagram</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Entity-relationship diagram generated from Blueprint DSL <code style={{ fontSize: 11, background: 'var(--color-bg-secondary)', padding: '1px 5px', borderRadius: 4 }}>## Model:</code> sections
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ padding: '7px 32px 7px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="">Select project…</option>
              {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          </div>
          {projectId && (
            <button onClick={() => refetch()} style={iconBtnStyle} title="Refresh">
              <RefreshCw size={14} strokeWidth={1.5} />
            </button>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => zoom('out')} style={iconBtnStyle}><ZoomOut size={14} strokeWidth={1.5} /></button>
            <button onClick={() => zoom('in')} style={iconBtnStyle}><ZoomIn size={14} strokeWidth={1.5} /></button>
            <button onClick={resetView} style={iconBtnStyle}><Maximize size={14} strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {erData && erData.entity_count > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Entities', value: erData.entity_count },
            { label: 'Relationships', value: erData.relationships?.length || 0 },
            { label: 'Blueprints', value: erData.blueprint_count || 1 },
          ].map(({ label, value }) => (
            <div key={label} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{value}</span> {label}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#f8f9fa', border: '1px solid var(--border)', minHeight: 400 }}>
        {!projectId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <EmptyState icon={Database} title="Select a project" description="Choose a project to view its entity-relationship diagram." />
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading diagram…</span>
          </div>
        ) : !erData || erData.entity_count === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <EmptyState
              icon={Database}
              title="No Model entities found"
              description={'Add ## Model: sections to a blueprint\'s DSL to generate an ER diagram.'}
            />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: dragRef.current?.panning ? 'grabbing' : 'default', display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}

        {/* Legend */}
        {erData?.entity_count > 0 && (
          <div style={{ position: 'absolute', bottom: 14, left: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)', fontSize: 11, color: '#666', display: 'flex', gap: 16 }}>
            <span>🔑 Primary Key</span>
            <span style={{ color: '#6366F1', borderBottom: '1.5px dashed #6366F1' }}>── Relationship</span>
            <span style={{ fontStyle: 'italic' }}>Drag entities · Scroll to zoom</span>
          </div>
        )}
      </div>
    </div>
  );
}
