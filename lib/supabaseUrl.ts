/**
 * URL Supabase à utiliser côté serveur (Server Components, Server Actions, proxy.ts).
 *
 * En local via `npm run dev`, le serveur Next.js tourne directement sur l'hôte :
 * NEXT_PUBLIC_SUPABASE_URL (ex. http://127.0.0.1:55321) fonctionne tel quel.
 *
 * En local via Docker (`docker compose up`), le serveur Next.js tourne DANS un
 * conteneur : "localhost" y désigne le conteneur lui-même, pas l'hôte où tourne
 * le stack Supabase. SUPABASE_URL_INTERNE (ex. http://host.docker.internal:55321,
 * défini uniquement dans docker-compose.yml) permet au serveur de l'atteindre
 * quand même, sans changer l'URL vue par le navigateur (NEXT_PUBLIC_SUPABASE_URL,
 * qui doit rester "localhost" pour rester joignable depuis la machine de l'utilisateur).
 */
export function urlSupabaseServeur() {
  return process.env.SUPABASE_URL_INTERNE || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}
