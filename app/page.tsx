import Link from "next/link";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import {
  accesCarburant,
  aVueGlobale,
  getUtilisateurConnecte,
} from "@/lib/getUtilisateurConnecte";
import {
  Conteneur,
  GrilleRaccourcis,
  GrilleStats,
  Ligne,
  ListeDivisee,
  Raccourci,
  Section,
  Stat,
} from "@/app/components/ui";
import { Icone, type NomIcone } from "@/app/components/icones";
import { IlluReseau } from "@/app/components/illustrations";

/* ------------------------------------------------------------------ *
 *  Tableau de bord — page d'accueil, adaptée au rôle de la personne.
 *  Toutes les requêtes passent par le client serveur : les RLS filtrent
 *  déjà les données par rôle/site, on se contente d'agréger et de
 *  mettre en avant ce qui demande une action.
 * ------------------------------------------------------------------ */

type StatutCompte = Record<string, number>;

type VehiculeLigne = {
  statut: string;
  immatriculation: string;
  types_vehicules: { nom: string } | null;
  sites: { nom: string } | null;
};
type BonLigne = {
  statut: string;
  quantite: number;
  date_demande: string;
  demandeur_nom: string | null;
  vehicule_nom: string | null;
  pieces: { nom: string } | null;
  sites: { nom: string } | null;
};
type StockLigne = {
  quantite: number;
  seuil_alerte: number;
  pieces: { nom: string } | null;
  sites: { nom: string } | null;
};
type UtilisationLigne = {
  quantite: number;
  date_utilisation: string;
  utilisateur_nom: string | null;
  vehicules: { immatriculation: string } | null;
  pieces: { nom: string } | null;
};
type CarburantLigne = { type: string; quantite_litres: number; sites: { nom: string } | null };
type MouvementLigne = {
  type: string;
  mouvement: string;
  quantite_litres: number;
  date_mouvement: string;
  sites: { nom: string } | null;
};

const LABELS_ROLE: Record<string, string> = {
  technicien: "Technicien",
  chef_detachement: "Chef de détachement",
  chef_garage: "Chef Garage",
  comptable_matieres: "Comptable Matières",
  chef_service_technique: "Chef Service Technique",
};

const INTRO_ROLE: Record<string, string> = {
  technicien: "Votre site en un coup d'œil.",
  chef_detachement: "Votre détachement en un coup d'œil.",
  chef_garage: "Tous les sites — pièces, véhicules et bons.",
  comptable_matieres: "Le suivi des matières sur l'ensemble des sites.",
  chef_service_technique: "La vue d'ensemble du service, carburant compris.",
};

const LABELS_STATUT_VEHICULE: Record<string, string> = {
  arrive: "Arrivé",
  en_reparation: "En réparation",
  transfere: "Transféré",
  pret: "Prêt",
};

function raccourcisPourRole(role: string): { href: string; icone: NomIcone; titre: string; sousTitre: string }[] {
  const enregistrerArrivee = {
    href: "/vehicules",
    icone: "vehicules" as NomIcone,
    titre: "Enregistrer une arrivée",
    sousTitre: "Nouveau véhicule au garage",
  };
  const pieceUtilisee = {
    href: "/vehicules",
    icone: "stock" as NomIcone,
    titre: "Pièce utilisée",
    sousTitre: "Réparation en cours",
  };
  const nouveauBon = {
    href: "/bons",
    icone: "bons" as NomIcone,
    titre: "Nouveau bon",
    sousTitre: "Demande de pièce",
  };
  const majStock = {
    href: "/stock",
    icone: "stock" as NomIcone,
    titre: "Mettre à jour le stock",
    sousTitre: "Quantités et seuils",
  };
  const carburant = {
    href: "/carburant",
    icone: "carburant" as NomIcone,
    titre: "Mouvement de carburant",
    sousTitre: "Ravitaillement ou consommation",
  };
  const registreBons = {
    href: "/bons",
    icone: "bons" as NomIcone,
    titre: "Registre des bons",
    sousTitre: "Suivre et changer les statuts",
  };
  const creerCompte = {
    href: "/admin/comptes",
    icone: "comptes" as NomIcone,
    titre: "Créer un compte",
    sousTitre: "Inviter un nouvel utilisateur",
  };

  switch (role) {
    case "technicien":
      return [enregistrerArrivee, pieceUtilisee, nouveauBon, carburant];
    case "chef_detachement":
      return [nouveauBon, majStock, enregistrerArrivee, carburant];
    case "chef_garage":
      return [nouveauBon, majStock, enregistrerArrivee, creerCompte];
    case "comptable_matieres":
      return [majStock, registreBons, enregistrerArrivee, creerCompte];
    case "chef_service_technique":
      return [nouveauBon, carburant, majStock, creerCompte];
    default:
      return [nouveauBon, majStock];
  }
}

