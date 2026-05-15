import type { ProjectionInput, ProjectOpts, ProjectionPoint, ProjectionSnapshot } from "./projection-types";
import type { ProjectionHorizon, RecurringRule, WhatIfScenario, Frequency } from "./types";

const HORIZON_DAYS: Record<ProjectionHorizon, number> = {
  "1y": 365,
  "5y": 365 * 5,
  "10y": 365 * 10,
  "30y": 365 * 30,
  "all": 365 * 30,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// UTC-based date math: parsing "YYYY-MM-DD" via new Date() yields UTC midnight,
// but setDate/setMonth use the LOCAL timezone — which causes month rollovers in
// non-UTC zones (e.g. setDate(31) on a UTC-midnight date shifted to local can
// skip a month). All steppers below operate in UTC to stay timezone-free.

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

function addYears(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x;
}

function signedAmount(t: { type: "income" | "expense" | "transfer"; amount: number }): number {
  if (t.type === "income") return t.amount;
  if (t.type === "expense") return -t.amount;
  return 0; // transfers don't change net worth
}

function computeBaseline(input: ProjectionInput, nowIso: string): number {
  const accountsTotal = input.accounts.reduce((s, a) => s + a.startingBalance, 0);
  const txnsTotal = input.transactions
    .filter((t) => t.date.slice(0, 10) <= nowIso && t.status !== "projected")
    .reduce((s, t) => s + signedAmount(t), 0);
  return accountsTotal + txnsTotal;
}

/** Stride days between points. Keeps total points <= ~400 for performant SVG render. */
function strideFor(horizon: ProjectionHorizon): number {
  if (horizon === "1y") return 3;       // ~120 points
  if (horizon === "5y") return 7;       // ~260 points
  if (horizon === "10y") return 14;     // ~260 points
  if (horizon === "30y") return 30;     // ~365 points
  return 30;
}

// ───────────────────────────────────────────────────────────────
// Event stream
// ───────────────────────────────────────────────────────────────

interface ProjectedEvent {
  date: string;   // yyyy-mm-dd
  delta: number;  // signed net-worth change
  label?: string;
  kind?: "income" | "expense" | "scenario";
}

/**
 * Advance a date by one frequency step. For monthly, preserves the original
 * dayOfMonth (passed in as `anchorDay`) so we always land on the 1st, 15th, etc.
 */
function stepByFrequency(d: Date, freq: Frequency, anchorDay?: number): Date {
  switch (freq) {
    case "daily":    return addDays(d, 1);
    case "weekly":   return addDays(d, 7);
    case "biweekly": return addDays(d, 14);
    case "monthly": {
      const next = addMonths(d, 1);
      if (anchorDay !== undefined) {
        // Last day of `next`'s UTC month
        const probe = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
        const maxDay = probe.getUTCDate();
        next.setUTCDate(Math.min(anchorDay, maxDay));
      }
      return next;
    }
    case "yearly": return addYears(d, 1);
  }
}

/**
 * Expand a RecurringRule into ProjectedEvents between [fromIso, toIso].
 * Starts at max(rule.startDate, fromIso), steps by frequency,
 * stops at min(rule.endDate ?? toIso, toIso).
 */
function expandRule(r: RecurringRule, fromIso: string, toIso: string): ProjectedEvent[] {
  if (!r.active) return [];

  const effectiveStart = r.startDate > fromIso ? r.startDate : fromIso;
  const effectiveEnd = r.endDate && r.endDate < toIso ? r.endDate : toIso;

  // Anchor day: either dayOfMonth on the rule, or the day from startDate (UTC)
  const anchorDay = r.dayOfMonth ?? new Date(r.startDate).getUTCDate();

  // Find the first occurrence >= effectiveStart by walking from rule.startDate
  let cur = new Date(r.startDate);
  // Snap to anchorDay for monthly
  if (r.frequency === "monthly" || r.frequency === "yearly") {
    if (r.dayOfMonth !== undefined) {
      const probe = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0));
      const maxDay = probe.getUTCDate();
      cur.setUTCDate(Math.min(r.dayOfMonth, maxDay));
    }
  }

  // Fast-forward to effectiveStart
  while (isoDate(cur) < effectiveStart) {
    cur = stepByFrequency(cur, r.frequency, anchorDay);
  }

  const events: ProjectedEvent[] = [];
  const delta = signedAmount({ type: r.type, amount: r.amount });
  const kind: ProjectedEvent["kind"] = r.type === "income" ? "income" : "expense";

  while (isoDate(cur) <= effectiveEnd) {
    events.push({ date: isoDate(cur), delta, label: r.name, kind });
    cur = stepByFrequency(cur, r.frequency, anchorDay);
  }
  return events;
}

