"use client";
import type { CurvePoint } from "./types";

interface Props {
  width: number;
  height: number;
  past: CurvePoint[];
  future: CurvePoint[];
  gradientId?: string;
}

function buildLine(points: CurvePoint[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  return d;
}

function buildBand(points: CurvePoint[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].bandLoY}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].bandLoY}`;
  for (let i = points.length - 1; i >= 0; i--) d += ` L ${points[i].x} ${points[i].bandHiY}`;
  d += " Z";
  return d;
}

export default function Curve({ width, height, past, future, gradientId = "tm-line" }: Props) {
  const connector = past.length && future.length ? [past[past.length - 1], future[0]] : [];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {/* Confidence band */}
      {future.length > 1 && (
        <path d={buildBand(future)} fill="var(--accent)" opacity="0.14" />
      )}

      {/* Past line — solid */}
      {past.length > 1 && (
        <path
          d={buildLine(past)}
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Connector from last past to first future, dashed */}
      {connector.length === 2 && (
        <line
          x1={connector[0].x}
          y1={connector[0].y}
          x2={connector[1].x}
          y2={connector[1].y}
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeDasharray="4 4"
        />
      )}

      {/* Future line — dashed */}
      {future.length > 1 && (
        <path
          d={buildLine(future)}
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
