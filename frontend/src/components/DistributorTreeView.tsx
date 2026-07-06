'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Users, ChevronDown, ChevronRight, Loader2, User } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface TreeNode {
  id: string;
  member_id: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  downline_count: number;
  level: number;
}

export default function DistributorTreeView() {
  const [tree, setTree] = useState<{ distributor: TreeNode; downlines: TreeNode[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setTree(res.data);
        else setError(res.message || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>;
  if (!tree) return null;

  const renderNode = (node: TreeNode, isRoot: boolean = false) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.downline_count > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
            ${isRoot
              ? 'bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20'
              : 'bg-white border-border hover:border-primary/30'
            }
          `}
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
            ${isRoot ? 'bg-gradient-to-br from-primary to-purple-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}
          `}>
            {node.first_name?.charAt(0)}{node.last_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{node.first_name} {node.last_name}</p>
            <p className="text-xs text-text-muted font-mono">{node.member_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {node.is_active ? (
              <span className="badge-success text-[10px]">Payout On</span>
            ) : (
              <span className="badge-default text-[10px]">Payout Off</span>
            )}
            {hasChildren && (
              <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                {node.downline_count}
              </span>
            )}
            {hasChildren && (
              isExpanded ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />
            )}
          </div>
        </div>
        {isExpanded && tree.downlines.filter(d => d.level > 0).length > 0 && (
          <div className="ml-6 pl-4 border-l-2 border-border mt-2 space-y-2">
            {tree.downlines
              .filter(d => d.level > 0 || true)
              .map(d => renderNode(d, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <GitBranch size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">My MLM Tree</h2>
      </div>

      <div className="stat-card">
        <p className="text-xs text-text-muted mb-3">
          Click on nodes with downline members to expand their branch.
        </p>
        <div className="space-y-2">
          {renderNode(tree.distributor, true)}
          {tree.downlines.length > 0 && (
            <div className="ml-6 pl-4 border-l-2 border-border space-y-2 mt-2">
              {tree.downlines.map(d => renderNode(d, false))}
            </div>
          )}
        </div>
        {tree.downlines.length === 0 && (
          <div className="py-8 text-center text-text-muted flex flex-col items-center gap-2">
            <Users size={32} className="text-text-muted/50" />
            <p className="text-sm">No downline yet</p>
            <p className="text-xs">Share your referral link to build your team</p>
          </div>
        )}
      </div>
    </div>
  );
}
