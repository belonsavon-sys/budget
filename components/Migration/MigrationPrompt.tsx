"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, X } from "lucide-react";
import { detectLegacyData } from "@/lib/migration/detect";
import { importLocalToSupabase } from "@/lib/migration/import";
import type { LegacyDataReport } from "@/lib/migration/types";
import { getBrowserSupabase } from "@/lib/db";
import { useAuth } from "@/lib/auth/context";
import { useHousehold } from "@/lib/household/context";

const DISMISS_KEY = "budget-migration-prompt-dismissed-v1";

export default function MigrationPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { householdId, isNew, loading: hhLoading } = useHousehold();
  const [report, setReport] = useState<LegacyDataReport | null>(null);
  const [state, setState] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (authLoading || hhLoading) return;
    if (!user || !householdId || !isNew || dismissed) {
      setReport(null);
      return;
    }
    setReport(detectLegacyData());
  }, [authLoading, hhLoading, user, householdId, isNew, dismissed]);

  const show = useMemo(
    () => !!report?.has && state !== "done",
    [report, state]
  );

  async function doImport() {
    if (!report?.payload || !householdId) return;
    setState("importing");
    setErrorMsg(undefined);
    const sb = getBrowserSupabase();
    const { inserted, errors } = await importLocalToSupabase(report.payload, householdId, sb);
    if (errors.length) {
      setErrorMsg(errors.join("; "));
      setState("error");
      return;
    }
    setCounts(inserted);
    setState("done");
    localStorage.setItem(DISMISS_KEY, "1");
  }

  function startFresh() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="w-full max-w-md glass p-6 relative"
          >
            <button
              onClick={startFresh}
              aria-label="Dismiss"
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--hover)]"
            >
              <X size={16} />
            </button>

            {state === "done" ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-green-500">
                  <Sparkles size={18} />
                  <h2 className="text-lg font-semibold">All set</h2>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Imported {counts?.transactions ?? 0} transactions, {counts?.accounts ?? 0} accounts,
                  and {counts?.savings_goals ?? 0} goals. You can now use the app from any device.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl gradient-fill flex items-center justify-center text-white">
                    <Upload size={18} />
                  </div>
                  <h2 className="text-lg font-semibold">Bring your data along?</h2>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  We found existing data on this device.
                  Import it so you can pick up where you left off — across all your devices.
                </p>
                <div className="rounded-xl bg-[var(--hover)] p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  {(["transactions","accounts","recurring","goals","budgets","notes","reminders"] as const).map((k) =>
                    report?.counts[k] ? (
                      <span key={k} className="tabular-nums">
                        <strong>{report.counts[k]}</strong>{" "}
                        <span className="text-[var(--muted)]">{k}</span>
                      </span>
                    ) : null
                  )}
                </div>
                {state === "error" && (
                  <div className="text-sm text-red-500">{errorMsg ?? "Import failed."}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={doImport}
                    disabled={state === "importing"}
                    className="tap flex-1 gradient-fill text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
                  >
                    {state === "importing" ? "Importing…" : "Import everything"}
                  </button>
                  <button
                    onClick={startFresh}
                    disabled={state === "importing"}
                    className="tap px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--hover)]"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
