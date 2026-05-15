"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pin, PinOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Field, Input, Button } from "@/components/Field";
import MarkdownView from "@/components/Notes/MarkdownView";
import MentionAutocomplete from "@/components/Notes/MentionAutocomplete";

export default function NotesPage() {
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const removeNote = useStore((s) => s.removeNote);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "" });

  function newNote() {
    addNote({ title: "Untitled", content: "", pinned: false, tagIds: [] });
  }

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return +new Date(b.updatedAt) - +new Date(a.updatedAt);
  });

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Notes</h1>
        <Button onClick={newNote}>
          <Plus size={16} className="inline mr-1" />New
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {sorted.map((n, i) => {
            const isEdit = editing === n.id;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
                className="glass p-4 cursor-pointer"
                onClick={() => {
                  if (!isEdit) {
                    setDraft({ title: n.title, content: n.content });
                    setEditing(n.id);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  {isEdit ? (
                    <Input
                      value={draft.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      onBlur={() => {
                        updateNote(n.id, { title: draft.title, content: draft.content });
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="font-semibold truncate">{n.title || "Untitled"}</div>
                  )}
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNote(n.id, { pinned: !n.pinned });
                      }}
                      className="tap p-1.5 rounded-full hover:bg-[var(--hover)]"
                    >
                      {n.pinned ? <Pin size={14} className="text-amber-500" /> : <PinOff size={14} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this note?")) removeNote(n.id);
                      }}
                      className="tap p-1.5 rounded-full hover:bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isEdit ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <MentionAutocomplete
                      value={draft.content}
                      onChange={(v) => setDraft({ ...draft, content: v })}
                      onBlur={() => {
                        updateNote(n.id, { title: draft.title, content: draft.content });
                        setEditing(null);
                      }}
                      rows={6}
                      placeholder="Write in Markdown… type @ to mention a transaction"
                    />
                    <div className="text-[10px] text-[var(--ink-muted)] mt-1 px-1">
                      Supports Markdown · Type @ to link a transaction
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--ink-muted)] line-clamp-6 min-h-[2rem]">
                    {n.content ? (
                      <MarkdownView content={n.content} />
                    ) : (
                      <span className="italic">Tap to write…</span>
                    )}
                  </div>
                )}
                <div className="text-[10px] text-[var(--ink-muted)] mt-2">
                  {new Date(n.updatedAt).toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {notes.length === 0 && (
        <div className="glass p-10 text-center text-[var(--ink-muted)]">
          A space for free-form thoughts about your money. Supports Markdown + @transaction mentions.
        </div>
      )}
    </div>
  );
}
