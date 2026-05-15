"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useStore } from "@/lib/store";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

interface Suggestion {
  id: string;
  description: string;
}

/** Find the @-mention query at the cursor position */
function getMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([a-zA-Z0-9 ]*)$/);
  if (!match) return null;
  return { query: match[1], start: before.lastIndexOf("@") };
}

export default function MentionAutocomplete({
  value,
  onChange,
  onBlur,
  rows = 6,
  placeholder,
  autoFocus,
  className = "",
}: Props) {
  const transactions = useStore((s) => s.transactions);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    onChange(newVal);

    const cursor = e.target.selectionStart ?? newVal.length;
    const mention = getMentionQuery(newVal, cursor);

    if (mention) {
      const q = mention.query.toLowerCase();
      const matches = transactions
        .filter((t) => t.description.toLowerCase().includes(q))
        .slice(0, 5)
        .map((t) => ({ id: t.id, description: t.description }));
      setSuggestions(matches);
      setActiveIdx(0);
      setMentionStart(mention.start);
    } else {
      setSuggestions([]);
      setMentionStart(-1);
    }
  }

  function selectSuggestion(s: Suggestion) {
    if (mentionStart < 0) return;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    // Replace from mentionStart up to cursor with the mention markdown
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const inserted = `[${s.description}](@txn:${s.id})`;
    const newVal = before + inserted + after;
    onChange(newVal);
    setSuggestions([]);
    setMentionStart(-1);

    // Restore cursor after inserted text
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = mentionStart + inserted.length;
        textareaRef.current.setSelectionRange(pos, pos);
        textareaRef.current.focus();
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay so click on suggestion fires first
          setTimeout(() => {
            setSuggestions([]);
            onBlur?.();
          }, 150);
        }}
        rows={rows}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-[var(--surface-2)] border border-[var(--card-border)] rounded-2xl p-3 text-sm resize-none outline-none focus:ring-1 focus:ring-[var(--accent)] ${className}`}
      />
      {suggestions.length > 0 && (
        <div
          className="absolute left-0 z-50 w-full mt-1 rounded-2xl shadow-xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
              className={`w-full text-left px-4 py-2 text-sm ${i === activeIdx ? "bg-[var(--hover)]" : "hover:bg-[var(--hover)]"}`}
            >
              <span className="font-medium">{s.description}</span>
              <span className="ml-2 text-xs text-[var(--ink-muted)]">@txn:{s.id.slice(0, 8)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