function etapesDemarrage(role: string): string[] {
  switch (role) {
    case "technicien":
      return [
        "Enregistrez l'arrivée d'un véhicule dans Véhicules.",
        "Notez les pièces posées au fur et à mesure de la réparation.",
        "Créez un bon dès qu'une pièce manque, et suivez le carburant du détachement.",
      ];
    case "chef_detachement":
      return [
        "Renseignez les quantités de pièces de votre site dans Stock, avec un seuil d'alerte.",
        "Suivez les véhicules et les bons de votre détachement.",
        "Gardez un œil sur le solde de carburant.",
      ];
    case "chef_garage":
      return [
        "Créez les comptes des techniciens et chefs (bouton Comptes).",
        "Mettez à jour le stock de pièces, site par site, avec les seuils d'alerte.",
        "Traitez les bons entrants : validez, refusez ou marquez livré.",
      ];
    case "comptable_matieres":
      return [
        "Vérifiez le stock de pièces sur l'ensemble des sites.",
        "Suivez les bons livrés et les pièces consommées pour vos points périodiques.",
        "Créez les comptes si besoin.",
      ];
    case "chef_service_technique":
      return [
        "Parcourez la vue d'ensemble : pièces, véhicules, bons, carburant des deux détachements.",
        "Traitez les bons en attente.",
        "Créez ou ajustez les comptes des utilisateurs.",
      ];
    default:
      return ["Explorez les modules depuis les raccourcis ci-dessous."];
  }
}

