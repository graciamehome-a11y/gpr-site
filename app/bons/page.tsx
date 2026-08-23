import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { ajouterDemande, mettreAJourStatut } from "./actions";
import VehiculeSelect from "./VehiculeSelect";
import { Badge, BoutonPrincipal, Carte, Champ, EtatVide, Selecteur, TitrePage } from "@/app/components/ui";
import ChampRecherche from "@/app/components/ChampRecherche";
import ChampQuantite from "@/app/components/ChampQuantite";

type Bon = {
  id: number;
  quantite: number;
  statut: string;
  date_demande: string;
  demandeur_nom: string | null;
  vehicule_nom: string | null;
  pieces: { nom: string } | null;
};

const STATUTS: { valeur: string; label: string }[] = [
  { valeur: "en_attente", label: "En attente" },
  { valeur: "valide", label: "Validé" },
  { valeur: "refuse", label: "Refusé" },
  { valeur: "livre", label: "Livré" },
];

export default async function Bons() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const { data: bons } = await supabase
    .from("demandes_pieces")
    .select("id, quantite, statut, date_demande, demandeur_nom, vehicule_nom, pieces(nom)")
    .order("date_demande", { ascending: false })
    .returns<Bon[]>();

  const { data: pieces } = await supabase.from("pieces").select("id, nom").order("nom");
  const { data: types } = await supabase.from("types_vehicules").select("id, nom").order("nom");
  const { data: sites } = vueGlobale
    ? await supabase.from("sites").select("id, nom").order("nom")
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <TitrePage titre="Registre des bons" />

      <Carte className="mb-6">
        <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Nouvelle demande
        </p>
        <form action={ajouterDemande} className="space-y-3">
          <VehiculeSelect types={types ?? []} />

          <ChampRecherche
            label="Pièce"
            name="piece_id"
            required
            storageKey="recents-pieces-bons"
            options={pieces?.map((p) => ({ id: p.id, label: p.nom })) ?? []}
          />

          {sites && (
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
          )}

          <ChampQuantite name="quantite" label="Quantité" defaut={1} min={1} />

          <details className="text-sm">
            <summary className="cursor-pointer select-none text-neutral-500">
              Date : aujourd&apos;hui (modifier)
            </summary>
            <div className="mt-2">
              <Champ
                label="Date"
                name="date_demande"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </details>

          <BoutonPrincipal type="submit">Envoyer la demande</BoutonPrincipal>
        </form>
      </Carte>

      {bons && bons.length === 0 && <EtatVide titre="Aucun bon enregistré" />}

      <ul className="space-y-2">
        {bons?.map((b) => (
          <li key={b.id}>
            <Carte>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                    {b.pieces?.nom} <span className="text-neutral-400">×{b.quantite}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {b.vehicule_nom} · {b.demandeur_nom} ·{" "}
                    {new Date(b.date_demande).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge statut={b.statut} texte={STATUTS.find((s) => s.valeur === b.statut)?.label ?? b.statut} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUTS.map((s) => {
                  const actif = b.statut === s.valeur;
                  return (
                    <form key={s.valeur} action={mettreAJourStatut.bind(null, b.id, s.valeur)}>
                      <button
                        type="submit"
                        disabled={actif}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          actif
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-500 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {s.label}
                      </button>
                    </form>
                  );
                })}
              </div>
            </Carte>
          </li>
        ))}
      </ul>
    </div>
  );
}
