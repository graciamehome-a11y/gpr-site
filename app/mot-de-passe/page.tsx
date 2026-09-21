import { supabaseServeur } from "@/lib/supabaseServerClient";
import FormulaireMotDePasse from "./FormulaireMotDePasse";

/**
 * Définir (arrivée depuis un lien d'invitation) ou changer son mot de passe.
 *
 * La page ne redirige volontairement PAS quand il n'y a pas encore de session :
 * un lien de réinitialisation peut livrer sa session dans le fragment d'URL
 * (`#access_token=…`), que le serveur ne voit jamais. C'est alors au navigateur
 * de la poser — le composant client s'en charge, et affiche un message clair si
 * le lien est expiré ou déjà utilisé.
 */
export default async function MotDePasse({ searchParams }: PageProps<"/mot-de-passe">) {
  const params = await searchParams;
  const premier = params.premier === "1";

  const supabase = await supabaseServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <FormulaireMotDePasse premier={premier} email={user?.email ?? ""} connecte={!!user} />
  );
}
