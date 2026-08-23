import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { urlSupabaseServeur } from "./supabaseUrl";

/**
 * Client Supabase côté serveur : lit/écrit la session via les cookies Next.js,
 * donc chaque requête est exécutée avec le JWT de la personne connectée
 * et les RLS s'appliquent automatiquement (filtrage par rôle/site).
 * À utiliser dans les Server Components et les Server Actions — jamais dans un composant "use client".
 */
export async function supabaseServeur() {
  const cookieStore = await cookies();

  return createServerClient(
    urlSupabaseServeur(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesAList) {
          try {
            cookiesAList.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component (lecture seule) : la session
            // sera rafraîchie par le proxy à la prochaine requête, sans risque.
          }
        },
      },
    },
  );
}
