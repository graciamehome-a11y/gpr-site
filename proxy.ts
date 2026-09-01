import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { urlSupabaseServeur } from "@/lib/supabaseUrl";

// Dans cette version de Next.js, "middleware.ts" a été renommé "proxy.ts"
// (voir node_modules/next/dist/docs/.../file-conventions/proxy.md).

const ROUTES_PUBLIQUES = ["/login", "/offline"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