/**
 * Expand a WhatIfScenario into ProjectedEvents between [fromIso, toIso].
 * Only active scenarios (filtered by the caller) are expanded.
 *
 * - income-add:    recurring positive event (amount = +delta.amount)
 * - expense-add:   recurring negative event (amount = -delta.amount; delta.amount is a positive expense)
 * - lump-sum:      single event at delta.date ?? scenario.startDate
 * - expense-remove / rate-change: v1 noop — deferred to Wave 4
 */
function expandScenario(s: WhatIfScenario, fromIso: string, toIso: string): ProjectedEvent[] {
  const events: ProjectedEvent[] = [];

  for (const delta of s.deltas) {
    if (delta.kind === "lump-sum") {
      const dateIso = delta.date ?? s.startDate;
      if (dateIso >= fromIso && dateIso <= toIso) {
        events.push({ date: dateIso, delta: delta.amount, label: s.name, kind: "scenario" });
      }
      continue;
    }

    if (delta.kind === "income-add" || delta.kind === "expense-add") {
      const freq = delta.frequency;
      if (!freq) continue;

      const startIso = s.startDate > fromIso ? s.startDate : fromIso;
      const endIso = s.endDate && s.endDate < toIso ? s.endDate : toIso;
      const anchorDay = new Date(s.startDate).getUTCDate();

      let cur = new Date(s.startDate);
      if (s.startDate < startIso) {
        // Fast-forward from scenario.startDate until we reach startIso
        while (isoDate(cur) < startIso) {
          cur = stepByFrequency(cur, freq, anchorDay);
        }
      }

      const signedDelta =
        delta.kind === "income-add"
          ? delta.amount           // income-add: positive = inflow, negative = offset (layoff)
          : -Math.abs(delta.amount); // expense-add: amount is a positive number, event is negative

      while (isoDate(cur) <= endIso) {
        events.push({ date: isoDate(cur), delta: signedDelta, label: s.name, kind: "scenario" });
        cur = stepByFrequency(cur, freq, anchorDay);
      }
      continue;
    }

    // expense-remove and rate-change: noop in v1
    // These require matching existing recurring rules by categoryId and modifying their amounts.
    // Deferred to Wave 4+ when we have full category-based spending analysis.
  }

  return events;
}

// ───────────────────────────────────────────────────────────────
// Monte Carlo helpers
// ───────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function historicalSigma(input: ProjectionInput): number {
  const past = input.transactions.filter(
    (t) => t.type === "expense" && t.status === "paid"
  );
  if (past.length < 2) return 0;
  const amts = past.map((t) => t.amount);
  const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
  if (mean === 0) return 0;
  const variance = amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length;
  return Math.sqrt(variance) / mean; // coefficient of variation (relative std-dev)
}

