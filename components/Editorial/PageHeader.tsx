"use client";
import { motion } from "framer-motion";

interface Props {
  eyebrow?: string;        // small-caps text above title (e.g. "REPORTS · MAY 2026")
  title: string;           // main display headline
  byline?: string;         // italic line below title (e.g. "by the numbers")
  actions?: React.ReactNode; // optional right-side controls
}

export default function PageHeader({ eyebrow, title, byline, actions }: Props) {
  return (
    <header className="pt-2 md:pt-8 mb-6">
      <div className="flex items-end justify-between gap-4 mb-1">
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-muted)] mb-2"
            >
              {eyebrow}
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-display font-bold tracking-tight text-3xl md:text-5xl leading-[1.05]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </motion.h1>
          {byline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="font-display italic text-base md:text-lg text-[var(--ink-muted)] mt-1"
            >
              {byline}
            </motion.div>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className="h-px bg-[var(--ink)] opacity-20 mt-3" />
    </header>
  );
}