function compterPar<T>(lignes: T[], cle: (l: T) => string): StatutCompte {
  return lignes.reduce<StatutCompte>((acc, l) => {
    const k = cle(l);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function TableauDeBord() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();

  if (!utilisateur) {
    return (
      <Conteneur>
        <p className="text-sm text-neutral-500">Session introuvable. Reconnectez-vous.</p>
      </Conteneur>
    );
  }

  const vueGlobale = aVueGlobale(utilisateur);
  const carburantVisible = accesCarburant(utilisateur);

  const [stocksRes, vehiculesRes, bonsRes, utilisationsRes] = await Promise.all([
    supabase
      .from("stocks")
      .select("quantite, seuil_alerte, pieces(nom), sites(nom)")
      .returns<StockLigne[]>(),
    supabase
      .from("vehicules")
      .select("statut, immatriculation, types_vehicules(nom), sites(nom)")
      .returns<VehiculeLigne[]>(),
    supabase
      .from("demandes_pieces")
      .select("statut, quantite, date_demande, demandeur_nom, vehicule_nom, pieces(nom), sites(nom)")
      .order("date_demande", { ascending: false })
      .returns<BonLigne[]>(),
    supabase
      .from("pieces_utilisees")
      .select("quantite, date_utilisation, utilisateur_nom, vehicules(immatriculation), pieces(nom)")
      .order("date_utilisation", { ascending: false })
      .limit(6)
      .returns<UtilisationLigne[]>(),
  ]);

  const carburantRes = carburantVisible
    ? await supabase
        .from("carburant_stock")
        .select("type, quantite_litres, sites(nom)")
        .returns<CarburantLigne[]>()
    : null;
  const mouvementsRes = carburantVisible
    ? await supabase
        .from("mouvements_carburant")
        .select("type, mouvement, quantite_litres, date_mouvement, sites(nom)")
        .order("date_mouvement", { ascending: false })
        .limit(6)
        .returns<MouvementLigne[]>()
    : null;

  const stocks = stocksRes.data ?? [];
  const vehicules = vehiculesRes.data ?? [];
  const bons = bonsRes.data ?? [];
  const utilisations = utilisationsRes.data ?? [];
  const carburant = carburantRes?.data ?? [];
  const mouvements = mouvementsRes?.data ?? [];

  const alertes = stocks
    .filter((s) => s.quantite <= s.seuil_alerte)
    .sort((a, b) => a.quantite - a.seuil_alerte - (b.quantite - b.seuil_alerte));
  const bonsEnAttente = bons.filter((b) => b.statut === "en_attente");
  const vehiculesParStatut = compterPar(vehicules, (v) => v.statut);
  const enReparation = vehiculesParStatut["en_reparation"] ?? 0;
  const carburantTotal = carburant.reduce((s, c) => s + Number(c.quantite_litres || 0), 0);
  const comptable = utilisateur.role === "comptable_matieres";
  const toutVide =
    stocks.length === 0 &&
    vehicules.length === 0 &&
    bons.length === 0 &&
    utilisations.length === 0 &&
    carburant.length === 0;

  const dateJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Activité récente : pièces utilisées + mouvements carburant, fusionnées par date.
  const activite = [
    ...utilisations.map((u) => ({
      date: u.date_utilisation,
      texte: `${u.pieces?.nom ?? "Pièce"} ×${u.quantite} — ${u.vehicules?.immatriculation ?? "véhicule"}`,
      detail: u.utilisateur_nom ?? undefined,
      icone: "stock" as NomIcone,
    })),
    ...mouvements.map((m) => ({
      date: m.date_mouvement,
      texte: `${m.mouvement === "ravitaillement" ? "+ " : "− "}${m.quantite_litres} L ${m.type} — ${m.sites?.nom ?? ""}`,
      detail: m.mouvement === "ravitaillement" ? "Ravitaillement" : "Consommation",
      icone: "carburant" as NomIcone,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <Conteneur className="space-y-6">
      <header>
        <p className="text-sm capitalize text-neutral-400">{dateJour}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Bonjour {utilisateur.prenom}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {LABELS_ROLE[utilisateur.role] ?? utilisateur.role}
          {utilisateur.site_nom ? ` · ${utilisateur.site_nom}` : vueGlobale ? " · tous les sites" : ""}
          {" — "}
          {INTRO_ROLE[utilisateur.role] ?? ""}
        </p>
      </header>

      {toutVide && (
        <Section titre="Pour démarrer" icone="aide">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <IlluReseau size={132} className="mx-auto shrink-0 sm:mx-0" />
            <ol className="flex-1 space-y-2.5">
              {etapesDemarrage(utilisateur.role).map((etape, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                    {i + 1}
                  </span>
                  {etape}
                </li>
              ))}
            </ol>
          </div>
        </Section>
      )}

      <GrilleStats>
        <Stat
          label="Bons en attente"
          valeur={bonsEnAttente.length}
          ton={bonsEnAttente.length > 0 ? "ambre" : "neutre"}
          indice={vueGlobale ? "tous les sites" : undefined}
        />
        {comptable ? (
          <Stat label="Références en stock" valeur={stocks.length} indice="lignes pièce/site" />
        ) : (
          <Stat
            label="Véhicules en réparation"
            valeur={enReparation}
            ton={enReparation > 0 ? "ambre" : "neutre"}
          />
        )}
        <Stat
          label="Pièces en alerte"
          valeur={alertes.length}
          ton={alertes.length > 0 ? "rouge" : "emeraude"}
          indice={alertes.length === 0 ? "aucun seuil atteint" : "au seuil ou en dessous"}
        />
        {carburantVisible && (
          <Stat
            label="Carburant"
            valeur={`${carburantTotal.toLocaleString("fr-FR")} L`}
            ton="accent"
            indice={
              carburant.length
                ? `${new Set(carburant.map((c) => c.sites?.nom)).size} détachement(s)`
                : undefined
            }
          />
        )}
      </GrilleStats>

      <div>
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Raccourcis
        </p>
        <GrilleRaccourcis>
          {raccourcisPourRole(utilisateur.role).map((r) => (
            <Raccourci key={r.titre} href={r.href} icone={r.icone} titre={r.titre} sousTitre={r.sousTitre} />
          ))}
        </GrilleRaccourcis>
      </div>

      <Section
        titre="Pièces en alerte"
        icone="alerte"
        action={
          <Link href="/stock" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">
            Voir le stock
          </Link>
        }
      >
        {alertes.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500">
            Aucune pièce au niveau du seuil d&apos;alerte. 👍
          </p>
        ) : (
          <ListeDivisee>
            {alertes.slice(0, 6).map((s, i) => (
              <Ligne
                key={i}
                principal={s.pieces?.nom ?? "Pièce"}
                secondaire={
                  vueGlobale && s.sites?.nom
                    ? `${s.sites.nom} · seuil ${s.seuil_alerte}`
                    : `seuil ${s.seuil_alerte}`
                }
                valeur={s.quantite}
                ton="rouge"
              />
            ))}
          </ListeDivisee>
        )}
      </Section>

      <Section
        titre="Bons à traiter"
        icone="bons"
        action={
          <Link href="/bons" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">
            Tous les bons
          </Link>
        }
      >
        {bonsEnAttente.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500">Aucun bon en attente.</p>
        ) : (
          <ListeDivisee>
            {bonsEnAttente.slice(0, 6).map((b, i) => (
              <Ligne
                key={i}
                principal={`${b.pieces?.nom ?? "Pièce"} ×${b.quantite}`}
                secondaire={[
                  b.vehicule_nom,
                  b.demandeur_nom,
                  vueGlobale ? b.sites?.nom : null,
                  new Date(b.date_demande).toLocaleDateString("fr-FR"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </ListeDivisee>
        )}
      </Section>

      {!comptable && (
        <Section titre="Véhicules" icone="vehicules" action={
          <Link href="/vehicules" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">
            Détail
          </Link>
        }>
          {vehicules.length === 0 ? (
            <p className="py-2 text-sm text-neutral-500">Aucun véhicule enregistré.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {(["arrive", "en_reparation", "transfere", "pret"] as const).map((st) => (
                <div key={st}>
                  <p className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {vehiculesParStatut[st] ?? 0}
                  </p>
                  <p className="text-xs text-neutral-500">{LABELS_STATUT_VEHICULE[st]}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {carburantVisible && (
        <Section titre="Carburant par détachement" icone="carburant" action={
          <Link href="/carburant" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">
            Détail
          </Link>
        }>
          {carburant.length === 0 ? (
            <p className="py-2 text-sm text-neutral-500">Aucun solde renseigné.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...new Set(carburant.map((c) => c.sites?.nom).filter(Boolean))].map((site) => (
                <div
                  key={site}
                  className="rounded-xl border border-neutral-100 p-3 dark:border-neutral-800"
                >
                  <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {site}
                  </p>
                  {["gasoil", "essence"].map((type) => {
                    const c = carburant.find((x) => x.sites?.nom === site && x.type === type);
                    return (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-neutral-500">{type}</span>
                        <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                          {(c?.quantite_litres ?? 0).toLocaleString("fr-FR")} L
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section titre="Activité récente" icone="horloge">
        {activite.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500">Rien de récent à afficher.</p>
        ) : (
          <ListeDivisee>
            {activite.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="text-neutral-300 dark:text-neutral-600">
                  <Icone nom={a.icone} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{a.texte}</p>
                  {a.detail && <p className="truncate text-xs text-neutral-400">{a.detail}</p>}
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {new Date(a.date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </ListeDivisee>
        )}
      </Section>
    </Conteneur>
  );
}
