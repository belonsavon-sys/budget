"use client";
import { useMemo } from "react";
import type { SavingsGoal } from "@/lib/types";

interface Props {
  goal: SavingsGoal;
  width?: number;
  height?: number;
}

export default function GoalForecast({ goal, width = 120, height = 40 }: Props) {
  const { points, eta, ratePerDay } = useMemo(() => {
    const { current, target, contributions } = goal;

    // Already reached
    if (current >= target) {
      return { points: [], eta: null, ratePerDay: 0 };
    }

    // Compute daily rate from contributions
    let ratePerDay = 0;
    if (contributions.length >= 2) {
      const sorted = [...contributions].sort((a, b) => +new Date(a.date) - +new Date(b.date));
      const firstDate = new Date(sorted[0].date).getTime();
      const lastDate = new Date(sorted[sorted.length - 1].date).getTime();
      const days = (lastDate - firstDate) / 86400000;
      const totalContrib = sorted.reduce((s, c) => s + c.amount, 0);
      ratePerDay = days > 0 ? totalContrib / days : 0;
    } else if (contributions.length === 1) {
      // Single contribution: assume monthly cadence → daily = amount / 30
      ratePerDay = contributions[0].amount / 30;
    }

    if (ratePerDay <= 0) {
      return { points: [], eta: null, ratePerDay: 0 };
    }

    // Project forward up to when target is reached or 365 days
    const daysToTarget = (target - current) / ratePerDay;
    const horizonDays = Math.min(daysToTarget, 365);
    const etaDays = Math.ceil(daysToTarget);

    // Build 10 sample points along the curve
    const pts: [number, number][] = [];
    for (let i = 0; i <= 9; i++) {
      const t = (i / 9) * horizonDays;
      const v = current + ratePerDay * t;
      pts.push([t, Math.min(v, target)]);
    }

    return { points: pts, eta: etaDays, ratePerDay };
  }, [goal]);

  if (goal.current >= goal.target) {
    return (
      <div className="text-xs text-[var(--positive)] font-medium mt-2">Goal reached!</div>
    );
  }

  if (ratePerDay <= 0 || points.length === 0) {
    return (
      <div className="text-xs text-[var(--ink-muted)] mt-2 italic">Set a recurring contribution to see forecast.</div>
    );
  }

  // Map points to SVG coordinates
  const pad = 2;
  const maxX = points[points.length - 1][0];
  const minY = goal.current;
  const maxY = goal.target;
  const rangeY = maxY - minY;

  const svgPts = points.map(([t, v]) => {
    const x = pad + ((t / maxX) * (width - pad * 2));
    const y = height - pad - ((v - minY) / rangeY) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const etaStr =
    eta === null
      ? null
      : eta <= 30
      ? `~${eta}d`
      : eta <= 365
      ? `~${Math.round(eta / 30)}mo`
      : `~${(eta / 365).toFixed(1)}yr`;

  return (
    <div className="mt-2 flex items-center gap-3">
      <svg width={width} height={height} className="flex-shrink-0">
        {/* Target line */}
        <line
          x1={pad}
          y1={pad}
          x2={width - pad}
          y2={pad}
          stroke="var(--accent)"
          strokeWidth={1}
          strokeDasharray="3 2"
          strokeOpacity={0.4}
        />
        {/* Forecast line */}
        <polyline
          points={svgPts.join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current dot */}
        <circle cx={svgPts[0].split(",")[0]} cy={svgPts[0].split(",")[1]} r={2.5} fill="var(--accent)" />
      </svg>
      {etaStr && (
        <div className="text-xs text-[var(--ink-muted)]">
          ETA <span className="font-medium text-[var(--ink)]">{etaStr}</span>
        </div>
      )}
    </div>
  );
}
