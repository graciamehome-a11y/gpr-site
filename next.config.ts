import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" sert au Dockerfile (image minimale pour l'auto-hébergement).
  // Vercel gère sa propre sortie de build et ce mode entre en conflit avec elle
  // (échec "Output Directory public is empty") — désactivé quand VERCEL=1.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
