import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/Theme/ThemeProvider";
import Nav from "@/components/Nav";
import QuickAddFAB from "@/components/QuickAddFAB";
import PinGate from "@/components/PinGate";
import { AuthProvider } from "@/lib/auth/context";
import { HouseholdProvider } from "@/lib/household/context";
import MigrationPrompt from "@/components/Migration/MigrationPrompt";
import SwRegister from "@/components/Sw/SwRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${playfair.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AuthProvider>
          <HouseholdProvider>
            <ThemeProvider />
            <PinGate>
              <Nav />
              <main className="md:pl-64 pb-28 md:pb-8 pt-4 px-4 md:px-8 safe-top max-w-6xl mx-auto md:mx-0">
                {children}
              </main>
              <QuickAddFAB />
            </PinGate>
            <MigrationPrompt />
            <SwRegister />
          </HouseholdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
