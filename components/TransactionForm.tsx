"use client";

import { useState, useRef } from "react";
import { Field, Input, Textarea, Select, Button } from "./Field";
import { useStore } from "@/lib/store";
import type { Transaction, TxnType, TxnStatus, Attachment, Split } from "@/lib/types";
import { uid, readFileAsDataUrl, vibrate, formatMoney } from "@/lib/utils";
import { Plus, Trash2, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionForm({
  initialType = "expense",
  initial,
  onDone,
}: {
  initialType?: TxnType;
  initial?: Transaction;
  onDone: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const tags = useStore((s) => s.tags);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const addTag = useStore((s) => s.addTag);

  const [type, setType] = useState<TxnType>(initial?.type ?? initialType);
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts[0]?.id ?? ""
  );
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [date, setDate] = useState(
    (initial?.date ?? new Date().toISOString()).slice(0, 10)
  );
  const [status, setStatus] = useState<TxnStatus>(
    initial?.status ?? (type === "income" ? "received" : "paid")
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? settings.currency);
  const [splits, setSplits] = useState<Split[]>(initial?.splits ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments ?? []);
  const [newTag, setNewTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredCats = categories.filter(
    (c) => c.type === "both" || c.type === (type === "transfer" ? "expense" : type)
  );

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const out: Attachment[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await readFileAsDataUrl(f);
      out.push({ id: uid("at"), name: f.name, type: f.type, dataUrl });
    }
    setAttachments((cur) => [...cur, ...out]);
  }

  function toggleTag(id: string) {
    setTagIds((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
  }

  function createTag() {
    if (!newTag.trim()) return;
    const color = `hsl(${Math.floor(Math.random() * 360)} 70% 60%)`;
    const existing = tags.find((t) => t.name.toLowerCase() === newTag.trim().toLowerCase());
    if (existing) {
      toggleTag(existing.id);
    } else {
      const t = { id: uid("t"), name: newTag.trim(), color };
      addTag({ name: t.name, color });
      // need to add to current tag selection — we don't have the new id back, but addTag generates inside.
      // simplest: re-derive after save: tags from store updates synchronously
      setTimeout(() => {
        const found = useStore.getState().tags.find((x) => x.name === t.name);
        if (found) setTagIds((cur) => [...cur, found.id]);
      }, 0);
    }
    setNewTag("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !accountId) return;
    if (type === "transfer" && !toAccountId) return;
    const payload: Omit<Transaction, "id"> = {
      type,
      amount: amt,
      currency,
      description: description || (categories.find((c) => c.id === categoryId)?.name ?? ""),
      categoryId: type === "transfer" ? undefined : categoryId,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      tagIds,
      date: new Date(date).toISOString(),
      status,
      notes: notes || undefined,
      attachments: attachments.length ? attachments : undefined,
      splits: splits.length ? splits : undefined,
      projected: status === "projected",
    };
    if (settings.hapticsEnabled) vibrate(20);
    if (initial) updateTransaction(initial.id, payload);
    else addTransaction(payload);
    onDone();
  }

  const totalSplits = splits.reduce((s, x) => s + (x.amount || 0), 0);
  const splitMismatch = splits.length > 0 && Math.abs(totalSplits - parseFloat(amount || "0")) > 0.01;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--hover)] rounded-2xl">
        {(["expense", "income", "transfer"] as TxnType[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className="relative tap py-2 text-sm font-medium capitalize rounded-xl"
          >
            {type === t && (
              <motion.div
                layoutId="ttype"
                className="absolute inset-0 gradient-fill rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={type === t ? "text-white" : "text-[var(--muted)]"}>{t}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Amount">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            required
          />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as never)}>
            {["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","KRW","SGD","HKD","NZD","SEK","NOK","DKK","ZAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Description">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it?"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Account">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
        {type === "transfer" ? (
          <Field label="To account">
            <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              <option value="">Select…</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </Select>
          </Field>
        ) : (
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Status">
        <div className="flex flex-wrap gap-2">
          {(["paid", "received", "pending", "projected"] as TxnStatus[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStatus(s)}
              className={`tap px-3 py-1.5 rounded-full text-xs font-medium capitalize border ${
                status === s
                  ? "gradient-fill text-white border-transparent"
                  : "border-[var(--card-border)] bg-[var(--hover)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => toggleTag(t.id)}
              className={`tap px-2.5 py-1 rounded-full text-xs font-medium ${
                tagIds.includes(t.id) ? "text-white" : "bg-[var(--hover)]"
              }`}
              style={tagIds.includes(t.id) ? { background: t.color } : undefined}
            >
              #{t.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new tag"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createTag();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={createTag}>
            <Plus size={16} />
          </Button>
        </div>
      </Field>

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
      </Field>

      <div>
        <div className="text-xs font-medium mb-1.5 text-[var(--muted)]">Splits (optional)</div>
        <AnimatePresence initial={false}>
          {splits.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 mb-2"
            >
              <Select
                value={s.categoryId}
                onChange={(e) => {
                  const next = [...splits];
                  next[i] = { ...next[i], categoryId: e.target.value };
                  setSplits(next);
                }}
              >
                <option value="">Category</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={s.amount || ""}
                onChange={(e) => {
                  const next = [...splits];
                  next[i] = { ...next[i], amount: parseFloat(e.target.value) || 0 };
                  setSplits(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSplits(splits.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSplits([...splits, { categoryId: "", amount: 0 }])}
        >
          <Plus size={14} className="inline mr-1" />Add split
        </Button>
        {splits.length > 0 && (
          <div className={`text-xs mt-2 ${splitMismatch ? "text-amber-500" : "text-[var(--muted)]"}`}>
            Splits total {formatMoney(totalSplits, currency)} of {formatMoney(parseFloat(amount || "0"), currency)}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium mb-1.5 text-[var(--muted)]">Attachments (receipts)</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((a) => (
            <div key={a.id} className="relative">
              {a.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.dataUrl} alt={a.name} className="w-16 h-16 object-cover rounded-xl" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[var(--hover)] grid place-items-center text-xs px-1 text-center">
                  {a.name.slice(0, 12)}
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white grid place-items-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip size={14} className="inline mr-1" />Attach
        </Button>
      </div>

      <div className="flex gap-2 pt-2 sticky bottom-0 bg-[var(--card)] backdrop-blur-xl -mx-5 px-5 py-3 -mb-5">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save
        </Button>
      </div>
    </form>
  );
}
