"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Repeat,
  NotebookPen,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { vibrate } from "@/lib/utils";
import TransactionForm from "./TransactionForm";
import RecurringForm from "./RecurringForm";
import Modal from "./Modal";

type Mode = "expense" | "income" | "transfer" | "recurring" | "note";

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const settings = useStore((s) => s.settings);
  const addNote = useStore((s) => s.addNote);

  const actions: { mode: Mode; icon: React.ReactNode; label: string; color: string }[] = [
    { mode: "expense", icon: <ArrowUpRight size={18} />, label: "Expense", color: "#ef4444" },
    { mode: "income", icon: <ArrowDownLeft size={18} />, label: "Income", color: "#22c55e" },
    { mode: "transfer", icon: <ArrowLeftRight size={18} />, label: "Transfer", color: "#3b82f6" },
    { mode: "recurring", icon: <Repeat size={18} />, label: "Recurring", color: "#a855f7" },
    { mode: "note", icon: <NotebookPen size={18} />, label: "Note", color: "#f59e0b" },
  ];

  function pick(m: Mode) {
    if (settings.hapticsEnabled) vibrate(10);
    if (m === "note") {
      addNote({ title: "Quick note", content: "", pinned: false, tagIds: [] });
      setOpen(false);
      return;
    }
    setMode(m);
    setOpen(false);
  }

  return (
    <>
      <div className="fixed right-4 md:right-6 bottom-24 md:bottom-6 z-40">
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute right-0 bottom-16 flex flex-col gap-2 items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {actions.map((a, i) => (
                <motion.button
                  key={a.mode}
                  onClick={() => pick(a.mode)}
                  className="flex items-center gap-3 tap"
                  initial={{ opacity: 0, x: 30, scale: 0.6 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.6 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 24 }}
                >
                  <span className="px-3 py-1.5 rounded-full glass text-sm font-medium">
                    {a.label}
                  </span>
                  <span
                    className="w-12 h-12 rounded-full text-white grid place-items-center shadow-lg"
                    style={{ background: a.color }}
                  >
                    {a.icon}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => {
            if (settings.hapticsEnabled) vibrate(15);
            setOpen((o) => !o);
          }}
          className="w-16 h-16 rounded-full gradient-fill grid place-items-center shadow-2xl tap"
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 20 }}
          aria-label="Quick add"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {open ? <X size={26} strokeWidth={2.4} /> : <Plus size={26} strokeWidth={2.4} />}
        </motion.button>
      </div>

      <Modal
        open={mode === "expense" || mode === "income" || mode === "transfer"}
        onClose={() => setMode(null)}
        title={mode === "expense" ? "New expense" : mode === "income" ? "New income" : "New transfer"}
        size="md"
      >
        {mode && mode !== "recurring" && mode !== "note" && (
          <TransactionForm
            initialType={mode}
            onDone={() => setMode(null)}
          />
        )}
      </Modal>
      <Modal open={mode === "recurring"} onClose={() => setMode(null)} title="New recurring" size="md">
        <RecurringForm onDone={() => setMode(null)} />
      </Modal>
    </>
  );
}
