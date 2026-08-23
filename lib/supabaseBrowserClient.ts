import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur, pour les composants "use client" qui ont
 * besoin d'appeler Supabase directement (ex. rafraîchissement en direct).
 * Respecte la même session que le serveur grâce aux cookies partagés.
 */
export function supabaseNavigateur() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
