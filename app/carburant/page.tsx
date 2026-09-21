import { supabaseServeur } from "@/lib/supabaseServerClient";
import { accesCarburant, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { Carte, Conteneur, EtatVide, TitrePage } from "@/app/components/ui";
import { IlluCarburant } from "@/app/components/illustrations";
import FormulaireCarburant from "./FormulaireCarburant";

type Stock = { id: number; type: string; quantite_litres: number; sites: { nom: string } | null };
type Mouvement = {
  id: number;
  type: string;
  mouvement: string;
  quantite_litres: number;
  date_mouvement: string;
  sites: { nom: string } | null;
};

export default async function Carburant() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  // Seul le Chef Service Technique opère sur les deux détachements — les autres
  // rôles ayant accès au carburant n'ont que le leur, pas besoin de le sélectionner.
  const choixSiteNecessaire = utilisateur?.role === "chef_service_technique";

  // Le cahier des charges exclut le Garage Central et le Comptable Matières du
  // suivi carburant. Les RLS les empêchent déjà de lire le moindre solde, mais
  // la page restait accessible en tapant l'adresse et affichait un formulaire
  // inopérant : on le dit clairement plutôt que de laisser croire à une panne.
  if (!accesCarburant(utilisateur)) {
    return (
      <Conteneur>
        <TitrePage titre="Carburant" icone="carburant" />
        <EtatVide
          illustration={<IlluCarburant size={132} />}
          titre="Ce module ne concerne pas votre rôle"
          description="Le suivi du carburant est réservé aux détachements D1 Nikki et D2 Bessassi, ainsi qu'au Chef Service Technique. Le Garage Central et le Comptable Matières n'y ont pas accès."
        />
      </Conteneur>
    );
  }

  const { data: sites } = await supabase
    .from("sites")
    .select("id, nom")
    .eq("type", "detachement")
    .order("nom");

  const { data: stocks } = await supabase
    .from("carburant_stock")
    .select("id, type, quantite_litres, sites(nom)")
    .returns<Stock[]>();

  const { data: mouvements } = await supabase
    .from("mouvements_carburant")
    .select("id, type, mouvement, quantite_litres, date_mouvement, sites(nom)")
    .order("date_mouvement", { ascending: false })
    .limit(20)
    .returns<Mouvement[]>();

  return (
    <Conteneur>
      <TitrePage titre="Carburant" icone="carburant" description="Solde par détachement — gasoil et essence." />

      {sites && sites.length === 0 ? (
        <EtatVide
          illustration={<IlluCarburant size={132} />}
          titre="Aucun détachement visible"
          description="Ce module concerne uniquement D1 Nikki et D2 Bessassi. Le Garage Central et le Comptable Matières n'ont pas de suivi carburant."
        />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {sites?.map((site) => (
            <Carte key={site.id}>
              <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">{site.nom}</p>
              <div className="space-y-1">
                {["gasoil", "essence"].map((type) => {
                  const s = stocks?.find((st) => st.sites?.nom === site.nom && st.type === type);
                  return (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-neutral-500">{type}</span>
                      <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                        {s?.quantite_litres ?? 0} L
                      </span>
                    </div>
                  );
                })}
              </div>
            </Carte>
          ))}
        </div>
      )}

      {sites && sites.length > 0 && (
        <FormulaireCarburant
          sites={sites}
          siteId={utilisateur?.site_id ?? null}
          choixSiteNecessaire={choixSiteNecessaire}
        />
      )}

      {mouvements && mouvements.length > 0 && (
        <ul className="space-y-2">
          {mouvements.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-1 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">
                {m.sites?.nom} · {m.type} · {m.mouvement === "ravitaillement" ? "+ " : "− "}
                {m.quantite_litres} L
              </span>
              <span className="text-neutral-400">
                {new Date(m.date_mouvement).toLocaleDateString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Conteneur>
  );
}
