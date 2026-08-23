import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { definirStock } from "./actions";
import { BoutonPrincipal, Carte, EtatVide, Selecteur, TitrePage } from "@/app/components/ui";
import ChampRecherche from "@/app/components/ChampRecherche";
import ChampQuantite from "@/app/components/ChampQuantite";

type Stock = {
  id: number;
  quantite: number;
  seuil_alerte: number;
  pieces: { nom: string; categorie: string; types_vehicules: { nom: string } | null } | null;
  sites: { nom: string } | null;
};

export default async function Stock() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const peutModifier = aVueGlobale(utilisateur) || utilisateur?.role === "chef_detachement";

  const { data: stocks, error } = await supabase
    .from("stocks")
    .select("id, quantite, seuil_alerte, pieces(nom, categorie, types_vehicules(nom)), sites(nom)")
    .order("id")
    .returns<Stock[]>();

  const { data: pieces } = await supabase.from("pieces").select("id, nom").order("nom");
  const { data: sites } = peutModifier
    ? await supabase.from("sites").select("id, nom").order("nom")
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <TitrePage
        titre="Stock"
        description={
          aVueGlobale(utilisateur)
            ? "Toutes les pièces, tous les sites."
            : utilisateur?.site_nom
              ? `Pièces disponibles — ${utilisateur.site_nom}`
              : undefined
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          Erreur : {error.message}
        </p>
      )}

      {peutModifier && (
        <Carte className="mb-6">
          <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ajouter / mettre à jour une quantité
          </p>
          <form action={definirStock} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <ChampRecherche
                label="Pièce"
                name="piece_id"
                required
                storageKey="recents-pieces-stock"
                options={pieces?.map((p) => ({ id: p.id, label: p.nom })) ?? []}
              />
            </div>
            {sites && (
              <div className="col-span-2">
                <Selecteur label="Site" name="site_id" required defaultValue="">
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
            )}
            <ChampQuantite name="quantite" label="Quantité" defaut={0} min={0} />
            <ChampQuantite name="seuil_alerte" label="Seuil d'alerte" defaut={0} min={0} />
            <div className="col-span-2">
              <BoutonPrincipal type="submit">Enregistrer</BoutonPrincipal>
            </div>
          </form>
        </Carte>
      )}

      {stocks && stocks.length === 0 && (
        <EtatVide titre="Aucun stock enregistré" description="Les quantités apparaîtront ici une fois saisies." />
      )}

      <ul className="space-y-2">
        {stocks?.map((s) => {
          const enAlerte = s.quantite <= s.seuil_alerte;
          return (
            <li key={s.id}>
              <Carte
                className={`flex items-center justify-between ${enAlerte ? "border-red-200 dark:border-red-900" : ""}`}
              >
                <div>
                  <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                    {s.pieces?.nom}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {s.pieces?.types_vehicules?.nom ?? "Générique"}
                    {aVueGlobale(utilisateur) && s.sites?.nom ? ` · ${s.sites.nom}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[15px] font-semibold tabular-nums ${enAlerte ? "text-red-600" : "text-neutral-900 dark:text-white"}`}
                >
                  {s.quantite}
                </span>
              </Carte>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
