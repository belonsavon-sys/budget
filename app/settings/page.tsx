"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Currency } from "@/lib/types";
import { Field, Input, Select, Button } from "@/components/Field";
import { downloadFile, readFileAsText, sha256 } from "@/lib/utils";
import { Download, Upload, Lock, Unlock, Palette, ChevronRight, RotateCcw, Brain, Users } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pinOpen, setPinOpen] = useState(false);

  async function handleImport(file: File | null) {
    if (!file) return;
    const text = await readFileAsText(file);
    const mode = confirm("OK to MERGE with existing data, Cancel to REPLACE.") ? "merge" : "replace";
    const result = importData(text, mode);
    alert(result.ok ? "Imported successfully" : `Import failed: ${result.error}`);
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Settings</h1>
      </header>

      <section className="glass p-5 space-y-4">
        <div className="text-sm font-semibold">Profile</div>
        <Field label="Your name (shown on home)">
          <Input
            value={settings.userName}
            onChange={(e) => updateSettings({ userName: e.target.value })}
            placeholder="Pierre"
          />
        </Field>
        <Field label="Default currency">
          <Select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value as Currency })}
          >
            {["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","KRW","SGD","HKD","NZD","SEK","NOK","DKK","ZAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="glass p-5 space-y-4">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Palette size={14} /> Theme
        </div>
        <Link
          href="/settings/theme"
          className="tap flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--hover)] -mx-1"
        >
          <div>
            <div className="text-sm font-medium">Color theme</div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">
              5 hand-tuned themes — Architectural, Newsroom, Ledger, Terminal, Deep Space
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--ink-muted)]" />
        </Link>
      </section>

      <section className="glass p-5 space-y-4">
        <div className="text-sm font-semibold">Preferences</div>
        <Toggle
          label="Show projected transactions"
          value={settings.showProjected}
          onChange={(v) => updateSettings({ showProjected: v })}
        />
        <Toggle
          label="Haptic feedback"
          value={settings.hapticsEnabled}
          onChange={(v) => updateSettings({ hapticsEnabled: v })}
        />
        <Toggle
          label="Sound effects"
          value={settings.soundEnabled}
          onChange={(v) => updateSettings({ soundEnabled: v })}
        />
        <Toggle
          label="Week starts Monday"
          value={settings.weekStartsMonday}
          onChange={(v) => updateSettings({ weekStartsMonday: v })}
        />
      </section>

      <section className="glass p-5 space-y-4">
        <div className="text-sm font-semibold flex items-center gap-2">
          {settings.pinEnabled ? <Lock size={14} /> : <Unlock size={14} />} Security
        </div>
        <Toggle
          label="Require PIN to open"
          value={settings.pinEnabled}
          onChange={(v) => {
            if (v) setPinOpen(true);
            else updateSettings({ pinEnabled: false, pinHash: undefined });
          }}
        />
        {settings.pinEnabled && (
          <Button variant="secondary" size="sm" onClick={() => setPinOpen(true)}>
            Change PIN
          </Button>
        )}
      </section>

      <section className="glass p-5 space-y-3">
        <div className="text-sm font-semibold">More</div>
        <Link href="/budgets" className="flex items-center justify-between p-3 -mx-2 rounded-xl hover:bg-[var(--hover)] tap">
          <span>Budgets</span>
          <ChevronRight size={16} className="text-[var(--ink-muted)]" />
        </Link>
        <Link href="/insights" className="flex items-center justify-between p-3 -mx-2 rounded-xl hover:bg-[var(--hover)] tap">
          <span>AI insights</span>
          <ChevronRight size={16} className="text-[var(--ink-muted)]" />
        </Link>
        <Link
          href="/settings/ai"
          className="flex items-center justify-between p-3 -mx-2 rounded-xl hover:bg-[var(--hover)] tap"
        >
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-[var(--accent)]" />
            <span>AI &amp; Copilot</span>
          </div>
          <ChevronRight size={16} className="text-[var(--ink-muted)]" />
        </Link>
        <Link
          href="/settings/household"
          className="flex items-center justify-between p-3 -mx-2 rounded-xl hover:bg-[var(--hover)] tap"
        >
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[var(--accent)]" />
            <span>Household</span>
          </div>
          <ChevronRight size={16} className="text-[var(--ink-muted)]" />
        </Link>
      </section>

      <section className="glass p-5 space-y-3">
        <div className="text-sm font-semibold">Data</div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadFile(`budget-${new Date().toISOString().slice(0, 10)}.json`, exportData())}
          >
            <Download size={14} className="inline mr-1" /> Export JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} className="inline mr-1" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Wipe ALL data and reset? This cannot be undone.")) resetAll();
            }}
          >
            <RotateCcw size={14} className="inline mr-1" /> Reset
          </Button>
        </div>
        <div className="text-xs text-[var(--ink-muted)]">
          Your data is stored locally on this device. Export regularly to back it up.
        </div>
      </section>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Set PIN">
        <PinForm onDone={() => setPinOpen(false)} />
      </Modal>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`tap relative w-12 h-7 rounded-full transition-colors ${value ? "gradient-fill" : "bg-[var(--hover)]"}`}
      >
        <span
          className={`absolute top-0.5 ${value ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`}
        />
      </button>
    </label>
  );
}

function PinForm({ onDone }: { onDone: () => void }) {
  const updateSettings = useStore((s) => s.updateSettings);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (a.length < 4) {
          setErr("PIN must be at least 4 digits");
          return;
        }
        if (a !== b) {
          setErr("PINs don't match");
          return;
        }
        const hash = await sha256(a);
        updateSettings({ pinEnabled: true, pinHash: hash });
        onDone();
      }}
    >
      <Field label="PIN">
        <Input
          type="password"
          inputMode="numeric"
          autoFocus
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </Field>
      <Field label="Confirm PIN">
        <Input
          type="password"
          inputMode="numeric"
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
      </Field>
      {err && <div className="text-sm text-[var(--negative)]">{err}</div>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}
