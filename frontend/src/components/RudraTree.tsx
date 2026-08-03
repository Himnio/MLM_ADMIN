'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Users, ExternalLink, Copy, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export interface TreeNode {
  id: string;
  name: string;
  memberId: string;
  username: string;
  level: number;
  isActive: boolean;
  expanded?: boolean;
  children: TreeNode[];
}

const NODE_W = 160;
const NODE_H = 56;
const LEVEL_GAP = 100;
const SIBLING_GAP = 16;
const PADDING = 60;

interface Viewport { x: number; y: number; scale: number; }

function buildCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1 + NODE_H / 2} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - NODE_H / 2}`;
}

function collectVisible(root: TreeNode): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(n: TreeNode) { result.push(n); if (n.expanded === true && n.children.length > 0) n.children.forEach(walk); }
  walk(root);
  return result;
}

function collectLinks(root: TreeNode): Array<{ source: TreeNode; target: TreeNode }> {
  const links: Array<{ source: TreeNode; target: TreeNode }> = [];
  function walk(n: TreeNode) {
    if (n.expanded === true && n.children.length > 0) {
      n.children.forEach(c => { links.push({ source: n, target: c }); walk(c); });
    }
  }
  walk(root);
  return links;
}

function calcLayout(root: TreeNode): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const subtreeWidths = new Map<string, number>();

  function calcWidth(n: TreeNode): number {
    if (n.expanded !== true || n.children.length === 0) { subtreeWidths.set(n.id, NODE_W); return NODE_W; }
    const totalW = n.children.reduce((s, c) => s + calcWidth(c), 0) + (n.children.length - 1) * SIBLING_GAP;
    subtreeWidths.set(n.id, Math.max(totalW, NODE_W));
    return subtreeWidths.get(n.id)!;
  }

  function place(n: TreeNode, x: number, y: number) {
    positions.set(n.id, { x, y });
    if (n.expanded === true && n.children.length > 0) {
      const kidsW = n.children.reduce((s, c) => s + subtreeWidths.get(c.id)!, 0) + (n.children.length - 1) * SIBLING_GAP;
      let cx = x - kidsW / 2;
      n.children.forEach(c => {
        const cw = subtreeWidths.get(c.id)!;
        place(c, cx + cw / 2, y + NODE_H + LEVEL_GAP);
        cx += cw + SIBLING_GAP;
      });
    }
  }

  calcWidth(root);
  place(root, 0, -PADDING);
  return positions;
}

export function RudraTree({
  rootNode,
  currentUserId,
  onNodeClick
}: {
  rootNode: TreeNode;
  currentUserId?: string;
  onNodeClick?: (node: TreeNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const dragRef = useRef({ startX: 0, startY: 0, startVpX: 0, startVpY: 0 });
  const hasMoved = useRef(false);

  const [tree, setTree] = useState<TreeNode>(rootNode);
  useEffect(() => { setTree(rootNode); }, [rootNode]);

  const visibleNodes = useMemo(() => collectVisible(tree), [tree]);
  const links = useMemo(() => collectLinks(tree), [tree]);
  const positions = useMemo(() => calcLayout(tree), [tree]);

  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    visibleNodes.forEach(n => {
      const p = positions.get(n.id);
      if (p) { minX = Math.min(minX, p.x - NODE_W / 2); maxX = Math.max(maxX, p.x + NODE_W / 2); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + NODE_H); }
    });
    return { minX, maxX, minY, maxY, valid: minX !== Infinity };
  }, [visibleNodes, positions]);

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el || !bounds.valid) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const bw = bounds.maxX - bounds.minX + PADDING * 2;
    const bh = bounds.maxY - bounds.minY + PADDING * 2;
    const s = Math.min(cw / bw, ch / bh, 1.4) * 0.9;
    setViewport({ x: cw / 2 - ((bounds.minX + bounds.maxX) / 2) * s, y: ch / 2 - ((bounds.minY + bounds.maxY) / 2) * s, scale: Math.max(0.2, Math.min(2, s)) });
  }, [bounds]);

  useEffect(() => { fitToScreen(); }, [fitToScreen]);

  const toggleNode = useCallback((nodeId: string) => {
    setAnimatingIds(prev => new Set(prev).add(nodeId));
    setTimeout(() => setAnimatingIds(prev => { const n = new Set(prev); n.delete(nodeId); return n; }), 350);
    setTree(prev => {
      function toggle(n: TreeNode): TreeNode {
        if (n.id === nodeId) return { ...n, expanded: !n.expanded };
        if (n.expanded === true && n.children.length > 0) return { ...n, children: n.children.map(toggle) };
        return n;
      }
      return toggle(structuredClone(prev));
    });
  }, []);

  const handleNodeClick = useCallback((node: TreeNode) => {
    if (hasMoved.current) return;
    if (node.children.length === 0 && node.expanded === undefined) return;
    toggleNode(node.id);
    onNodeClick?.(node);
  }, [toggleNode, onNodeClick]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startVpX: viewport.x, startVpY: viewport.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewport]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    setViewport({ ...viewport, x: dragRef.current.startVpX + dx, y: dragRef.current.startVpY + dy });
  }, [isDragging, viewport]);

  const handlePointerUp = useCallback(() => { setIsDragging(false); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.12;
    setViewport(prev => {
      const ns = Math.max(0.15, Math.min(3, prev.scale * factor));
      return { x: mx - (mx - prev.x) * (ns / prev.scale), y: my - (my - prev.y) * (ns / prev.scale), scale: ns };
    });
  }, []);

  const isMe = (id: string) => id === currentUserId;

  const vpStr = `translate(${viewport.x.toFixed(1)}px, ${viewport.y.toFixed(1)}px) scale(${viewport.scale.toFixed(3)})`;
  const dragStyle = isDragging ? 'grabbing' : hasMoved.current ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] sm:h-[600px] bg-surface rounded-2xl overflow-hidden border border-border"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none', cursor: dragStyle }}
    >
      <svg className="w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <g
          transform={`translate(${viewport.x.toFixed(1)}, ${viewport.y.toFixed(1)}) scale(${viewport.scale.toFixed(3)})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.2s ease-out', pointerEvents: 'all' }}
        >
          {/* Links */}
          {links.map(link => {
            const sp = positions.get(link.source.id), tp = positions.get(link.target.id);
            if (!sp || !tp) return null;
            return (
              <path
                key={`link-${link.target.id}`}
                d={buildCurvedPath(sp.x, sp.y, tp.x, tp.y)}
                fill="none"
                stroke={link.target.isActive ? 'var(--primary)' : 'var(--border-secondary)'}
                strokeWidth={link.target.isActive ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Nodes */}
          {visibleNodes.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const root = node.level === 0;
            const me = isMe(node.id);
            const canExpand = node.children.length > 0;
            const expanded = node.expanded === true;
            const anim = animatingIds.has(node.id);

            const bg = me ? 'var(--success-light)' : node.isActive ? 'var(--primary-light)' : 'var(--bg-card)';
            const stroke = me ? 'var(--success)' : node.isActive ? 'var(--primary)' : 'var(--border-primary)';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ transition: anim ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}
              >
                <g style={{ cursor: canExpand ? 'pointer' : 'default' }} onClick={() => handleNodeClick(node)}>
                  <rect
                    x={-NODE_W / 2} y={0} width={NODE_W} height={NODE_H} rx={10} ry={10}
                    fill={bg} stroke={stroke} strokeWidth={root || me ? 2 : 1.5}
                    filter="drop-shadow(0 2px 3px rgba(0,0,0,0.08))"
                  />
                  {(node.isActive || me) && (
                    <line x1={-NODE_W / 2 + 4} y1={0} x2={NODE_W / 2 - 4} y2={0} stroke={me ? 'var(--success)' : 'var(--primary)'} strokeWidth={3} strokeLinecap="round" />
                  )}
                  <text x={0} y={22} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize={root ? 13 : 11} fontWeight={root || me ? '700' : '600'} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {node.name.length > (root ? 14 : 12) ? node.name.substring(0, root ? 14 : 12) + '…' : node.name}
                  </text>
                  <text x={0} y={38} textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize={9} fontWeight="500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {node.memberId.length > 14 ? node.memberId.substring(0, 13) + '…' : node.memberId}
                  </text>
                  {canExpand && (
                    <g transform={`translate(${NODE_W / 2 + 10}, ${NODE_H / 2})`}>
                      <circle r={10} fill={expanded ? 'var(--primary)' : 'var(--bg-card)'} stroke="var(--border-primary)" strokeWidth={1.5} />
                      <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fill={expanded ? '#fff' : 'var(--text-muted)'} fontSize={13} fontWeight="bold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {expanded ? '−' : '+'}
                      </text>
                    </g>
                  )}
                  {me && (
                    <g transform="translate(0, -12)">
                      <rect x={-16} y={-16} width={32} height={16} rx={4} fill="var(--success)" />
                      <text x={0} y={-5} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={8} fontWeight="700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>YOU</text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}

          {/* Tooltip label for root count */}
          {visibleNodes.length > 1 && (() => {
            const p = positions.get(tree.id);
            if (!p) return null;
            return (
              <g transform={`translate(${p.x}, ${p.y + NODE_H + 12})`}>
                <rect x={-20} y={-9} width={40} height={18} rx={9} fill="var(--primary)" opacity={0.9} />
                <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} fontWeight="700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{visibleNodes.length - 1} ↓</text>
              </g>
            );
          })()}
        </g>
      </svg>

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <button onClick={() => setViewport(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.3) }))}
          className="p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-surface-hover transition-colors" title="Zoom In">
          <ZoomIn size={16} className="text-text-secondary" />
        </button>
        <button onClick={() => setViewport(prev => ({ ...prev, scale: Math.max(0.15, prev.scale * 0.7) }))}
          className="p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-surface-hover transition-colors" title="Zoom Out">
          <ZoomOut size={16} className="text-text-secondary" />
        </button>
        <button onClick={fitToScreen}
          className="p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-surface-hover transition-colors" title="Fit to Screen">
          <Maximize2 size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Info bar */}
      <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-text-muted border border-border z-10">
        {visibleNodes.length} node{visibleNodes.length !== 1 ? 's' : ''} · Drag to pan · Scroll to zoom · Click node to expand
      </div>
    </div>
  );
}

