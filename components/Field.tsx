"use client";

import { classNames } from "@/lib/utils";

export function Field({
  label,
  children,
  hint,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      {label && (
        <div className="text-xs font-medium mb-1.5 text-[var(--muted)]">{label}</div>
      )}
      {children}
      {hint && <div className="text-xs text-[var(--muted)] mt-1">{hint}</div>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full px-4 py-3 rounded-2xl bg-[var(--hover)] border border-transparent focus:border-[var(--grad-via)] focus:outline-none transition-all",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={classNames(
        "w-full px-4 py-3 rounded-2xl bg-[var(--hover)] border border-transparent focus:border-[var(--grad-via)] focus:outline-none transition-all resize-y min-h-24",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={classNames(
        "w-full px-4 py-3 rounded-2xl bg-[var(--hover)] border border-transparent focus:border-[var(--grad-via)] focus:outline-none appearance-none transition-all",
        props.className
      )}
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "gradient-fill text-white shadow-lg",
    secondary: "bg-[var(--hover)] text-[var(--fg)]",
    ghost: "hover:bg-[var(--hover)]",
    danger: "bg-red-500/15 text-red-500 hover:bg-red-500/25",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-xl",
    md: "px-4 py-2.5 rounded-2xl",
    lg: "px-6 py-3 rounded-2xl text-base font-medium",
  };
  return (
    <button
      {...rest}
      className={classNames(
        "tap font-medium transition-all",
        variants[variant],
        sizes[size],
        className
      )}
    />
  );
}
