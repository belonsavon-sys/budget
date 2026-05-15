"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";

interface Props {
  accountId: string;
  width?: number;
  height?: number;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AccountSparkline({ accountId, width = 120, height = 32 }: Props) {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);

  const points = useMemo(() => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return [];

    const today = new Date();
    const days = 30;
    const dailyBalances: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - i);
      const dayIso = toIso(dayDate);

      // Sum all transactions up to and including this day
      let balance = account.startingBalance;
      for (const t of transactions) {
        if (t.status === "projected") continue;
        if (t.date > dayIso) continue;
        if (t.accountId === accountId) {
          if (t.type === "expense") balance -= t.amount;
          else if (t.type === "income") balance += t.amount;
          else if (t.type === "transfer") balance -= t.amount;
        }
        if (t.type === "transfer" && t.toAccountId === accountId) {
          balance += t.amount;
        }
      }
      dailyBalances.push(balance);
    }

    return dailyBalances;
  }, [accounts, transactions, accountId]);

  if (points.length === 0) return null;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal;
  const pad = 2;

  if (range === 0) {
    // Flat line
    const y = height / 2;
    return (
      <svg width={width} height={height} className="flex-shrink-0">
        <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="var(--accent)" strokeWidth={1.5} strokeOpacity={0.5} />
      </svg>
    );
  }

  const svgPts = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - minVal) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isPositiveTrend = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={svgPts.join(" ")}
        fill="none"
        stroke={isPositiveTrend ? "rgb(34,197,94)" : "rgb(239,68,68)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.8}
      />
    </svg>
  );
}
