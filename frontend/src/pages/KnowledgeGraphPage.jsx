import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitFork, ZoomIn, ZoomOut, Maximize, ChevronDown } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useProjects, useProjectGraph } from '../api/hooks';

const NODE_COLORS = {
  project:    '#0071E3',
  requirement:'#0891B2',
  blueprint:  '#28CD41',
  work_order: '#FF9F0A',
  test:       '#C4000A',
  feedback:   '#9333EA',
};

export default function KnowledgeGraphPage() {
  const { projectId: urlProjectId } = useParams();
  const [localProjectId, setLocalProjectId] = useState('');
  const projectId = urlProjectId || localProjectId;
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const nodesRef  = useRef([]);
  const edgesRef  = useRef([]);
  const dragRef   = useRef(null);
  const panRef    = useRef({ x: 0, y: 0, scale: 1 });
  const [tooltip, setTooltip] = useState(null);

  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const { data: graph } = useProjectGraph(projectId);

  useEffect(() => {
    if (!graph) { nodesRef.current = []; edgesRef.current = []; return; }
    const nodes = (graph.nodes || []).map((n, i) => ({
      ...n,
      x: 400 + Math.cos(i * 2.399) * (100 + i * 30),
      y: 300 + Math.sin(i * 2.399) * (100 + i * 30),
      vx: 0, vy: 0,
    }));
    nodesRef.current = nodes;
    edgesRef.current = graph.edges || [];
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      w = canvas.parentElement.clientWidth;
      h = canvas.parentElement.clientHeight;
      canvas.width  = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const simulate = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const alpha = 0.3;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (d * d);
          nodes[i].vx -= dx / d * force;
          nodes[i].vy -= dy / d * force;
          nodes[j].vx += dx / d * force;
          nodes[j].vy += dy / d * force;
        }
      }
      for (const e of edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - 120) * 0.01;
        src.vx += dx / d * force; src.vy += dy / d * force;
        tgt.vx -= dx / d * force; tgt.vy -= dy / d * force;
      }
      for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.001;
        n.vy += (h / 2 - n.y) * 0.001;
        n.vx *= 0.85; n.vy *= 0.85;
        if (dragRef.current?.id !== n.id) {
          n.x += n.vx * alpha;
          n.y += n.vy * alpha;
        }
      }
    };

    const draw = () => {
      if (document.hidden) { animRef.current = requestAnimationFrame(draw); return; }
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const { x: px, y: py, scale } = panRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);

      for (const e of edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) continue;
        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1; ctx.stroke();
        if (e.label) {
          ctx.fillStyle = 'var(--text-tertiary)';
          ctx.font = '10px -apple-system, Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(e.label, (src.x + tgt.x) / 2, (src.y + tgt.y) / 2 - 4);
        }
      }

      for (const n of nodes) {
        const color = NODE_COLORS[n.type] || '#0071E3';
        const r = n.type === 'project' ? 16 : 10;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = color + '10'; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + '25'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#1D1D1F';
        ctx.font = `${n.type === 'project' ? 12 : 11}px -apple-system, Inter, sans-serif`;
        ctx.textAlign = 'center';
        const label = (n.title || n.label || n.name || n.id || '');
        ctx.fillText(label.length > 20 ? label.slice(0, 18) + '…' : label, n.x, n.y + r + 14);
      }

      ctx.restore();
      simulate();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [graph]);

  // Wheel must be imperative with { passive: false } to call preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      panRef.current.scale = Math.max(0.2, Math.min(3, panRef.current.scale * factor));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [graph]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { x: px, y: py, scale } = panRef.current;
    const mx = (e.clientX - rect.left - px) / scale;
    const my = (e.clientY - rect.top - py) / scale;
    const node = nodesRef.current.find((n) => Math.hypot(n.x - mx, n.y - my) < (n.type === 'project' ? 20 : 14));
    if (node) dragRef.current = node;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { x: px, y: py, scale } = panRef.current;
    const mx = (e.clientX - rect.left - px) / scale;
    const my = (e.clientY - rect.top - py) / scale;
    if (dragRef.current) {
      dragRef.current.x = mx; dragRef.current.y = my;
      dragRef.current.vx = 0; dragRef.current.vy = 0;
      return;
    }
    const node = nodesRef.current.find((n) => Math.hypot(n.x - mx, n.y - my) < (n.type === 'project' ? 20 : 14));
    setTooltip(node ? { x: e.clientX, y: e.clientY, node } : null);
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const zoom = (dir) => { panRef.current.scale = Math.max(0.2, Math.min(3, panRef.current.scale * (dir === 'in' ? 1.2 : 0.8))); };
  const resetView = () => { panRef.current = { x: 0, y: 0, scale: 1 }; };

  const iconBtnStyle = {
    padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>Knowledge Graph</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Visual map of project entities</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!urlProjectId && (
            <div style={{ position: 'relative' }}>
              <select value={localProjectId} onChange={(e) => setLocalProjectId(e.target.value)} className="input-base" style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}>
                <option value="">Select project…</option>
                {projectList.map((p) => <option key={p.id || p.project_id} value={p.id || p.project_id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => zoom('out')} style={iconBtnStyle}><ZoomOut size={14} strokeWidth={1.5} /></button>
            <button onClick={() => zoom('in')}  style={iconBtnStyle}><ZoomIn  size={14} strokeWidth={1.5} /></button>
            <button onClick={resetView}          style={iconBtnStyle}><Maximize size={14} strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, borderRadius: 'var(--radius-card)', overflow: 'hidden', position: 'relative', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', minHeight: 400 }}>
        {!projectId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <EmptyState icon={GitFork} title="Select a project" description="Choose a project to visualize its knowledge graph." />
          </div>
        ) : !graph ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading graph…</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}

        <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', flexWrap: 'wrap', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        {tooltip && (
          <div style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 8, zIndex: 50, padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', pointerEvents: 'none' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{tooltip.node.label || tooltip.node.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{tooltip.node.type?.replace('_', ' ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
