"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Field, Input, Select } from "@/components/Field";
import { Search, Wallet, Check, Clock, Edit3, Trash2 } from "lucide-react";
import { folderKey, monthName, formatMoney, vibrate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BulkBar from "@/components/Transactions/BulkBar";
import EmptyState from "@/components/Common/EmptyState";
import PageHeader from "@/components/Editorial/PageHeader";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import type { Transaction } from "@/lib/types";

// Ledger row — surgical inline component (no glass card, hairline separated)
function LedgerTxnRow({
  txn,
  selected,
  onToggleSelect,
  hasSelection,
}: {
  txn: Transaction;
  selected: boolean;
  onToggleSelect: () => void;
  hasSelection: boolean;
}) {
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const tags = useStore((s) => s.tags);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const removeTransaction = useStore((s) => s.removeTransaction);
  const [editing, setEditing] = useState(false);

  const category = categories.find((c) => c.id === txn.categoryId);
  const account = accounts.find((a) => a.id === txn.accountId);
  const txnTags = tags.filter((t) => txn.tagIds.includes(t.id));

  const color =
    txn.type === "income"
      ? "var(--positive)"
      : txn.type === "transfer"
      ? "var(--accent-2)"
      : "var(--negative)";

  const dateObj = new Date(txn.date);
  const dayNum = dateObj.getUTCDate();
  const isProjected = txn.status === "projected";

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

  return (
    <>
      <div
        className={`flex items-baseline gap-0 py-2.5 border-b border-[var(--hairline)] group transition-colors hover:bg-[var(--hover)] ${
          isProjected ? "opacity-55" : ""
        } ${selected ? "bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]" : ""}`}
      >
        {/* Checkbox */}
        <div className="w-6 shrink-0 flex items-center justify-center self-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className={`w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer transition-opacity ${
              hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-40"
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Day column */}
        <div className="w-8 shrink-0 font-display italic text-sm text-[var(--ink-muted)] text-right pr-3 self-center">
          {dayNum}
        </div>

        {/* Description + meta */}
        <div className="flex-1 min-w-0 pr-3">
          <div
            className="font-display italic text-sm leading-snug truncate cursor-pointer"
            onClick={() => setEditing(true)}
          >
            {txn.description || category?.name || "—"}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {category && (
              <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                {category.name}
              </span>
            )}
            {account && (
              <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)] opacity-60">
                {account.name}
              </span>
            )}
            {txnTags.map((t) => (
              <span
                key={t.id}
                className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: `${t.color}22`, color: t.color }}
              >
                {t.name}
              </span>
            ))}
            {isProjected && (
              <span className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                projected
              </span>
            )}
            {txn.status === "pending" && (
              <Clock size={10} className="text-amber-500" />
            )}
          </div>
        </div>

        {/* Amount */}
        <div
          className="font-display font-semibold text-sm tabular-nums shrink-0 pr-2"
          style={{ color, fontFeatureSettings: '"tnum", "lnum"', letterSpacing: "0" }}
        >
          {txn.type === "expense" ? "−" : txn.type === "income" ? "+" : ""}
          {formatMoney(txn.amount, txn.currency)}
        </div>

        {/* Status toggle */}
        <div className="shrink-0 self-center">
          <button
            onClick={togglePaid}
            className={`tap w-7 h-7 rounded-full grid place-items-center transition-colors ${
              txn.status === "paid" || txn.status === "received"
                ? "bg-[var(--positive)] text-[var(--bg)]"
                : "bg-transparent text-[var(--ink-muted)] border border-[var(--hairline)] opacity-0 group-hover:opacity-100"
            }`}
            aria-label="Mark paid"
          >
            <Check size={12} />
          </button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit transaction" size="md">
        <TransactionForm initial={txn} onDone={() => setEditing(false)} />
      </Modal>
    </>
  );
}

