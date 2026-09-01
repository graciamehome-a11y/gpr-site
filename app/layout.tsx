import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/app/components/Navbar";
import PWA from "@/app/components/PWA";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "GPR",
  title: "GPR — Gestion des Pièces & Réparations",
  description:
    "Suivi du stock de pièces, des véhicules, des bons de demande et du carburant.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GPR" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-neutral-50 antialiased dark:bg-neutral-950`}
    >
      <body className="flex min-h-full flex-col text-neutral-900 dark:text-neutral-100">
        <PWA />
        <Navbar />
        <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      </body>
    </html>
  );
}
