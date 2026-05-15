"use client";

import { useEffect, useState } from "react";
import { Copy, Users, LogOut, Check, Pencil } from "lucide-react";
import { useHousehold } from "@/lib/household/context";
import { useAuth } from "@/lib/auth/context";
import { getBrowserSupabase } from "@/lib/db";
import { Field, Input, Button } from "@/components/Field";
import Link from "next/link";

interface Household {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
}

export default function HouseholdPage() {
  const { householdId, loading: hhLoading } = useHousehold();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hhLoading || !householdId) {
      if (!hhLoading) setLoading(false);
      return;
    }

    const sb = getBrowserSupabase();

    async function load() {
      setLoading(true);
      try {
        const { data: hh, error: hhErr } = await sb
          .from("households")
          .select("id, name, invite_code, owner_id, created_at")
          .eq("id", householdId!)
          .single() as unknown as { data: Household | null; error: Error | null };
        if (hhErr) throw hhErr;
        if (!hh) throw new Error("Household not found");
        setHousehold(hh);
        setNameValue(hh.name);

        const { data: mems, error: memErr } = await sb
          .from("household_members")
          .select("user_id, role, joined_at")
          .eq("household_id", householdId!) as unknown as { data: Member[] | null; error: Error | null };
        if (memErr) throw memErr;
        setMembers(mems ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [householdId, hhLoading]);

  async function saveName() {
    if (!household || !nameValue.trim()) return;
    setSaving(true);
    try {
      const sb = getBrowserSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb.from("households") as any).update({ name: nameValue.trim() }).eq("id", household.id);
      setHousehold({ ...household, name: nameValue.trim() });
      setEditingName(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteCode() {
    if (!household) return;
    await navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function leaveHousehold() {
    if (!household || !user) return;
    if (household.owner_id === user.id) {
      alert("You are the owner. Transfer ownership before leaving.");
      return;
    }
    if (!confirm("Leave this household? You will lose access to shared data.")) return;
    const sb = getBrowserSupabase();
    await sb.from("household_members").delete().eq("household_id", household.id).eq("user_id", user.id);
    window.location.href = "/settings";
  }

  if (loading || hhLoading) {
    return (
      <div className="space-y-6 pb-12">
        <header className="pt-2 md:pt-6">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Household</h1>
        </header>
        <div className="glass p-8 text-center text-[var(--ink-muted)] text-sm">Loading…</div>
      </div>
    );
  }

  if (!householdId || !household) {
    return (
      <div className="space-y-6 pb-12">
        <header className="pt-2 md:pt-6">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Household</h1>
        </header>
        <div className="glass p-8 text-center text-[var(--ink-muted)] text-sm">
          {error ? `Error: ${error}` : "No household found. Sign in to create one."}
        </div>
        <Link href="/settings" className="block text-center text-sm text-[var(--accent)] underline">
          Back to settings
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === household.owner_id;

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center gap-3">
        <Link href="/settings" className="tap p-2 rounded-full hover:bg-[var(--hover)] text-[var(--ink-muted)]">
          ←
        </Link>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Household</h1>
      </header>

      {error && (
        <div className="glass p-3 text-sm text-[var(--negative)]">{error}</div>
      )}

      {/* Household name */}
      <section className="glass p-5 space-y-4">
        <div className="text-sm font-semibold">Household name</div>
        {editingName ? (
          <div className="flex gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              autoFocus
              className="flex-1"
            />
            <Button onClick={saveName} disabled={saving} size="sm">Save</Button>
            <Button variant="ghost" onClick={() => { setEditingName(false); setNameValue(household.name); }} size="sm">Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">{household.name}</div>
            {isOwner && (
              <button
                onClick={() => setEditingName(true)}
                className="tap p-2 rounded-full hover:bg-[var(--hover)] text-[var(--ink-muted)]"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Invite code */}
      <section className="glass p-5 space-y-3">
        <div className="text-sm font-semibold">Invite code</div>
        <div className="text-xs text-[var(--ink-muted)]">
          Share this code with family or partners to join your household.
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-4 py-2.5 rounded-2xl font-mono text-sm tracking-widest"
            style={{ background: "var(--surface-2)", border: "1px solid var(--card-border)" }}
          >
            {household.invite_code}
          </div>
          <button
            onClick={copyInviteCode}
            className="tap flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {/* Members */}
      <section className="glass p-5 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Users size={14} />
          Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div className="text-sm text-[var(--ink-muted)]">No members found.</div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: "var(--surface-2)" }}
              >
                <div>
                  <div className="text-sm font-medium font-mono">
                    {m.user_id.slice(0, 8)}…
                    {m.user_id === user?.id && (
                      <span className="ml-2 text-xs text-[var(--accent)]">(you)</span>
                    )}
                    {m.user_id === household.owner_id && (
                      <span className="ml-2 text-xs text-amber-500">owner</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] capitalize">{m.role} · joined {new Date(m.joined_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Leave household (non-owner only) */}
      {!isOwner && (
        <section className="glass p-5 space-y-3">
          <div className="text-sm font-semibold">Danger zone</div>
          <Button
            variant="danger"
            onClick={leaveHousehold}
            className="flex items-center gap-2"
          >
            <LogOut size={14} />
            Leave household
          </Button>
          <div className="text-xs text-[var(--ink-muted)]">
            You will lose access to all shared data in this household.
          </div>
        </section>
      )}
    </div>
  );
}
