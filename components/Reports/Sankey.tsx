"use client";
import { useState } from "react";

export interface SankeyNode {
  id: string;
  label: string;
  value: number;
  column: 0 | 1 | 2; // 0=income sources, 1=hub, 2=expense categories
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface Props {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

const COL_X = [60, 280, 500]; // center x for each column
const NODE_WIDTH = 12;
const NODE_GAP = 8;
const SVG_H = 280;
const SVG_W = 580;

function layoutNodes(nodes: SankeyNode[], totalH: number) {
  const byCol: Record<number, SankeyNode[]> = { 0: [], 1: [], 2: [] };
  for (const n of nodes) byCol[n.column].push(n);

  const positions: Record<string, { y: number; h: number; x: number }> = {};

  for (const col of [0, 1, 2] as const) {
    const colNodes = byCol[col];
    if (!colNodes.length) continue;
    const totalVal = colNodes.reduce((s, n) => s + n.value, 0);
    const usableH = totalH - NODE_GAP * (colNodes.length - 1);
    let yOffset = 0;
    for (const n of colNodes) {
      const h = totalVal > 0 ? (n.value / totalVal) * usableH : usableH / colNodes.length;
      positions[n.id] = { y: yOffset, h: Math.max(h, 4), x: COL_X[col] };
      yOffset += h + NODE_GAP;
    }
  }
  return positions;
}

export default function Sankey({ nodes, links }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!nodes.length || !links.length) {
    return (
      <div className="glass p-6 text-center text-sm text-[var(--ink-muted)]">
        No transaction data for this period.
      </div>
    );
  }

  const positions = layoutNodes(nodes, SVG_H - 20);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Track how much of each node's height is consumed by links (for stacking)
  const srcOffset: Record<string, number> = {};
  const tgtOffset: Record<string, number> = {};

  // Sort links by value desc for better layout
  const sortedLinks = [...links].sort((a, b) => b.value - a.value);

  const linkPaths = sortedLinks.map((lk) => {
    const src = positions[lk.source];
    const tgt = positions[lk.target];
    const srcNode = nodeMap.get(lk.source);
    const tgtNode = nodeMap.get(lk.target);
    if (!src || !tgt || !srcNode || !tgtNode) return null;

    const srcTotal = nodes.find((n) => n.id === lk.source)?.value ?? 1;
    const tgtTotal = nodes.find((n) => n.id === lk.target)?.value ?? 1;

    const srcH = src.h;
    const tgtH = tgt.h;

    const srcYOffset = srcOffset[lk.source] ?? 0;
    const tgtYOffset = tgtOffset[lk.target] ?? 0;

    const lkSrcH = (lk.value / srcTotal) * srcH;
    const lkTgtH = (lk.value / tgtTotal) * tgtH;
    const strokeW = Math.max(lkSrcH, 1);

    srcOffset[lk.source] = srcYOffset + lkSrcH;
    tgtOffset[lk.target] = tgtYOffset + lkTgtH;

    const x1 = src.x + NODE_WIDTH / 2;
    const y1 = src.y + srcYOffset + lkSrcH / 2 + 10;
    const x2 = tgt.x - NODE_WIDTH / 2;
    const y2 = tgt.y + tgtYOffset + lkTgtH / 2 + 10;
    const cx = (x1 + x2) / 2;

    const linkId = `${lk.source}-${lk.target}`;
    const isHov = hovered === linkId;

    return (
      <path
        key={linkId}
        d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
        fill="none"
        stroke={srcNode.color}
        strokeWidth={strokeW}
        strokeOpacity={isHov ? 0.85 : 0.35}
        onMouseEnter={() => setHovered(linkId)}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: "pointer", transition: "stroke-opacity 0.15s" }}
      >
        <title>{srcNode.label} → {tgtNode.label}: {lk.value.toFixed(2)}</title>
      </path>
    );
  });

  const nodeRects = nodes.map((n) => {
    const pos = positions[n.id];
    if (!pos) return null;
    return (
      <g key={n.id}>
        <rect
          x={pos.x - NODE_WIDTH / 2}
          y={pos.y + 10}
          width={NODE_WIDTH}
          height={pos.h}
          rx={NODE_WIDTH / 2}
          fill={n.color}
          fillOpacity={0.9}
        />
        <text
          x={n.column === 1 ? pos.x : n.column === 0 ? pos.x - NODE_WIDTH : pos.x + NODE_WIDTH}
          y={pos.y + pos.h / 2 + 10 + 4}
          textAnchor={n.column === 0 ? "end" : n.column === 2 ? "start" : "middle"}
          fontSize={11}
          fill="currentColor"
          fillOpacity={0.8}
        >
          {n.label}
        </text>
      </g>
    );
  });

  return (
    <div className="glass p-4">
      <div className="text-sm font-medium mb-3">Money flow</div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W}
          height={SVG_H}
          className="w-full max-w-full"
          style={{ minWidth: 320 }}
        >
          {linkPaths}
          {nodeRects}
          {/* Column labels */}
          <text x={COL_X[0]} y={6} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.5}>Income</text>
          <text x={COL_X[1]} y={6} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.5}>Total</text>
          <text x={COL_X[2]} y={6} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.5}>Expenses</text>
        </svg>
      </div>
    </div>
  );
}
