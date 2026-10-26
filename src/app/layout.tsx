import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

// One professional typeface for everything (Greek for the coin's inscription).
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "greek"] });

export const metadata: Metadata = {
  title: { default: "Alexander", template: "%s · Alexander" },
  description: "Your private command center — plan the day, conquer the mission.",
  appleWebApp: { capable: true, title: "Alexander", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
