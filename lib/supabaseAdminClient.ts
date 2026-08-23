import "server-only";
import { createClient } from "@supabase/supabase-js";
import { urlSupabaseServeur } from "./supabaseUrl";

/**
 * Client "service_role" : contourne toutes les RLS. Réservé aux actions serveur
 * d'administration (création de comptes). Ne JAMAIS importer ce fichier depuis
 * un composant "use client" ni renvoyer ce client au navigateur.
 *
 * SUPABASE_SERVICE_ROLE_KEY doit être ajoutée à .env.local (jamais préfixée
 * NEXT_PUBLIC_). Tant qu'elle est absente, les actions qui en dépendent
 * (création de comptes) échoueront proprement avec un message clair.
 */
export function supabaseAdmin() {
  const url = urlSupabaseServeur();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local — nécessaire pour créer des comptes.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
