import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { DemoSandboxBanner } from "@/components/layout/demo-sandbox-banner";
import { LocaleDocument } from "@/components/layout/locale-document";
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
  title: {
    default: "CALI-LAB · Observații de teren pentru pădurile de mâine",
    template: "%s · CALI-LAB",
  },
  description:
    "Fenologie, perturbări și sol, documentate de oameni și validate de specialiști. Pilot în Parcul Național Călimani.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "CALI-LAB",
    title: "CALI-LAB · Observații de teren pentru pădurile de mâine",
    description:
      "Fenologie, perturbări și sol, documentate de oameni și validate de specialiști. Pilot în Parcul Național Călimani.",
    images: [
      {
        url: "/og-cali-lab.png",
        width: 1200,
        height: 630,
        alt: "CALI-LAB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CALI-LAB",
    description:
      "Field observations for tomorrow's forests — phenology, disturbances and soil.",
    images: ["/og-cali-lab.png"],
  },
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
        <LocaleDocument />
        <ServiceWorkerRegister />
        <AppHeader />
        <DemoSandboxBanner />
        <OfflineSyncBar />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
