import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ThemePicker from "@/components/Theme/ThemePicker";

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <Link
          href="/settings"
          className="text-sm text-[var(--ink-muted)] inline-flex items-center gap-1 hover:underline"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 font-display">
          Theme
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Pick the personality of your app. Tap a card to apply instantly.
        </p>
      </header>
      <ThemePicker />
    </div>
  );
}
