"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface Props {
  value: number;
  currency: Currency;
  className?: string;
  /** Use --font-display (Cormorant, Playfair, Plex Mono per theme). */
  displayFont?: boolean;
}

export default function MoneyNumber({ value, currency, className = "", displayFont }: Props) {
  const controls = useAnimation();
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current !== value) {
      controls.start({
        opacity: [0.55, 1],
        y: [3, 0],
        transition: { duration: 0.22, ease: "easeOut" },
      });
      previous.current = value;
    }
  }, [value, controls]);

  return (
    <motion.span
      animate={controls}
      className={`tabular-nums ${displayFont ? "font-display" : ""} ${className}`}
      style={{ fontFeatureSettings: '"tnum", "lnum"' }}
    >
      {formatMoney(value, currency)}
    </motion.span>
  );
}
