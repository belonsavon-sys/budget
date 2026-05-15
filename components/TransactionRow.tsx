"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Check,
  Trash2,
  Edit3,
  Clock,
  Paperclip,
  StickyNote,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { formatMoney, vibrate } from "@/lib/utils";
import Modal from "./Modal";
import TransactionForm from "./TransactionForm";

export default function TransactionRow({ txn }: { txn: Transaction }) {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const tags = useStore((s) => s.tags);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const removeTransaction = useStore((s) => s.removeTransaction);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const account = accounts.find((a) => a.id === txn.accountId);
  const toAccount = accounts.find((a) => a.id === txn.toAccountId);
  const category = categories.find((c) => c.id === txn.categoryId);
  const txnTags = tags.filter((t) => txn.tagIds.includes(t.id));

  const Icon =
    txn.type === "income" ? ArrowDownLeft : txn.type === "transfer" ? ArrowLeftRight : ArrowUpRight;
  const color =
    txn.type === "income" ? "#22c55e" : txn.type === "transfer" ? "#3b82f6" : "#ef4444";

  function togglePaid() {
    const next =
      txn.status === "paid" || txn.status === "received"
        ? "pending"
        : txn.type === "income"
        ? "received"
        : "paid";
    if (settings.hapticsEnabled) vibrate(10);
    updateTransaction(txn.id, { status: next, projected: false });
  }

  const opacity = txn.status === "projected" ? "opacity-60" : "";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -50 }}
        whileHover={{ scale: 1.005 }}
        className={`glass p-3 flex items-center gap-3 ${opacity}`}
      >
        <div
          className="w-10 h-10 rounded-full grid place-items-center text-white shrink-0"
          style={{ background: category?.color ?? color }}
        >
          <Icon size={16} strokeWidth={2.4} />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded((x) => !x)}
        >
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{txn.description || category?.name || "—"}</div>
            {txn.status === "projected" && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                projected
              </span>
            )}
            {txn.status === "pending" && (
              <Clock size={12} className="text-amber-500" />
            )}
            {txn.attachments?.length ? <Paperclip size={12} className="text-[var(--ink-muted)]" /> : null}
            {txn.notes ? <StickyNote size={12} className="text-[var(--ink-muted)]" /> : null}
          </div>
          <div className="text-xs text-[var(--ink-muted)] flex items-center gap-1.5 flex-wrap">
            <span>{new Date(txn.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <span>·</span>
            <span>
              {account?.name}
              {txn.type === "transfer" && toAccount ? ` → ${toAccount.name}` : ""}
            </span>
            {txnTags.map((t) => (
              <span key={t.id} className="px-1.5 py-0.5 rounded text-white text-[10px]" style={{ background: t.color }}>
                #{t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums" style={{ color: txn.type === "transfer" ? undefined : color }}>
            {txn.type === "expense" ? "−" : txn.type === "income" ? "+" : ""}
            {formatMoney(txn.amount, txn.currency)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={togglePaid}
            className={`tap w-8 h-8 rounded-full grid place-items-center ${
              txn.status === "paid" || txn.status === "received"
                ? "bg-green-500 text-white"
                : "bg-[var(--hover)] text-[var(--ink-muted)]"
            }`}
            aria-label="Mark paid"
          >
            <Check size={14} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 -mt-1 mb-1 overflow-hidden"
          >
            <div className="glass p-3 text-sm flex flex-col gap-2 rounded-t-none">
              {txn.notes && <div className="whitespace-pre-wrap text-[var(--ink-muted)]">{txn.notes}</div>}
              {txn.splits && txn.splits.length > 0 && (
                <div className="text-xs text-[var(--ink-muted)]">
                  Splits: {txn.splits.map((s, i) => (
                    <span key={i}>
                      {categories.find((c) => c.id === s.categoryId)?.name ?? "—"} {formatMoney(s.amount, txn.currency)}
                      {i < (txn.splits?.length ?? 0) - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
              {txn.attachments && txn.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {txn.attachments.map((a) =>
                    a.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={a.id} src={a.dataUrl} alt={a.name} className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <a key={a.id} href={a.dataUrl} download={a.name} className="text-xs underline">
                        {a.name}
                      </a>
                    )
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  className="tap text-xs px-3 py-1.5 rounded-lg bg-[var(--hover)] inline-flex items-center gap-1"
                  onClick={() => setEditing(true)}
                >
                  <Edit3 size={12} />Edit
                </button>
                <button
                  className="tap text-xs px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)] inline-flex items-center gap-1"
                  onClick={() => {
                    if (confirm("Delete this transaction?")) removeTransaction(txn.id);
                  }}
                >
                  <Trash2 size={12} />Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit transaction" size="md">
        <TransactionForm initial={txn} onDone={() => setEditing(false)} />
      </Modal>
    </>
  );
}