function defaultSeed(nowIso: string, scenarioIds: string[]): number {
  const str = nowIso + scenarioIds.join(",");
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// ───────────────────────────────────────────────────────────────
// Main projection function
// ───────────────────────────────────────────────────────────────

export function project(input: ProjectionInput, opts: ProjectOpts): ProjectionSnapshot {
  const nowIso = opts.now ?? isoDate(new Date());
  const days = HORIZON_DAYS[opts.horizon];
  const stride = strideFor(opts.horizon);
  const mcPaths = opts.mcPaths ?? 0;

  const baseline = computeBaseline(input, nowIso);

  // ── Past points ──
  // Walk backward from nowIso, sampling every stride days, using computeBaseline for each day.
  const pastDays = Math.min(180, days);
  const pastPoints: ProjectionPoint[] = [];
  for (let d = pastDays; d >= 0; d -= stride) {
    const day = addDays(new Date(nowIso), -d);
    const dayIso = isoDate(day);
    const value = computeBaseline(input, dayIso);
    pastPoints.push({ date: dayIso, value, bandLo: value, bandHi: value });
  }

  // ── Future event stream ──
  const horizonEndDate = isoDate(addDays(new Date(nowIso), days));
  const activeScenarioIds = opts.activeScenarioIds;

  const futureEvents: ProjectedEvent[] = [];

  // Expand recurring rules
  for (const rule of input.recurring) {
    futureEvents.push(...expandRule(rule, nowIso, horizonEndDate));
  }

  // Expand active scenarios
  for (const scenario of input.scenarios) {
    // If activeScenarioIds is explicitly provided, use that list.
    // If not provided, use scenarios that are pinned (default behavior).
    const isActive =
      activeScenarioIds !== undefined
        ? activeScenarioIds.includes(scenario.id)
        : scenario.pinned;
    if (isActive) {
      futureEvents.push(...expandScenario(scenario, nowIso, horizonEndDate));
    }
  }

  // Sort events ascending by date
  futureEvents.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // ── Deterministic future walk ──
  // Walk forward stride by stride, accumulating events, sampling at each stride point.
  const futureSampleDates: string[] = [];
  for (let d = stride; d <= days; d += stride) {
    futureSampleDates.push(isoDate(addDays(new Date(nowIso), d)));
  }

  // Build deterministic future values
  let running = baseline;
  let eventIdx = 0;
  const deterministicFutureValues: number[] = [];

  for (const sampleDate of futureSampleDates) {
    // Sum all events up to and including this sample date
    while (eventIdx < futureEvents.length && futureEvents[eventIdx].date <= sampleDate) {
      running += futureEvents[eventIdx].delta;
      eventIdx++;
    }
    deterministicFutureValues.push(running);
  }

  // ── Monte Carlo band computation ──
  let pathValues: number[][] | null = null;

  if (mcPaths > 0) {
    // Effective sigma: spread observed in historical expenses, with a small
    // baseline so projections with no expense history still get a band.
    const sigma = Math.max(historicalSigma(input), 0.05);
    const seed =
      opts.mcSeed ??
      defaultSeed(nowIso, (activeScenarioIds ?? input.scenarios.filter((s) => s.pinned).map((s) => s.id)));
    const rng = mulberry32(seed);

    pathValues = [];
    for (let path = 0; path < mcPaths; path++) {
      // Perturb every event's amount by a multiplicative N(1, σ).
      // Cap downside at zero so we don't flip an income to an expense.
      const pathEvents: ProjectedEvent[] = futureEvents.map((e) => ({
        ...e,
        delta: e.delta * Math.max(0, 1 + sigma * gaussian(rng)),
      }));

      // Walk this path
      let r = baseline;
      let ei = 0;
      const pathVals: number[] = [];

      for (const sampleDate of futureSampleDates) {
        while (ei < pathEvents.length && pathEvents[ei].date <= sampleDate) {
          r += pathEvents[ei].delta;
          ei++;
        }
        pathVals.push(r);
      }
      pathValues.push(pathVals);
    }
  }

  // ── Assemble future ProjectionPoints ──
  const futurePoints: ProjectionPoint[] = futureSampleDates.map((date, i) => {
    const value = deterministicFutureValues[i];
    let bandLo = value;
    let bandHi = value;

    if (pathValues !== null) {
      // Collect the i-th value from each path
      const colValues = pathValues.map((pv) => pv[i]).sort((a, b) => a - b);
      bandLo = percentile(colValues, 25);
      bandHi = percentile(colValues, 75);
    }

    return { date, value, bandLo, bandHi };
  });

  const allPoints = [...pastPoints, ...futurePoints];
  const lastPoint = allPoints[allPoints.length - 1];

  return {
    computedAt: new Date().toISOString(),
    horizon: opts.horizon,
    nowDate: nowIso,
    baseline,
    finalValue: lastPoint?.value ?? baseline,
    points: allPoints,
  };
}
