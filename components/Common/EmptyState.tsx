import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 text-center"
    >
      {icon && <div className="flex justify-center mb-3 text-[var(--ink-muted)]">{icon}</div>}
      <div className="font-display text-lg font-semibold">{title}</div>
      {description && <div className="text-sm text-[var(--ink-muted)] mt-1.5">{description}</div>}
      {action && (
        <button
          onClick={action.onClick}
          className="tap mt-4 px-4 py-2 rounded-xl font-medium text-sm"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
