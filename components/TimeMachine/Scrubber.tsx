"use client";
import { motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";

interface Props {
  width: number;
  height: number;
  /** X position of the Now marker, in svg pixel coordinates. */
  nowX: number;
  /** Current scrub X (may equal nowX). */
  scrubX: number;
  /** Min/max X bounds for dragging (chart padding considered). */
  minX: number;
  maxX: number;
  onChange: (x: number) => void;
  onCommit?: (x: number) => void;
}

export default function Scrubber({ width, height, nowX, scrubX, minX, maxX, onChange, onCommit }: Props) {
  const x = useMotionValue(scrubX);

  // Keep motion value in sync when scrubX changes externally (e.g. theme switch).
  useEffect(() => {
    x.set(scrubX);
  }, [scrubX, x]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        width,
        height,
      }}
    >
      {/* Dotted "Now" rail — always at the original nowX */}
      <div
        style={{
          position: "absolute",
          left: nowX,
          top: 0,
          bottom: 0,
          width: 1,
          borderLeft: "1px dashed var(--ink-faint)",
          opacity: 0.5,
        }}
      />

      {/* Scrubber handle — draggable */}
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: minX, right: maxX }}
        style={{
          x,
          position: "absolute",
          top: 0,
          left: 0,
          width: 18,
          height,
          marginLeft: -9,
          pointerEvents: "auto",
          cursor: "ew-resize",
          touchAction: "none",
        }}
        onDrag={(_e, info) => {
          const next = Math.max(minX, Math.min(maxX, info.point.x - 9 + 9));
          // Use the motion value directly via offset from initial scrubX:
          const newX = scrubX + info.offset.x;
          onChange(Math.max(minX, Math.min(maxX, newX)));
        }}
        onDragEnd={() => onCommit?.(x.get())}
      >
        {/* Visible handle column */}
        <div
          style={{
            position: "absolute",
            left: 9,
            top: 0,
            bottom: 0,
            width: 2,
            background: "var(--ink)",
            opacity: 0.8,
          }}
        />
        {/* Top dot */}
        <div
          style={{
            position: "absolute",
            left: 4,
            top: -3,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--ink)",
            border: "2px solid var(--bg)",
            boxShadow: "var(--shadow-card)",
          }}
        />
      </motion.div>
    </div>
  );
}
