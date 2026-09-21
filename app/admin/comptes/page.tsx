import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { libelleRole } from "@/lib/libelles";
import { Aide, Astuce, Carte, Conteneur, SousTitre, TitrePage } from "@/app/components/ui";
import FormulaireCompte from "./FormulaireCompte";
import LigneCompte, { type CompteAffiche } from "./LigneCompte";

type Compte = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  auth_id: string | null;
  roles: { nom: string } | null;
  sites: { nom: string } | null;
};

/** Table `auth_id` → date de dernière connexion, lue via l'API d'administration. */
async function datesDeConnexion(): Promise<Map<string, string> | null> {
  try {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ perPage: 200 });
    if (error || !data) return null;
    const map = new Map<string, string>();
    for (const utilisateur of data.users) {
      if (utilisateur.last_sign_in_at) {
        map.set(
          utilisateur.id,
          new Date(utilisateur.last_sign_in_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        );
      }
    }
    return map;
  } catch {
    // Sans la clé service_role, on affiche simplement la liste sans cette colonne.
    return null;
  }
}

export default async function AdminComptes() {
  const utilisateur = await getUtilisateurConnecte();
  if (!aVueGlobale(utilisateur)) redirect("/");

  const supabase = await supabaseServeur();
  const [{ data: comptes }, { data: roles }, { data: sites }, connexions] = await Promise.all([
    supabase
      .from("utilisateurs")
      .select("id, nom, prenom, email, auth_id, roles(nom), sites(nom)")
      .order("nom")
      .returns<Compte[]>(),
    supabase.from("roles").select("id, nom").order("id"),
    supabase.from("sites").select("id, nom").order("nom"),
    datesDeConnexion(),
  ]);

  const lignes: CompteAffiche[] = (comptes ?? []).map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    role: c.roles?.nom ? libelleRole(c.roles.nom) : "—",
    site: c.sites?.nom ?? "Tous les sites",
    aUneConnexion: !!c.auth_id,
    derniereConnexion: connexions
      ? (c.auth_id ? (connexions.get(c.auth_id) ?? null) : null)
      : undefined,
  }));

  const jamaisConnectes = lignes.filter((l) => l.derniereConnexion === null).length;

  return (
    <Conteneur>
      <TitrePage
        titre="Comptes"
        icone="comptes"
        description="Création réservée aux rôles à vue globale. Le mot de passe temporaire s'affiche une seule fois : transmettez-le à la personne."
      />

      {connexions === null && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          La date de dernière connexion n&apos;est pas disponible : la clé
          <code className="mx-1">SUPABASE_SERVICE_ROLE_KEY</code> est absente de la configuration.
          La création de comptes ne fonctionnera pas non plus sans elle.
        </p>
      )}

      {jamaisConnectes > 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {jamaisConnectes} personne{jamaisConnectes > 1 ? "s ne se sont" : " ne s'est"} jamais
          connectée{jamaisConnectes > 1 ? "s" : ""}. Utilisez « Réinitialiser le mot de passe » sur
          sa ligne pour lui en générer un.
        </p>
      )}

      <Aide titre="Créer un compte : la marche à suivre">
        <p>
          <strong>1. Remplissez le formulaire</strong> ci-dessous : prénom, nom, email, rôle, et le
          site si la personne n&apos;a pas de vue d&apos;ensemble.
        </p>
        <p>
          <strong>2. Un mot de passe temporaire s&apos;affiche immédiatement</strong> — une seule
          fois. Notez-le ou copiez-le à ce moment-là : il ne sera plus jamais montré. Si vous le
          perdez, il suffit d&apos;en générer un nouveau avec le bouton de réinitialisation.
        </p>
        <p>
          <strong>3. Transmettez-le à la personne</strong>, de vive voix ou par un message
          qu&apos;elle seule recevra. Le compte fonctionne dès cet instant.
        </p>
        <p>
          <strong>4. Elle pourra le changer</strong> à sa première connexion, grâce à
          l&apos;icône en forme de clé en haut à droite.
        </p>
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <strong>Aucun email n&apos;est envoyé</strong>, et c&apos;est volontaire : ce service
          n&apos;est pas encore équipé pour en envoyer de façon fiable. C&apos;est pourquoi le mot
          de passe s&apos;affiche à l&apos;écran — sinon la personne n&apos;aurait aucun moyen de
          se connecter.
        </p>
      </Aide>

      <Carte className="mb-6">
        <SousTitre>Nouveau compte</SousTitre>
        <div className="mb-3">
          <Astuce>
            Le mot de passe temporaire s&apos;affiche <strong>juste après la création</strong>.
            Notez-le à ce moment-là et transmettez-le à la personne.
          </Astuce>
        </div>
        <FormulaireCompte
          roles={(roles ?? []).map((r) => ({ id: r.id, libelle: libelleRole(r.nom) }))}
          sites={sites ?? []}
        />
      </Carte>

      <ul className="space-y-2">
        {lignes.map((compte) => (
          <li key={compte.id}>
            <LigneCompte compte={compte} />
          </li>
        ))}
      </ul>
    </Conteneur>
  );
}
