import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { creerCompte } from "./actions";
import { BoutonPrincipal, Carte, Champ, Selecteur, TitrePage } from "@/app/components/ui";

type Compte = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  roles: { nom: string } | null;
  sites: { nom: string } | null;
};

export default async function AdminComptes() {
  const utilisateur = await getUtilisateurConnecte();
  if (!aVueGlobale(utilisateur)) redirect("/");

  const supabase = await supabaseServeur();
  const { data: comptes } = await supabase
    .from("utilisateurs")
    .select("id, nom, prenom, email, roles(nom), sites(nom)")
    .order("nom")
    .returns<Compte[]>();

  const { data: roles } = await supabase.from("roles").select("id, nom").order("id");
  const { data: sites } = await supabase.from("sites").select("id, nom").order("nom");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <TitrePage
        titre="Comptes"
        description="Création réservée aux rôles à vue globale. Un email d'invitation est envoyé pour définir le mot de passe."
      />

      <Carte className="mb-6">
        <form action={creerCompte} className="grid grid-cols-2 gap-3">
          <Champ label="Prénom" name="prenom" required autoFocus />
          <Champ label="Nom" name="nom" required />
          <div className="col-span-2">
            <Champ label="Email" name="email" type="email" required />
          </div>
          <div className="col-span-2">
            <Selecteur label="Rôle" name="role_id" required defaultValue="">
              <option value="" disabled>
                -- choisir --
              </option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {libelleRole(r.nom)}
                </option>
              ))}
            </Selecteur>
          </div>
          <div className="col-span-2">
            <Selecteur label="Site (si applicable)" name="site_id" defaultValue="">
              <option value="">— aucun (vue globale) —</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Selecteur>
          </div>
          <div className="col-span-2">
            <BoutonPrincipal type="submit">Créer le compte</BoutonPrincipal>
          </div>
        </form>
      </Carte>

      <ul className="space-y-2">
        {comptes?.map((c) => (
          <li key={c.id}>
            <Carte className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                  {c.prenom} {c.nom}
                </p>
                <p className="text-xs text-neutral-500">{c.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {c.roles?.nom ? libelleRole(c.roles.nom) : "—"}
                </p>
                <p className="text-xs text-neutral-500">{c.sites?.nom ?? "—"}</p>
              </div>
            </Carte>
          </li>
        ))}
      </ul>
    </div>
  );
}

function libelleRole(role: string) {
  const labels: Record<string, string> = {
    technicien: "Technicien",
    chef_detachement: "Chef de détachement",
    chef_garage: "Chef Garage",
    comptable_matieres: "Comptable Matières",
    chef_service_technique: "Chef Service Technique",
  };
  return labels[role] ?? role;
}
