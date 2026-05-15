"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, Trash2, Pencil, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, vibrate } from "@/lib/utils";
import type { SavingsGoal } from "@/lib/types";
import Modal from "@/components/Modal";
import { Field, Input, Button } from "@/components/Field";
import GoalForecast from "@/components/Goals/GoalForecast";
import EmptyState from "@/components/Common/EmptyState";

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const contributeToGoal = useStore((s) => s.contributeToGoal);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);

  function celebrate() {
    if (settings.hapticsEnabled) vibrate([20, 30, 20]);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: [settings.gradientFrom, settings.gradientVia, settings.gradientTo],
    });
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Goals</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={16} className="inline mr-1" />New goal
        </Button>
      </header>

      {goals.length === 0 && (
        <EmptyState
          icon={<Target size={24} />}
          title="No goals yet"
          description="Set a target to start saving toward something."
          action={{ label: "New goal", onClick: () => { setOpen(true); } }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goals.map((g, i) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          const remaining = Math.max(0, g.target - g.current);
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white grid place-items-center"
                    style={{ background: g.color }}
                  >
                    <Target size={18} />
                  </div>
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    {g.deadline && (
                      <div className="text-xs text-[var(--ink-muted)]">
                        by {new Date(g.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(g); setOpen(true); }}
                    className="tap p-2 rounded-full hover:bg-[var(--hover)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this goal?")) removeGoal(g.id);
                    }}
                    className="tap p-2 rounded-full hover:bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between mb-2 mt-3">
                <div className="text-2xl font-bold tabular-nums">{formatMoney(g.current, settings.currency)}</div>
                <div className="text-sm text-[var(--ink-muted)] tabular-nums">/ {formatMoney(g.target, settings.currency)}</div>
              </div>
              <div className="h-3 rounded-full bg-[var(--hover)] overflow-hidden">
                <motion.div
                  className="h-full gradient-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--ink-muted)] mt-2">
                <span>{pct.toFixed(0)}%</span>
                <span>{formatMoney(remaining, settings.currency)} to go</span>
              </div>
              <GoalForecast goal={g} />
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setContributing(g)}>
                  Add contribution
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit goal" : "New goal"}>
        <GoalForm
          initial={editing ?? undefined}
          onDone={() => setOpen(false)}
          onSave={(g) => {
            if (editing) updateGoal(editing.id, g);
            else addGoal(g);
            setOpen(false);
          }}
        />
      </Modal>

      <Modal open={!!contributing} onClose={() => setContributing(null)} title={`Contribute to ${contributing?.name}`}>
        {contributing && (
          <ContribForm
            goal={contributing}
            onDone={() => setContributing(null)}
            onContribute={(amount, note) => {
              const after = contributing.current + amount;
              contributeToGoal(contributing.id, amount, note);
              if (after >= contributing.target && contributing.current < contributing.target) celebrate();
              setContributing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function GoalForm({
  initial,
  onSave,
  onDone,
}: {
  initial?: SavingsGoal;
  onSave: (g: Omit<SavingsGoal, "id" | "contributions" | "current">) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(String(initial?.target ?? ""));
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? "");
  const [color, setColor] = useState(initial?.color ?? "#a78bfa");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          target: parseFloat(target) || 0,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          color,
          icon: "Target",
        });
      }}
    >
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Target amount">
        <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
      </Field>
      <Field label="Deadline (optional)">
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label="Color">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-12 rounded-2xl" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}

function ContribForm({
  goal,
  onContribute,
  onDone,
}: {
  goal: SavingsGoal;
  onContribute: (amount: number, note?: string) => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const settings = useStore((s) => s.settings);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseFloat(amount);
        if (!v) return;
        onContribute(v, note || undefined);
      }}
    >
      <div className="text-sm text-[var(--ink-muted)]">
        Currently at {formatMoney(goal.current, settings.currency)} of {formatMoney(goal.target, settings.currency)}
      </div>
      <Field label="Amount">
        <Input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="Note">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Contribute</Button>
      </div>
    </form>
  );
}
