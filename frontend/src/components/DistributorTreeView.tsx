'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Users, Loader2 } from 'lucide-react';
import { MLMTreeWrapper, TreeNode as MLMTreeNode } from './MLMTree';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ApiTreeNode {
  id: string;
  member_id: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  downline_count: number;
  level: number;
}

function convertApiNode(apiNode: ApiTreeNode, allNodes: Map<string, ApiTreeNode>): MLMTreeNode {
  const children: MLMTreeNode[] = [];
  allNodes.forEach(node => {
    if (node.id !== apiNode.id && node.level === apiNode.level + 1) {
      // Simple heuristic: if this node is one level deeper, it might be a child
      // In a real implementation, you'd have parent_id or similar
      // For now, we'll use level to build the tree
    }
  });
  
  return {
    id: apiNode.id,
    name: `${apiNode.first_name} ${apiNode.last_name}`.trim(),
    memberId: apiNode.member_id,
    username: apiNode.username,
    level: apiNode.level,
    isActive: apiNode.is_active,
    expanded: apiNode.downline_count > 0 ? false : undefined,
    children: children
  };
}

function buildTree(apiRoot: ApiTreeNode, allNodes: ApiTreeNode[]): MLMTreeNode {
  const nodesByLevel = new Map<number, ApiTreeNode[]>();
  allNodes.forEach(node => {
    if (!nodesByLevel.has(node.level)) nodesByLevel.set(node.level, []);
    nodesByLevel.get(node.level)!.push(node);
  });

  function buildNode(node: ApiTreeNode): MLMTreeNode {
    const childLevel = node.level + 1;
    const potentialChildren = nodesByLevel.get(childLevel) || [];
    
    // For a proper tree, we'd need parent references. 
    // As a visual approximation, distribute children under parents at next level
    const children: MLMTreeNode[] = potentialChildren.map(child => buildNode(child));
    
    return {
      id: node.id,
      name: `${node.first_name} ${node.last_name}`.trim(),
      memberId: node.member_id,
      username: node.username,
      level: node.level,
      isActive: node.is_active,
      expanded: node.downline_count > 0 ? false : undefined,
      children
    };
  }

  return buildNode(apiRoot);
}

export default function DistributorTreeView() {
  const [tree, setTree] = useState<MLMTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const { distributor, downlines } = res.data;
          const allNodes: ApiTreeNode[] = [distributor, ...downlines];
          
          // Build tree structure
          const nodesByLevel = new Map<number, ApiTreeNode[]>();
          allNodes.forEach(node => {
            if (!nodesByLevel.has(node.level)) nodesByLevel.set(node.level, []);
            nodesByLevel.get(node.level)!.push(node);
          });

          const nodeMap = new Map<string, MLMTreeNode>();

          function buildNode(apiNode: ApiTreeNode): MLMTreeNode {
            const childLevel = apiNode.level + 1;
            const potentialChildren = nodesByLevel.get(childLevel) || [];
            
            // For simplicity, assume all next-level nodes are children
            // In production you'd have explicit parent_id references
            const children = potentialChildren.map(child => buildNode(child));
            
            const node: MLMTreeNode = {
              id: apiNode.id,
              name: `${apiNode.first_name} ${apiNode.last_name}`.trim(),
              memberId: apiNode.member_id,
              username: apiNode.username,
              level: apiNode.level,
              isActive: apiNode.is_active,
              expanded: apiNode.downline_count > 0 ? false : undefined,
              children
            };
            nodeMap.set(apiNode.id, node);
            return node;
          }

          const rootNode = buildNode(distributor);
          setTree(rootNode);
        } else {
          setError(res.message || 'Failed to load tree');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const currentUserId = localStorage.getItem('member_user');
  let userId: string | undefined;
  if (currentUserId) {
    try { userId = JSON.parse(currentUserId).id; } catch {}
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>;
  if (!tree) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <GitBranch size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">My MLM Tree</h2>
      </div>

      <MLMTreeWrapper
        rootData={tree}
        currentUserId={userId}
        title="Your Network"
      />
    </div>
  );
}