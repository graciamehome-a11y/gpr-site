import { createClient } from "@supabase/supabase-js";
import { urlSupabaseServeur } from "@/lib/supabaseUrl";

/**
 * Battement de cœur de la base — appelé chaque jour par un cron Vercel
 * (voir `vercel.json`). Une requête minuscule suffit à marquer le projet
 * Supabase comme actif et à empêcher sa mise en pause automatique après
 * plusieurs jours sans trafic (offres gratuites).
 *
 * Une base déjà en pause ne peut pas se réveiller elle-même : ce déclencheur
 * est donc EXTERNE (cron Vercel), pas un script interne à Postgres.
 *
 * Endpoint volontairement inoffensif : il ne renvoie aucune donnée métier.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // Si CRON_SECRET est défini (recommandé), on exige l'en-tête que Vercel Cron
  // envoie automatiquement. Sinon, l'endpoint reste ouvert mais sans effet utile.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = urlSupabaseServeur();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "configuration Supabase absente" },
      { status: 500 },
    );
  }

  const started = Date.now();
  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // HEAD + count : touche la base sans transférer de lignes.
    const { error } = await supabase
      .from("sites")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return Response.json({
      ok: true,
      pinged: "sites",
      ms: Date.now() - started,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "échec de la requête",
        ms: Date.now() - started,
      },
      { status: 502 },
    );
  }
}
