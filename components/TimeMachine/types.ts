import type { ProjectionPoint, ProjectionSnapshot } from "@/lib/projection-types";
import type { WhatIfScenario, ProjectionHorizon, Currency } from "@/lib/types";

export interface TimeMachineProps {
  snapshot: ProjectionSnapshot;
  currency: Currency;
  scenarios?: WhatIfScenario[];
  horizon: ProjectionHorizon;
  onHorizonChange?: (h: ProjectionHorizon) => void;
  /** Called when a chip is dropped on the future zone. */
  onScenarioDrop?: (templateId: string, dateIso: string) => void;
  /** Called when a saved scenario chip on the timeline is clicked. */
  onScenarioClick?: (scenarioId: string) => void;
  /** Height in px. ~280 for hero, full viewport for fullscreen. */
  height?: number;
  /** Render expanded UI (period buttons, larger caption). */
  expanded?: boolean;
}

export interface CurvePoint extends ProjectionPoint {
  x: number;
  y: number;
  bandLoY: number;
  bandHiY: number;
  isPast: boolean;
}
