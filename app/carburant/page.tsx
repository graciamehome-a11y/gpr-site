import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { ajouterMouvementCarburant } from "./actions";
import { BoutonPrincipal, Carte, EtatVide, Selecteur, TitrePage } from "@/app/components/ui";
import ChampQuantite from "@/app/components/ChampQuantite";

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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <TitrePage titre="Carburant" description="Solde par détachement — gasoil et essence." />

      {sites && sites.length === 0 ? (
        <EtatVide titre="Aucun détachement visible" description="Ce module concerne uniquement D1 Nikki et D2 Bessassi." />
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
        <Carte className="mb-6">
          <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nouveau mouvement
          </p>
          <form action={ajouterMouvementCarburant} className="grid grid-cols-2 gap-3">
            {choixSiteNecessaire ? (
              <div className="col-span-2">
                <Selecteur label="Détachement" name="site_id" required defaultValue="">
                  <option value="" disabled>
                    -- choisir --
                  </option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </Selecteur>
              </div>
            ) : (
              <input type="hidden" name="site_id" value={utilisateur?.site_id ?? ""} />
            )}
            <Selecteur label="Type" name="type" required defaultValue="gasoil">
              <option value="gasoil">Gasoil</option>
              <option value="essence">Essence</option>
            </Selecteur>
            <Selecteur label="Mouvement" name="mouvement" required defaultValue="ravitaillement">
              <option value="ravitaillement">Ravitaillement</option>
              <option value="consommation">Consommation</option>
            </Selecteur>
            <div className="col-span-2">
              <ChampQuantite
                name="quantite"
                label="Quantité (litres)"
                defaut={20}
                min={1}
                pas={5}
                presets={[10, 20, 50, 100]}
              />
            </div>
            <div className="col-span-2">
              <BoutonPrincipal type="submit">Enregistrer</BoutonPrincipal>
            </div>
          </form>
        </Carte>
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
    </div>
  );
}