export default function TransactionsPage() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const tags = useStore((s) => s.tags);
  const settings = useStore((s) => s.settings);

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showProjected, setShowProjected] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => showProjected || t.status !== "projected")
      .filter((t) => filterType === "all" || t.type === filterType)
      .filter((t) => filterCat === "all" || t.categoryId === filterCat)
      .filter((t) => filterAcc === "all" || t.accountId === filterAcc)
      .filter((t) => filterTag === "all" || t.tagIds.includes(filterTag))
      .filter((t) => filterStatus === "all" || t.status === filterStatus)
      .filter(
        (t) =>
          !q ||
          t.description.toLowerCase().includes(q.toLowerCase()) ||
          (t.notes ?? "").toLowerCase().includes(q.toLowerCase())
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, q, filterType, filterCat, filterAcc, filterTag, filterStatus, showProjected]);

  // Group by day (YYYY-MM-DD) within folders
  const dayGroups = useMemo(() => {
    const map = new Map<string, { date: Date; dateIso: string; items: typeof filtered }>();
    for (const t of filtered) {
      const iso = t.date.slice(0, 10);
      if (!map.has(iso)) {
        map.set(iso, { date: new Date(iso + "T00:00:00Z"), dateIso: iso, items: [] });
      }
      map.get(iso)!.items.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasSelection = selectedIds.size > 0;

  // Byline: count + this-month total
  const now = new Date();
  const thisMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      t.status !== "projected"
    );
  });
  const thisMonthTotal = thisMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const byline = `${filtered.length} entries · ${formatMoney(thisMonthTotal, settings.currency)} recorded this month`;

  // Day label helper
  function dayEyebrow(date: Date, dateIso: string): string {
    const todayIso = new Date().toISOString().slice(0, 10);
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const weekday = date
      .toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
      .toUpperCase();
    const month = date
      .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase();
    const day = date.getUTCDate();

    const base = `${weekday} · ${month} ${day}`;

    if (dateIso === todayIso) return `TODAY · ${month} ${day}`;
    if (dateIso === yesterdayIso) return `YESTERDAY · ${month} ${day}`;
    if (dateIso >= weekAgo) return `EARLIER THIS WEEK · ${base}`;
    return base;
  }

  return (
    <div className="space-y-4 pb-12">
      <PageHeader eyebrow="LEDGER" title="Transactions" byline={byline} />

      <div className="glass p-3 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search descriptions and notes…"
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>#{t.name}</option>
            ))}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Any status</option>
            <option value="paid">Paid</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="projected">Projected</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)] px-2">
          <input
            type="checkbox"
            checked={showProjected}
            onChange={(e) => setShowProjected(e.target.checked)}
          />
          Show projected transactions
        </label>
      </div>

      <div className="space-y-6">
        {dayGroups.length === 0 ? (
          <EmptyState
            icon={<Wallet size={24} />}
            title={transactions.length === 0 ? "No transactions yet" : "No results"}
            description={transactions.length === 0 ? "Tap + to add your first transaction." : "Try adjusting the filters."}
          />
        ) : (
          dayGroups.map(([iso, g], idx) => {
            const dayIncome = g.items
              .filter((t) => t.type === "income")
              .reduce((s, t) => s + t.amount, 0);
            const dayExpense = g.items
              .filter((t) => t.type === "expense")
              .reduce((s, t) => s + t.amount, 0);
            const eyebrow = dayEyebrow(g.date, iso);

            return (
              <motion.section
                key={iso}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                {/* Day-group header — sticky so it floats while scrolling */}
                <div className="sticky top-0 z-10 flex items-baseline justify-between pb-1.5 mb-0 border-b border-[var(--hairline)]"
                  style={{ background: "var(--bg)" }}
                >
                  <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                    {eyebrow}
                  </div>
                  <div className="text-[10px] text-[var(--ink-muted)] tabular-nums font-display italic">
                    {dayIncome > 0 && (
                      <span style={{ color: "var(--positive)" }}>+{formatMoney(dayIncome, settings.currency)}</span>
                    )}
                    {dayIncome > 0 && dayExpense > 0 && " · "}
                    {dayExpense > 0 && (
                      <span style={{ color: "var(--negative)" }}>−{formatMoney(dayExpense, settings.currency)}</span>
                    )}
                  </div>
                </div>

                {/* Ledger column header (only on first group) */}
                {idx === 0 && (
                  <div className="flex items-baseline gap-0 py-1 border-b border-[var(--hairline)]">
                    <div className="w-6 shrink-0" />
                    <div className="w-8 shrink-0" />
                    <div className="flex-1 text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)] pr-3">
                      Description
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)] pr-2">
                      Amount
                    </div>
                    <div className="w-7 shrink-0" />
                  </div>
                )}

                {g.items.map((t) => (
                  <LedgerTxnRow
                    key={t.id}
                    txn={t}
                    selected={selectedIds.has(t.id)}
                    onToggleSelect={() => toggleSelect(t.id)}
                    hasSelection={hasSelection}
                  />
                ))}
              </motion.section>
            );
          })
        )}
      </div>

      <BulkBar
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
