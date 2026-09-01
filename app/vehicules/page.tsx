import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { ajouterVehicule, ajouterUtilisation, changerStatutVehicule } from "./actions";
import { Astuce, BoutonPrincipal, Carte, Champ, Conteneur, EtatVide, Selecteur, SousTitre, TitrePage } from "@/app/components/ui";
import { IlluVehicules } from "@/app/components/illustrations";
import ChampRecherche from "@/app/components/ChampRecherche";
import ChampQuantite from "@/app/components/ChampQuantite";

type Vehicule = {
  id: number;
  immatriculation: string;
  statut: string;
  types_vehicules: { nom: string } | null;
  sites: { nom: string } | null;
};

type Utilisation = {
  id: number;
  quantite: number;
  date_utilisation: string;
  utilisateur_nom: string | null;
  vehicules: { immatriculation: string } | null;
  pieces: { nom: string } | null;
};

const STATUTS: { valeur: string; label: string }[] = [
  { valeur: "arrive", label: "Arrivé" },
  { valeur: "en_reparation", label: "En réparation" },
  { valeur: "transfere", label: "Transféré" },
  { valeur: "pret", label: "Prêt" },
];

export default async function Vehicules() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, immatriculation, statut, types_vehicules(nom), sites(nom)")
    .order("id", { ascending: false })
    .returns<Vehicule[]>();

  const { data: types } = await supabase.from("types_vehicules").select("id, nom").order("nom");
  const { data: sites } = vueGlobale
    ? await supabase.from("sites").select("id, nom").order("nom")
    : { data: null };
  const { data: pieces } = await supabase.from("pieces").select("id, nom").order("nom");

  const { data: utilisations } = await supabase
    .from("pieces_utilisees")
    .select("id, quantite, date_utilisation, utilisateur_nom, vehicules(immatriculation), pieces(nom)")
    .order("date_utilisation", { ascending: false })
    .limit(20)
    .returns<Utilisation[]>();

  return (
    <Conteneur>
      <TitrePage titre="Véhicules" icone="vehicules" description="Arrivées, statuts et pièces utilisées." />

      <Carte className="mb-6">
        <SousTitre>Arrivée d&apos;un véhicule</SousTitre>
        <div className="mb-3">
          <Astuce>
            Une fois le véhicule enregistré, tapez directement sur un statut pour le faire
            avancer : <strong>Arrivé → En réparation → Transféré → Prêt</strong>.
          </Astuce>
        </div>
        <form action={ajouterVehicule} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Champ label="Immatriculation" name="immatriculation" required autoFocus />
          </div>
          <div className={sites ? "" : "col-span-2"}>
            <Selecteur label="Type" name="type_vehicule_id" required defaultValue="">
              <option value="" disabled>
                -- choisir --
              </option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </Selecteur>
          </div>
          {sites ? (
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
          ) : (
            <input type="hidden" name="site_id" value={utilisateur?.site_id ?? ""} />
          )}
          <div className="col-span-2">
            <BoutonPrincipal type="submit">Enregistrer l&apos;arrivée</BoutonPrincipal>
          </div>
        </form>
      </Carte>

      {vehicules && vehicules.length === 0 && (
        <EtatVide
          illustration={<IlluVehicules size={150} />}
          titre="Aucun véhicule enregistré"
          description="Enregistrez une arrivée avec le formulaire ci-dessus : le véhicule apparaîtra ici avec son statut, et vous pourrez lui associer les pièces posées."
        />
      )}

      <ul className="mb-8 space-y-2">
        {vehicules?.map((v) => (
          <li key={v.id}>
            <Carte>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                    {v.immatriculation}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {v.types_vehicules?.nom}
                    {vueGlobale && v.sites?.nom ? ` · ${v.sites.nom}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUTS.map((s) => {
                  const actif = v.statut === s.valeur;
                  return (
                    <form key={s.valeur} action={changerStatutVehicule.bind(null, v.id, s.valeur)}>
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

      <Carte className="mb-6">
        <SousTitre>Pièce utilisée pour une réparation</SousTitre>
        <div className="mb-3">
          <Astuce>
            À saisir au fil de l&apos;intervention : chaque pièce posée sur le véhicule, avec sa
            date. C&apos;est l&apos;historique qui permet à un autre technicien de reprendre le
            travail.
          </Astuce>
        </div>
        <form action={ajouterUtilisation} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <ChampRecherche
              label="Véhicule"
              name="vehicule_id"
              required
              storageKey="recents-vehicules-utilisation"
              placeholder="Immatriculation…"
              options={vehicules?.map((v) => ({ id: v.id, label: v.immatriculation })) ?? []}
            />
          </div>
          <div className="col-span-2">
            <ChampRecherche
              label="Pièce"
              name="piece_id"
              required
              storageKey="recents-pieces-utilisation"
              options={pieces?.map((p) => ({ id: p.id, label: p.nom })) ?? []}
            />
          </div>
          <ChampQuantite name="quantite" label="Quantité" defaut={1} min={1} />
          <details className="col-span-2 text-sm">
            <summary className="cursor-pointer select-none text-neutral-500">
              Date : aujourd&apos;hui (modifier)
            </summary>
            <div className="mt-2">
              <Champ
                label="Date"
                name="date_utilisation"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </details>
          <div className="col-span-2">
            <BoutonPrincipal type="submit">Enregistrer</BoutonPrincipal>
          </div>
        </form>
      </Carte>

      {utilisations && utilisations.length > 0 && (
        <ul className="space-y-2">
          {utilisations.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-1 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">
                {u.vehicules?.immatriculation} · {u.pieces?.nom}
              </span>
              <span className="text-neutral-400">
                ×{u.quantite} — {new Date(u.date_utilisation).toLocaleDateString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Conteneur>
  );
}
