import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { urlSupabaseServeur } from "@/lib/supabaseUrl";

/**
 * Reçoit les liens envoyés par email (invitation, réinitialisation de mot de
 * passe) et les échange contre une vraie session.
 *
 * Sans cette route, un lien d'invitation aboutissait sur la page d'accueil sans
 * jamais connecter la personne : elle ne pouvait donc pas définir de mot de
 * passe et restait définitivement incapable de se connecter. C'était l'une des
 * causes du blocage constaté en production.
 *
 * Le lien arrive ici sous la forme :
 *   /auth/confirm?token_hash=…&type=invite&next=/mot-de-passe
 * (à configurer dans Supabase → Authentication → Emails : utiliser
 * `{{ .TokenHash }}` et pointer vers cette route — voir AUDIT-2026-09-21.md.)
 *
 * Les cookies de session sont posés directement sur la réponse de redirection :
 * sans ça, la personne arriverait sur la page suivante sans être connectée.
 */

const TYPES_ACCEPTES: EmailOtpType[] = [
  "invite",
  "recovery",
  "email",
  "email_change",
  "magiclink",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const suivant = searchParams.get("next");

  // Les cookies de session sont d'abord collectés, puis posés sur la réponse de
  // redirection définitive — on ne sait qu'après `verifyOtp` où l'on va.
  let cookiesDeSession: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(
    urlSupabaseServeur(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAList) {
          cookiesDeSession = cookiesAList;
        },
      },
    },
  );

  function rediriger(chemin: string, params?: Record<string, string>) {
    const url = request.nextUrl.clone();
    url.pathname = chemin;
    url.search = params ? `?${new URLSearchParams(params)}` : "";

    const reponse = NextResponse.redirect(url);
    cookiesDeSession.forEach(({ name, value, options }) =>
      reponse.cookies.set(name, value, options),
    );
    return reponse;
  }

  if (!token_hash || !type || !TYPES_ACCEPTES.includes(type)) {
    return rediriger("/login", { erreur: "lien-invalide" });
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    // Lien déjà utilisé, expiré, ou ouvert depuis un autre navigateur.
    return rediriger("/login", { erreur: "lien-expire" });
  }

  if (suivant?.startsWith("/")) {
    return rediriger(suivant);
  }

  // Une invitation ou une réinitialisation doit amener la personne à choisir
  // son mot de passe ; les autres types de lien sont de simples connexions.
  return type === "invite" || type === "recovery"
    ? rediriger("/mot-de-passe", { premier: "1" })
    : rediriger("/");
}
