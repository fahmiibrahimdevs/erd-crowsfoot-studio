import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

export function getAutoLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 60,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    // Estimate node height based on column count or measured height
    const colsCount = (node.data as any)?.table?.columns?.length || 5;
    const height = Math.max(160, 90 + colsCount * 36);
    const width = 280;

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const colsCount = (node.data as any)?.table?.columns?.length || 5;
    const height = Math.max(160, 90 + colsCount * 36);
    const width = 280;

    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes as Node[], edges };
}
