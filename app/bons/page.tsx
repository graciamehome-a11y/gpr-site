import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { ajouterDemande, mettreAJourStatut } from "./actions";
import VehiculeSelect from "./VehiculeSelect";
import { Astuce, Badge, BoutonPrincipal, Carte, Champ, Conteneur, EtatVide, FluxStatuts, Selecteur, SousTitre, TitrePage } from "@/app/components/ui";
import { IlluBons } from "@/app/components/illustrations";
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
    <Conteneur>
      <TitrePage titre="Registre des bons" icone="bons" description="Mémoire numérique des demandes de pièces." />

      <Carte className="mb-6">
        <SousTitre>Nouvelle demande</SousTitre>
        <div className="mb-3">
          <Astuce>
            Le bon papier reste la référence officielle pour les signatures. Ici, c&apos;est la
            mémoire numérique : on garde la trace et on suit le statut.
          </Astuce>
        </div>
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

      {bons && bons.length === 0 && (
        <EtatVide
          illustration={<IlluBons size={140} />}
          titre="Aucun bon enregistré"
          description="Créez une demande ci-dessus. Chaque bon suit ensuite son cycle de vie, que vous faites avancer en un tap."
        />
      )}

      {bons && bons.length > 0 && (
        <div className="mb-3 rounded-xl border border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800">
          <p className="mb-2 text-xs font-medium text-neutral-500">Cycle de vie d&apos;un bon</p>
          <FluxStatuts etapes={["En attente", "Validé", "Livré"]} />
          <p className="mt-2 text-xs text-neutral-400">
            « Refusé » est aussi possible. Le statut se change en tapant dessus sur la fiche.
          </p>
        </div>
      )}

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
    </Conteneur>
  );
}
