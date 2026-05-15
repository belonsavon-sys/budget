"use client";
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
}

export default function SectionHead({ eyebrow, title, trailing }: Props) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 pb-1.5 border-b border-[var(--hairline)]">
      <div>
        {eyebrow && (
          <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--ink-muted)] mb-0.5">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-lg md:text-xl font-semibold">{title}</h2>
      </div>
      {trailing && <div className="text-[11px] text-[var(--ink-muted)] flex-shrink-0">{trailing}</div>}
    </div>
  );
}
