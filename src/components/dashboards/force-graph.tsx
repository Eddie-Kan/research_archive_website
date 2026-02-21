'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import { TYPE_HEX_COLORS, TYPE_PATH_MAP } from '@/lib/entity-types';
import type { GraphData, GraphNode, GraphEdge } from '@/domain/types';
import * as d3 from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3ZoomBehavior } from 'd3-zoom';
import type { D3DragEvent } from 'd3-drag';
import { drag as d3Drag } from 'd3-drag';

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimEdge {
  source: SimNode | string;
  target: SimNode | string;
  type: string;
  weight: number;
}


export function ForceGraph({ data, width = 800, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const { locale, localize, t } = useI18n();

  const getNodeLabel = useCallback(
    (node: GraphNode) => {
      const { text } = localize({ en: node.title_en, 'zh-Hans': node.title_zh });
      return text.length > 20 ? text.slice(0, 18) + '...' : text;
    },
    [localize]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.nodes.length === 0) return;

    const svgSel = select(svg);
    svgSel.selectAll('*').remove();

    // Create simulation nodes and edges
    const simNodes: SimNode[] = data.nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    const simEdges: SimEdge[] = data.edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight,
      }));

    // Set up simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimEdge>(simEdges)
          .id(d => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Container group for zoom/pan
    const g = svgSel.append('g');

    // Zoom behavior
    const zoomBehavior = d3ZoomBehavior<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svgSel.call(zoomBehavior as any);

    // Draw edges
    const edgeGroup = g
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', (d) => Math.max(1, d.weight))
      .attr('stroke-opacity', 0.5);

    // Edge labels
    const edgeLabelGroup = g
      .append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(simEdges)
      .join('text')
      .text(d => d.type.replace(/_/g, ' '))
      .attr('font-size', '8px')
      .attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle')
      .attr('dy', -4);

    // Draw nodes
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        const typePath = TYPE_PATH_MAP[d.type] || 'projects';
        router.push(`/${locale}/${typePath}/${d.id}`);
      });

    // Node circles
    nodeGroup
      .append('circle')
      .attr('r', 10)
      .attr('fill', d => TYPE_HEX_COLORS[d.type] || '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    nodeGroup
      .append('text')
      .text(d => getNodeLabel(d))
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .attr('dx', 14)
      .attr('dy', 4);

    // Drag behavior
    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on('start', (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(dragBehavior as any);

    // Tick handler
    simulation.on('tick', () => {
      edgeGroup
        .attr('x1', d => (d.source as SimNode).x)
        .attr('y1', d => (d.source as SimNode).y)
        .attr('x2', d => (d.target as SimNode).x)
        .attr('y2', d => (d.target as SimNode).y);

      edgeLabelGroup
        .attr('x', d => ((d.source as SimNode).x + (d.target as SimNode).x) / 2)
        .attr('y', d => ((d.source as SimNode).y + (d.target as SimNode).y) / 2);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, width, height, locale, router, getNodeLabel]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-sm text-gray-400">
        {t('dashboards.noData')}
      </div>
    );
  }

  // Legend
  const usedTypes = [...new Set(data.nodes.map(n => n.type))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {usedTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: TYPE_HEX_COLORS[type] || '#6b7280' }}
            />
            <span>{t(`entity.${snakeToCamel(type)}`)}</span>
          </div>
        ))}
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-surface-0"
      />
    </div>
  );
}
