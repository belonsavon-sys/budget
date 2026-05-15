"use client";

interface Props {
  height?: number;
  className?: string;
}

export default function Skeleton({ height = 280, className = "" }: Props) {
  return (
    <div
      className={`glass shimmer ${className}`}
      style={{ height, background: "var(--surface)" }}
      aria-hidden="true"
    />
  );
}
