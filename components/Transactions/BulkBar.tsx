"use client";
import { useState } from "react";
import { Sparkles, Tag, X, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { executeTool } from "@/lib/agent/dispatch";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export default function BulkBar({ selectedIds, onClear }: Props) {
  const categories = useStore((s) => s.categories);
  const [busy, setBusy] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const tags = useStore((s) => s.tags);

  if (selectedIds.length === 0) return null;

  async function handleCategorize(categoryId: string) {
    setBusy(true);
    setShowCatPicker(false);
    try {
      await executeTool({
        toolName: "categorizeTransactions",
        args: { ids: selectedIds, categoryId },
        actor: "user",
        rationale: `Bulk categorize ${selectedIds.length} transaction(s)`,
      });
    } finally {
      setBusy(false);
      onClear();
    }
  }

  async function handleTag(tagId: string) {
    setBusy(true);
    setShowTagPicker(false);
    try {
      for (const id of selectedIds) {
        await executeTool({
          toolName: "tagTransaction",
          args: { id, tagId },
          actor: "user",
          rationale: `Bulk tag ${selectedIds.length} transaction(s)`,
        });
      }
    } finally {
      setBusy(false);
      onClear();
    }
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass shadow-xl px-4 py-3 flex items-center gap-3 rounded-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
    >
      <span className="text-sm font-semibold tabular-nums">
        {selectedIds.length} selected
      </span>

      <div className="relative">
        <button
          onClick={() => { setShowCatPicker((v) => !v); setShowTagPicker(false); }}
          disabled={busy}
          className="tap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Categorize
        </button>
        {showCatPicker && (
          <div
            className="absolute bottom-full mb-2 left-0 w-52 rounded-2xl shadow-xl overflow-y-auto max-h-64 z-10"
            style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategorize(c.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--hover)] flex items-center gap-2"
              >
                <span style={{ color: c.color }}>●</span> {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowTagPicker((v) => !v); setShowCatPicker(false); }}
          disabled={busy}
          className="tap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--surface-2)", color: "var(--ink)" }}
        >
          <Tag size={14} />
          Tag
        </button>
        {showTagPicker && (
          <div
            className="absolute bottom-full mb-2 left-0 w-44 rounded-2xl shadow-xl overflow-y-auto max-h-48 z-10"
            style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
          >
            {tags.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--ink-muted)]">No tags yet.</div>
            ) : (
              tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTag(t.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--hover)] flex items-center gap-2"
                >
                  <span style={{ color: t.color }}>●</span> #{t.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={onClear}
        className="tap p-1.5 rounded-full hover:bg-[var(--hover)]"
        title="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
  );
}
