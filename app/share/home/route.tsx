import { ImageResponse } from "next/og";
import { THEMES, type ThemeId } from "@/lib/themes";

export const runtime = "edge";

function fmt(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const value = Number(url.searchParams.get("value") ?? "0");
  const currency = url.searchParams.get("currency") ?? "USD";
  const themeId = (url.searchParams.get("theme") ?? "architectural") as ThemeId;
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: t.swatchBg,
          color: t.swatchAccent,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 96,
          fontFamily: "Georgia",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, opacity: 0.55, textTransform: "uppercase" }}>
          Net worth
        </div>
        <div style={{ display: "flex", fontSize: 192, fontWeight: 700, lineHeight: 1, marginTop: 24 }}>
          {fmt(value, currency)}
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 28, opacity: 0.6 }}>
          {`budget · ${t.name}`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
