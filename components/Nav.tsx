"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  CalendarDays,
  BarChart3,
  NotebookPen,
  Settings as SettingsIcon,
  FolderTree,
  Target,
  PiggyBank,
  Sparkles,
  Search,
  Clock,
  History,
} from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/transactions", label: "Activity", icon: Wallet },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/folders", label: "Folders", icon: FolderTree },
  { href: "/accounts", label: "Accounts", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/insights", label: "AI Insight", icon: Sparkles },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/activity", label: "Activity log", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const mobileItems = items.slice(0, 5);

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop side nav */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 p-4 flex-col gap-1 z-40">
        <div className="px-3 py-4 mb-2">
          <div className="text-2xl font-bold tracking-tight font-display accent-text">budget</div>
        </div>
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative tap"
            >
              <div
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${
                  active ? "" : "hover:bg-[var(--hover)]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl -z-10"
                    style={{ background: "var(--accent)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon size={18} strokeWidth={2} style={active ? { color: "var(--bg)" } : undefined} />
                <span
                  className="text-sm font-medium"
                  style={active ? { color: "var(--bg)" } : undefined}
                >
                  {it.label}
                </span>
              </div>
            </Link>
          );
        })}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="mx-3 mb-2 glass flex items-stretch justify-around p-1.5">
          {mobileItems.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="relative flex-1 tap"
              >
                <div
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl ${
                    active ? "" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill-mobile"
                      className="absolute inset-0 rounded-xl -z-10"
                      style={{ background: "var(--accent)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={20} strokeWidth={2} style={active ? { color: "var(--bg)" } : undefined} />
                  <span
                    className="text-[10px] font-medium"
                    style={active ? { color: "var(--bg)" } : undefined}
                  >
                    {it.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
