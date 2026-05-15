"use client";
import { useMemo } from "react";

interface Props {
  monthDate: Date;
  dailyNets: Record<string, number>; // yyyy-mm-dd -> net
  weekStartsMonday?: boolean;
  onDayClick?: (date: Date) => void;
  onScenarioDrop?: (templateId: string, dateIso: string) => void;
  selectedDate?: Date | null;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function netToColor(net: number, maxAbs: number): string {
  if (maxAbs === 0 || net === 0) return "transparent";
  const ratio = Math.min(Math.abs(net) / maxAbs, 1);
  const alpha = 0.15 + ratio * 0.55;
  return net > 0
    ? `rgba(34,197,94,${alpha.toFixed(2)})`  // green for positive
    : `rgba(239,68,68,${alpha.toFixed(2)})`;  // red for negative
}

export default function Heatmap({
  monthDate,
  dailyNets,
  weekStartsMonday = false,
  onDayClick,
  onScenarioDrop,
  selectedDate,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIso(today), [today]);

  const { days, maxAbs } = useMemo(() => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const startDayOffset = weekStartsMonday
      ? (monthStart.getDay() + 6) % 7
      : monthStart.getDay();

    const totalCells = Math.ceil((startDayOffset + monthEnd.getDate()) / 7) * 7;
    const daysArr: Date[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(monthStart);
      d.setDate(monthStart.getDate() + i - startDayOffset);
      daysArr.push(d);
    }

    const absVals = Object.values(dailyNets).map(Math.abs);
    const maxAbsVal = absVals.length > 0 ? Math.max(...absVals) : 0;
    return { days: daysArr, maxAbs: maxAbsVal };
  }, [monthDate, weekStartsMonday, dailyNets]);

  const weekDays = weekStartsMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  function handleDrop(e: React.DragEvent<HTMLButtonElement>, dateIso: string) {
    e.preventDefault();
    const templateId = e.dataTransfer.getData("application/x-scenario-template");
    if (templateId && onScenarioDrop) {
      onScenarioDrop(templateId, dateIso);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>, dateIso: string) {
    const isTemplate = e.dataTransfer.types.includes("application/x-scenario-template");
    if (isTemplate && dateIso > todayIso) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-[var(--ink-muted)] font-medium">
        {weekDays.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const iso = toIso(d);
          const inMonth = d.getMonth() === monthDate.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
          const isFuture = iso > todayIso;
          const net = dailyNets[iso] ?? 0;
          const bgColor = isSelected ? undefined : netToColor(net, maxAbs);

          const netLabel = net !== 0 ? ` · ${net > 0 ? "+" : "−"}$${Math.abs(net).toFixed(2)} net` : "";
          return (
            <button
              key={i}
              onClick={() => onDayClick?.(d)}
              onDrop={(e) => isFuture ? handleDrop(e, iso) : undefined}
              onDragOver={(e) => handleDragOver(e, iso)}
              aria-label={`${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${netLabel}`}
              className={[
                "relative aspect-square rounded-xl text-xs font-medium tap transition-all",
                isSelected ? "gradient-fill text-white" : isToday ? "ring-1 ring-[var(--accent)]" : "",
                inMonth ? "" : "opacity-30",
                isFuture ? "border border-dashed border-[var(--card-border)]" : "",
              ].filter(Boolean).join(" ")}
              style={{
                background: isSelected ? undefined : bgColor ?? (isToday ? "var(--hover)" : "transparent"),
              }}
            >
              <span className="absolute top-1 left-1.5 text-[10px]">{d.getDate()}</span>
              {net !== 0 && inMonth && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] tabular-nums leading-none"
                  style={{ color: net > 0 ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
                >
                  {net > 0 ? "+" : "−"}{Math.abs(net) >= 1000 ? `${(Math.abs(net) / 1000).toFixed(0)}k` : Math.abs(net).toFixed(0)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
