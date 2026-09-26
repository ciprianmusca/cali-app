import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { StoreHydration } from "@/components/layout/store-hydration";
import {
  OfflineSyncBar,
  ServiceWorkerRegister,
} from "@/components/layout/offline-sync";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "CALI-LAB · Forest observations",
  description:
    "PWA for scientific forest observations — phenology, disturbances and soil cover — for Climate-Smart Forestry.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CALI-LAB",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <StoreHydration />
        <ServiceWorkerRegister />
        <AppHeader />
        <OfflineSyncBar />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
