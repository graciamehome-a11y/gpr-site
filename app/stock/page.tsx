import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { definirStock } from "./actions";
import {
  Astuce,
  BoutonPrincipal,
  Carte,
  Conteneur,
  EtatVide,
  Selecteur,
  SousTitre,
  TitrePage,
} from "@/app/components/ui";
import { IlluStock } from "@/app/components/illustrations";
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

  const enAlerteTotal = stocks?.filter((s) => s.quantite <= s.seuil_alerte).length ?? 0;

  return (
    <Conteneur>
      <TitrePage
        titre="Stock"
        icone="stock"
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

      {enAlerteTotal > 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {enAlerteTotal} pièce{enAlerteTotal > 1 ? "s" : ""} au niveau du seuil d&apos;alerte ou en dessous.
        </p>
      )}

      {peutModifier && (
        <Carte className="mb-6">
          <SousTitre>Ajouter / mettre à jour une quantité</SousTitre>
          <div className="mb-3">
            <Astuce>
              Le <strong>seuil d&apos;alerte</strong> est le niveau plancher : dès que la quantité
              l&apos;atteint ou passe en dessous, la pièce s&apos;affiche en rouge, ici et sur
              l&apos;accueil.
            </Astuce>
          </div>
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
        <EtatVide
          illustration={<IlluStock size={148} />}
          titre="Aucune quantité enregistrée"
          description={
            peutModifier
              ? "Le stock liste chaque pièce et sa quantité par site. Renseignez une première ligne avec le formulaire ci-dessus."
              : "Le stock de votre site apparaîtra ici dès qu'une quantité aura été saisie par un responsable."
          }
        />
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
    </Conteneur>
  );
}
