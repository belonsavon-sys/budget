import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeBridge from "@/components/ThemeBridge";
import Aurora from "@/components/Aurora";
import Nav from "@/components/Nav";
import QuickAddFAB from "@/components/QuickAddFAB";
import PinGate from "@/components/PinGate";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "budget",
  description: "Your personal budget",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "budget",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeBridge />
        <Aurora />
        <PinGate>
          <Nav />
          <main className="md:pl-64 pb-28 md:pb-8 pt-4 px-4 md:px-8 safe-top max-w-6xl mx-auto md:mx-0">
            {children}
          </main>
          <QuickAddFAB />
        </PinGate>
      </body>
    </html>
  );
}
