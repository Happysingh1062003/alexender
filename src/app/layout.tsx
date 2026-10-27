import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

// One professional typeface for everything. Greek covers the coin's inscription; Greek
// extended covers the breathing marks in the Ἀλέξανδρος wordmark.
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "greek", "greek-ext"] });

export const metadata: Metadata = {
  title: { default: "Ἀλέξανδρος", template: "%s · Ἀλέξανδρος" },
  description: "Your private command center — plan the day, conquer the mission.",
  appleWebApp: { capable: true, title: "Ἀλέξανδρος", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iPhone zooms into any field under 16px when tapped; this keeps the page still.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  // The on-screen keyboard shrinks the page instead of covering it, so what you type stays visible.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