export function RudraTreeWrapper({
  rootData,
  currentUserId,
  onNodeClick,
  title = 'Rudra Tree'
}: {
  rootData: TreeNode;
  currentUserId?: string;
  onNodeClick?: (node: TreeNode) => void;
  title?: string;
}) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h3 className="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
          <Users size={18} className="text-primary" />
          {title}
        </h3>
        {selectedNode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/20 animate-slide-down text-sm">
            <span className="font-medium text-text-primary truncate max-w-[120px]">{selectedNode.name}</span>
            <span className="text-text-muted font-mono text-xs">{selectedNode.memberId}</span>
            <span className={selectedNode.isActive ? 'badge-success' : 'badge-danger'}>
              {selectedNode.isActive ? 'Active' : 'Inactive'}
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register?ref=${selectedNode.username}`)}
                className="p-1 hover:bg-surface-hover rounded transition-colors" title="Copy referral link">
                <Copy size={12} />
              </button>
              <a href={`/register?ref=${selectedNode.username}`} target="_blank" rel="noopener noreferrer"
                className="p-1 hover:bg-surface-hover rounded transition-colors" title="Open referral link">
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      <RudraTree
        rootNode={rootData}
        currentUserId={currentUserId}
        onNodeClick={(node) => {
          setSelectedNode(prev => prev?.id === node.id ? null : node);
          onNodeClick?.(node);
        }}
      />
    </div>
  );
}
