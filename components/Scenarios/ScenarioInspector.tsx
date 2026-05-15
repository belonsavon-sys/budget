"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Field, Input, Select, Button } from "@/components/Field";
import { useStore } from "@/lib/store";
import { blueprintById } from "@/lib/scenarios";
import type { Frequency, WhatIfScenario, ScenarioDelta } from "@/lib/types";
import { uid } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When opening for a fresh drop, supply templateId + dropDate. */
  templateId?: string;
  dropDate?: string;
  /** When editing an existing scenario, supply scenarioId. */
  scenarioId?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ScenarioInspector({
  open,
  onClose,
  templateId,
  dropDate,
  scenarioId,
}: Props) {
  const scenarios = useStore((s) => s.scenarios);
  const addScenario = useStore((s) => s.addScenario);
  const updateScenario = useStore((s) => s.updateScenario);
  const removeScenario = useStore((s) => s.removeScenario);
  const toggleActive = useStore((s) => s.toggleActiveScenario);
  const activeIds = useStore((s) => s.activeScenarioIds);

  const existing = scenarioId ? scenarios.find((s) => s.id === scenarioId) : undefined;
  const blueprint = templateId ? blueprintById(templateId) : undefined;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [color, setColor] = useState("#c2410c");
  const [icon, setIcon] = useState("Sparkles");
  const [pinned, setPinned] = useState(false);

  // Hydrate on open
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setStartDate(existing.startDate.slice(0, 10));
      setEndDate(existing.endDate ? existing.endDate.slice(0, 10) : "");
      const first = existing.deltas[0];
      setAmount(first?.amount ?? 0);
      setFrequency((first?.frequency as Frequency) ?? "monthly");
      setColor(existing.color);
      setIcon(existing.icon);
      setPinned(existing.pinned);
    } else if (blueprint) {
      setName(blueprint.defaultName);
      setStartDate(dropDate ? dropDate.slice(0, 10) : todayIso());
      setEndDate("");
      const first = blueprint.defaultDeltas[0];
      setAmount(first?.amount ?? 0);
      setFrequency((first?.frequency as Frequency) ?? "monthly");
      // Strip CSS-var color in favor of a concrete hex for the saved record.
      setColor(blueprint.color.startsWith("var(") ? "#c2410c" : blueprint.color);
      setIcon(blueprint.icon);
      setPinned(false);
    }
  }, [open, existing, blueprint, dropDate]);

  const showEndDate = blueprint?.bounded ?? !!existing?.endDate;
  const showFrequency = blueprint?.recurring ?? !!existing?.deltas[0]?.frequency;

  function handleSave() {
    if (!name.trim()) return;

    const baseKind = blueprint?.defaultDeltas[0]?.kind ?? existing?.deltas[0]?.kind ?? "income-add";

    const delta: ScenarioDelta = {
      id: existing?.deltas[0]?.id ?? uid("d"),
      kind: baseKind,
      amount,
      currency: existing?.deltas[0]?.currency ?? blueprint?.defaultDeltas[0]?.currency ?? "USD",
      frequency: showFrequency ? frequency : undefined,
      date: baseKind === "lump-sum" ? startDate : undefined,
    };

    if (existing) {
      updateScenario(existing.id, {
        name: name.trim(),
        startDate,
        endDate: endDate || undefined,
        pinned,
        color,
        icon,
        deltas: [delta],
      });
    } else {
      const created = addScenario({
        name: name.trim(),
        startDate,
        endDate: endDate || undefined,
        pinned,
        color,
        icon,
        deltas: [delta],
      });
      // Auto-activate freshly created scenarios so the user sees the effect.
      if (!activeIds.includes(created.id)) toggleActive(created.id);
    }
    onClose();
  }

  function handleDelete() {
    if (!existing) return;
    if (!confirm(`Delete "${existing.name}"?`)) return;
    removeScenario(existing.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? "Edit scenario" : "New scenario"}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Raise · Sep '26" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          {showEndDate && (
            <Field label="End date (optional)">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          {showFrequency && (
            <Field label="Frequency">
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          )}
        </div>
        <Field label="Color">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 rounded-xl cursor-pointer"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          Pin to insight stream
        </label>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1">
            {existing ? "Save" : "Create + apply"}
          </Button>
          {existing && (
            <Button
              onClick={handleDelete}
              className="px-3"
              style={{ background: "var(--negative)", color: "var(--bg)" }}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose} className="px-3" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
