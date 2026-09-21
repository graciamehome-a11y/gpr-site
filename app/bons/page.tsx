import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { libelleTypeVehicule } from "@/lib/libelles";
import { mettreAJourStatut } from "./actions";
import FormulaireBon from "./FormulaireBon";
import { Aide, Badge, Carte, Conteneur, EtatVide, FluxStatuts, TitrePage } from "@/app/components/ui";
import { IlluBons } from "@/app/components/illustrations";

type Bon = {
  id: number;
  quantite: number;
  statut: string;
  date_demande: string;
  demandeur_nom: string | null;
  vehicule_nom: string | null;
  pieces: { nom: string; types_vehicules: { nom: string } | null } | null;
  vehicules: { immatriculation: string; types_vehicules: { nom: string } | null } | null;
  sites: { nom: string } | null;
};

type Vehicule = {
  id: number;
  immatriculation: string;
  types_vehicules: { nom: string } | null;
};

type Piece = {
  id: number;
  nom: string;
  types_vehicules: { nom: string } | null;
};

const STATUTS: { valeur: string; label: string }[] = [
  { valeur: "en_attente", label: "En attente" },
  { valeur: "valide", label: "Validé" },
  { valeur: "refuse", label: "Refusé" },
  { valeur: "livre", label: "Livré" },
];

/** « 1234 AB 56 — MASSTECH », en retombant sur le texte enregistré pour les bons antérieurs. */
function vehiculeDuBon(bon: Bon): string {
  if (bon.vehicules) {
    const type = bon.vehicules.types_vehicules?.nom;
    return type ? `${bon.vehicules.immatriculation} — ${type}` : bon.vehicules.immatriculation;
  }
  return bon.vehicule_nom ?? "véhicule non précisé";
}

export default async function Bons() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const [{ data: bons }, { data: pieces }, { data: vehicules }] = await Promise.all([
    supabase
      .from("demandes_pieces")
      .select(
        "id, quantite, statut, date_demande, demandeur_nom, vehicule_nom, pieces(nom, types_vehicules(nom)), vehicules(immatriculation, types_vehicules(nom)), sites(nom)",
      )
      .order("date_demande", { ascending: false })
      .returns<Bon[]>(),
    supabase
      .from("pieces")
      .select("id, nom, types_vehicules(nom)")
      .order("nom")
      .returns<Piece[]>(),
    supabase
      .from("vehicules")
      .select("id, immatriculation, types_vehicules(nom)")
      .order("immatriculation")
      .returns<Vehicule[]>(),
  ]);

  return (
    <Conteneur>
      <TitrePage
        titre="Registre des bons"
        icone="bons"
        description="Mémoire numérique des demandes de pièces."
      />

      <Aide titre="À quoi sert ce registre ?">
        <p>
          Le <strong>bon papier reste la référence officielle</strong> pour les signatures. Ce
          registre est la mémoire numérique qui l&apos;accompagne : il garde la trace de chaque
          demande et permet de savoir où en est chacune, sans avoir à se déplacer.
        </p>
        <p>
          <strong>Le véhicule se choisit dans la liste des véhicules enregistrés</strong>, par son
          immatriculation. Si celui que vous cherchez n&apos;y est pas, c&apos;est que son arrivée
          n&apos;a pas encore été saisie : enregistrez-la d&apos;abord depuis la page Véhicules.
        </p>
        <p>
          <strong>Le site du bon est celui du véhicule</strong> — inutile de le préciser. Un
          véhicule se trouve à un seul endroit à la fois.
        </p>
        <p>
          <strong>Ce registre ne diminue pas le stock.</strong> C&apos;est la déclaration « Pièce
          utilisée », depuis la page Véhicules, qui le fait — au moment où la pièce est réellement
          posée.
        </p>
      </Aide>

      <FormulaireBon
        vehicules={
          vehicules?.map((v) => ({
            id: v.id,
            label: v.immatriculation,
            sousLabel: v.types_vehicules?.nom,
          })) ?? []
        }
        pieces={
          pieces?.map((p) => ({
            id: p.id,
            label: p.nom,
            sousLabel: libelleTypeVehicule(p.types_vehicules),
          })) ?? []
        }
      />

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
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                    {b.pieces?.nom} <span className="text-neutral-400">×{b.quantite}</span>
                  </p>
                  {b.pieces?.types_vehicules?.nom && (
                    <p className="text-xs text-neutral-500">{b.pieces.types_vehicules.nom}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {vehiculeDuBon(b)} · {b.demandeur_nom}
                    {vueGlobale && b.sites?.nom ? ` · ${b.sites.nom}` : ""} ·{" "}
                    {new Date(b.date_demande).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge
                  statut={b.statut}
                  texte={STATUTS.find((s) => s.valeur === b.statut)?.label ?? b.statut}
                />
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
