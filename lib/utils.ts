import type { Currency, Transaction, Account } from "./types";

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  INR: "₹",
  MXN: "MX$",
  BRL: "R$",
  KRW: "₩",
  SGD: "S$",
  HKD: "HK$",
  NZD: "NZ$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  ZAR: "R",
};

export function formatMoney(amount: number, currency: Currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] ?? "$"}${amount.toFixed(2)}`;
  }
}

export function shortMoney(amount: number, currency: Currency = "USD") {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const sym = CURRENCY_SYMBOLS[currency] ?? "$";
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

export function folderKey(dateStr: string) {
  const d = new Date(dateStr);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    key: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
  };
}

export function monthName(month: number) {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][month - 1];
}

export function timeGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Working late", icon: "moon" };
  if (h < 12) return { text: "Good morning", icon: "sun" };
  if (h < 17) return { text: "Good afternoon", icon: "sun" };
  if (h < 21) return { text: "Good evening", icon: "sunset" };
  return { text: "Good night", icon: "moon" };
}

export function effectiveAmount(txn: Transaction) {
  if (txn.type === "expense") return -Math.abs(txn.amount);
  if (txn.type === "income") return Math.abs(txn.amount);
  return 0;
}

export function accountBalance(account: Account, txns: Transaction[]) {
  let bal = account.startingBalance;
  for (const t of txns) {
    if (t.accountId === account.id) {
      if (t.type === "expense") bal -= t.amount;
      else if (t.type === "income") bal += t.amount;
      else if (t.type === "transfer") bal -= t.amount;
    }
    if (t.type === "transfer" && t.toAccountId === account.id) {
      bal += t.amount;
    }
  }
  return bal;
}

export function netWorth(accounts: Account[], txns: Transaction[], includeProjected = false) {
  const filtered = includeProjected ? txns : txns.filter((t) => t.status !== "projected");
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => {
      const bal = accountBalance(a, filtered);
      return sum + (a.type === "credit" ? -bal : bal);
    }, 0);
}

export async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export function downloadFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsText(file);
  });
}

export function classNames(...arr: (string | false | null | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
