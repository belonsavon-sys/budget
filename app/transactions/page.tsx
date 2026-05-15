"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import TransactionRow from "@/components/TransactionRow";
import { Field, Input, Select } from "@/components/Field";
import { Search, Wallet } from "lucide-react";
import { folderKey, monthName, formatMoney } from "@/lib/utils";
import { motion } from "framer-motion";
import BulkBar from "@/components/Transactions/BulkBar";
import EmptyState from "@/components/Common/EmptyState";

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

  // group by folder (year/month)
  const groups = useMemo(() => {
    const map = new Map<string, { year: number; month: number; items: typeof filtered }>();
    for (const t of filtered) {
      const fk = folderKey(t.date);
      const k = fk.key;
      if (!map.has(k)) map.set(k, { year: fk.year, month: fk.month, items: [] });
      map.get(k)!.items.push(t);
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

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">{filtered.length} transactions</p>
      </header>

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
        {groups.length === 0 ? (
          <EmptyState
            icon={<Wallet size={24} />}
            title={transactions.length === 0 ? "No transactions yet" : "No results"}
            description={transactions.length === 0 ? "Tap + to add your first transaction." : "Try adjusting the filters."}
          />
        ) : (
          groups.map(([k, g], idx) => {
            const income = g.items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
            const expense = g.items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
            return (
              <motion.section
                key={k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="space-y-2"
              >
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-lg font-semibold">
                    {monthName(g.month)} <span className="text-[var(--ink-muted)]">{g.year}</span>
                  </h2>
                  <div className="text-xs text-[var(--ink-muted)] tabular-nums">
                    +{formatMoney(income, settings.currency)} · −{formatMoney(expense, settings.currency)}
                  </div>
                </div>
                <div className="space-y-1">
                  {g.items.map((t) => (
                    <div key={t.id} className="flex items-start gap-2">
                      <div className="mt-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className={`w-4 h-4 accent-[var(--accent)] cursor-pointer transition-opacity ${
                            hasSelection ? "opacity-100" : "opacity-0 md:opacity-30 hover:opacity-100"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <TransactionRow txn={t} />
                      </div>
                    </div>
                  ))}
                </div>
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
