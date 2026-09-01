import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" sert au Dockerfile (image minimale pour l'auto-hébergement).
  // Vercel gère sa propre sortie de build et ce mode entre en conflit avec elle
  // (échec "Output Directory public is empty") — désactivé quand VERCEL=1.
  output: process.env.VERCEL ? undefined : "standalone",

  // Détection de connectivité + relance automatique des navigations et des
  // Server Actions échouées quand le réseau revient (complète le service worker).
  experimental: {
    useOffline: true,
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
