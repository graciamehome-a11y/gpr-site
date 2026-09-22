import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { urlSupabaseServeur } from "@/lib/supabaseUrl";

// Dans cette version de Next.js, "middleware.ts" a été renommé "proxy.ts"
// (voir node_modules/next/dist/docs/.../file-conventions/proxy.md).

// Routes accessibles sans session.
//  - /auth/confirm        : reçoit le lien d'invitation ou de réinitialisation et
//                           ouvre la session — sans elle, le lien serait redirigé
//                           vers /login et ne servirait jamais à rien.
//  - /mot-de-passe        : doit rester joignable AVANT que la session existe, car
//                           un lien peut livrer sa session dans le fragment d'URL
//                           (#access_token=…), que le serveur ne voit pas. La page
//                           affiche elle-même un message clair si le lien est mort.
//  - /mot-de-passe-oublie : demande de réinitialisation, par définition sans session.
const ROUTES_PUBLIQUES = [
  "/login",
  "/offline",
  "/api/keep-alive",
  "/auth/confirm",
  "/mot-de-passe",
  "/mot-de-passe-oublie",
];

export default async function proxy(request: NextRequest) {
  // Le chemin est transmis aux composants serveur via un en-tête : cela leur
  // permet de savoir sur quelle page ils se trouvent (Next.js ne l'expose pas
  // autrement), ce dont le layout a besoin pour rediriger une personne qui doit
  // encore choisir son mot de passe — sans la rediriger depuis cette page même.
  const entetes = new Headers(request.headers);
  entetes.set("x-chemin", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: entetes } });

  const supabase = createServerClient(
    urlSupabaseServeur(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAList) {
          cookiesAList.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: entetes } });
          cookiesAList.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estRoutePublique = ROUTES_PUBLIQUES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!user && !estRoutePublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("suivant", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // On exclut aussi les fichiers PWA servis depuis /public (sw.js, manifeste,
  // icônes) : ils doivent rester accessibles sans session, sinon le service
  // worker ne peut pas s'enregistrer.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|ico|webmanifest)$).*)",
  ],
};
