import { Header } from "@/components/Header";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab AI — Experiment Analysis Platform",
  description: "Import, visualize, and analyze research experiment data with AI-powered advice.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-1.5 focus:text-black"
        >
          メインコンテンツへスキップ
        </a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </div>
        <OfflineIndicator />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
