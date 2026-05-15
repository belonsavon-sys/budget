"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Curve from "./Curve";
import Scrubber from "./Scrubber";
import ScenarioChip from "./ScenarioChip";
import PeriodToggle from "./PeriodToggle";
import MoneyNumber from "@/components/Money/Number";
import type { TimeMachineProps, CurvePoint } from "./types";
import type { ProjectionPoint } from "@/lib/projection-types";

const PADDING = { top: 30, right: 18, bottom: 22, left: 18 };

function computeYRange(points: ProjectionPoint[]) {
  if (points.length === 0) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    min = Math.min(min, p.bandLo, p.value);
    max = Math.max(max, p.bandHi, p.value);
  }
  if (min === max) {
    // Flat line — pad either side
    const pad = Math.max(100, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  } else {
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
  }
  return { min, max };
}

function formatPeriodLabel(dateIso: string): string {
  // Yields e.g. "Sep '26"
  const d = new Date(dateIso);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mo = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${mo} '${yy}`;
}

export default function TimeMachine(props: TimeMachineProps) {
  const {
    snapshot,
    currency,
    horizon,
    onHorizonChange,
    scenarios = [],
    onScenarioDrop,
    onScenarioClick,
    expanded = false,
  } = props;
  const height = props.height ?? 280;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrubX, setScrubX] = useState<number | null>(null);

  // Track container width
  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(0, Math.floor(w)));
    });
    ro.observe(el);
    // Initial measure
    setWidth(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);

  const { past, future, valueAtScrub, nowX, plotWidth, plotHeight } = useMemo(() => {
    const w = width;
    const h = height;
    const plotW = Math.max(0, w - PADDING.left - PADDING.right);
    const plotH = Math.max(0, h - PADDING.top - PADDING.bottom);
    if (snapshot.points.length === 0 || plotW === 0) {
      return {
        past: [] as CurvePoint[],
        future: [] as CurvePoint[],
        valueAtScrub: snapshot.baseline,
        nowX: PADDING.left,
        plotWidth: plotW,
        plotHeight: plotH,
      };
    }

    const lastIdx = snapshot.points.length - 1;
    const xForIdx = (i: number) => PADDING.left + (i / lastIdx) * plotW;

    const yRange = computeYRange(snapshot.points);
    const yForValue = (v: number) => {
      if (yRange.max === yRange.min) return PADDING.top + plotH / 2;
      return PADDING.top + ((yRange.max - v) / (yRange.max - yRange.min)) * plotH;
    };

    const curve: CurvePoint[] = snapshot.points.map((p, i) => ({
      ...p,
      x: xForIdx(i),
      y: yForValue(p.value),
      bandLoY: yForValue(p.bandLo),
      bandHiY: yForValue(p.bandHi),
      isPast: p.date <= snapshot.nowDate,
    }));

    const pastArr = curve.filter((c) => c.isPast);
    const futureArr = curve.filter((c) => !c.isPast);

    // Compute now-X: position of the first non-past point's x, or last past's x
    let nx = PADDING.left + plotW * 0.5;
    if (pastArr.length > 0) nx = pastArr[pastArr.length - 1].x;
    if (futureArr.length > 0 && pastArr.length === 0) nx = futureArr[0].x;

    // Value at scrub: nearest curve point to scrubX, or baseline if no scrub
    let valScrub = snapshot.baseline;
    if (scrubX !== null) {
      let bestDist = Infinity;
      let bestVal = snapshot.baseline;
      for (const c of curve) {
        const d = Math.abs(c.x - scrubX);
        if (d < bestDist) {
          bestDist = d;
          bestVal = c.value;
        }
      }
      valScrub = bestVal;
    }

    return {
      past: pastArr,
      future: futureArr,
      valueAtScrub: valScrub,
      nowX: nx,
      plotWidth: plotW,
      plotHeight: plotH,
    };
  }, [snapshot, width, height, scrubX]);

  // Reset scrubX when the projection changes meaningfully
  useEffect(() => {
    setScrubX(null);
  }, [snapshot.nowDate, snapshot.horizon]);

  // Position scenario chips at their startDate's X
  const chipPositions = useMemo(() => {
    if (!future.length) return [] as Array<{ scenario: typeof scenarios[number]; x: number; y: number }>;
    const lastIdx = snapshot.points.length - 1;
    const xForIdx = (i: number) =>
      PADDING.left + (i / lastIdx) * (width - PADDING.left - PADDING.right);

    return scenarios
      .map((s) => {
        // Find the first projection point on or after s.startDate
        const idx = snapshot.points.findIndex((p) => p.date >= s.startDate);
        if (idx < 0) return null;
        const x = xForIdx(idx);
        const cp = past[past.length - 1] ?? future[0];
        // place above the curve roughly
        const y = (cp?.y ?? PADDING.top) - 6;
        return { scenario: s, x, y };
      })
      .filter((v): v is { scenario: typeof scenarios[number]; x: number; y: number } => v !== null);
  }, [scenarios, snapshot.points, past, future, width]);

  // Drop-zone handlers (covers the future region only)
  const futureZoneLeft = nowX;
  const futureZoneWidth = Math.max(0, width - PADDING.right - futureZoneLeft);

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-scenario-template")) {
      e.preventDefault();
    }
  }
  function handleDrop(e: React.DragEvent) {
    const templateId = e.dataTransfer.getData("application/x-scenario-template");
    if (!templateId || !onScenarioDrop) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropX = e.clientX - rect.left + futureZoneLeft;
    // Convert dropX → date index → ISO date
    const lastIdx = snapshot.points.length - 1;
    const xForIdx = (i: number) =>
      PADDING.left + (i / lastIdx) * (width - PADDING.left - PADDING.right);
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < snapshot.points.length; i++) {
      const d = Math.abs(xForIdx(i) - dropX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const dateIso = snapshot.points[bestIdx]?.date ?? snapshot.nowDate;
    onScenarioDrop(templateId, dateIso);
  }

  const displayValue = scrubX !== null ? valueAtScrub : snapshot.finalValue;
  const periodLabel = scrubX !== null
    ? formatPeriodLabel(
        snapshot.points[
          // find nearest point index to scrubX in pixel
          Math.max(
            0,
            Math.min(
              snapshot.points.length - 1,
              Math.round(((scrubX - PADDING.left) / Math.max(1, width - PADDING.left - PADDING.right)) * (snapshot.points.length - 1)),
            ),
          )
        ]?.date ?? snapshot.nowDate,
      )
    : formatPeriodLabel(snapshot.points[snapshot.points.length - 1]?.date ?? snapshot.nowDate);

  const isEmpty =
    snapshot.baseline === 0 &&
    scenarios.length === 0 &&
    past.every((p) => p.value === 0) &&
    future.every((p) => p.value === 0);

  return (
    <div className="glass p-4 md:p-5 relative overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
            Net worth · {periodLabel}
          </div>
          <div className="text-3xl md:text-4xl font-bold tracking-tight font-display" style={{ marginTop: 2 }}>
            <MoneyNumber value={displayValue} currency={currency} displayFont />
          </div>
          {expanded && (
            <div className="text-xs text-[var(--ink-muted)] mt-1">
              drag to scrub · drop a what-if on the future
            </div>
          )}
        </div>
        {onHorizonChange && (
          <PeriodToggle value={horizon} onChange={onHorizonChange} />
        )}
      </div>

      {/* Plot container */}
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <>
            <Curve width={width} height={height} past={past} future={future} />
            {/* Drop zone */}
            <div
              className="absolute"
              style={{
                left: futureZoneLeft,
                top: PADDING.top,
                width: futureZoneWidth,
                height: plotHeight,
                pointerEvents: onScenarioDrop ? "auto" : "none",
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            {/* Scrubber */}
            <Scrubber
              width={width}
              height={plotHeight + PADDING.top + PADDING.bottom}
              nowX={nowX}
              scrubX={scrubX ?? nowX}
              minX={PADDING.left}
              maxX={Math.max(PADDING.left, width - PADDING.right)}
              onChange={(x) => setScrubX(x)}
            />
            {/* Scenario chips */}
            {chipPositions.map(({ scenario, x, y }) => (
              <ScenarioChip
                key={scenario.id}
                scenario={scenario}
                x={x}
                y={y}
                onClick={() => onScenarioClick?.(scenario.id)}
              />
            ))}
            {/* Empty state */}
            {isEmpty && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ color: "var(--ink-muted)" }}
              >
                <div className="text-center text-sm px-4">
                  Add an account or transaction to see your trajectory.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
