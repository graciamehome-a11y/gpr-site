import {
  accesCarburant,
  aVueGlobale,
  getUtilisateurConnecte,
} from "@/lib/getUtilisateurConnecte";
import { Carte, Conteneur, FluxStatuts, TitrePage } from "@/app/components/ui";
import { IlluReseau } from "@/app/components/illustrations";

const LABELS_ROLE: Record<string, string> = {
  technicien: "Technicien",
  chef_detachement: "Chef de détachement",
  chef_garage: "Chef Garage",
  comptable_matieres: "Comptable Matières",
  chef_service_technique: "Chef Service Technique",
};

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-neutral-200 bg-white open:pb-1 dark:border-neutral-800 dark:bg-neutral-900">
      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3.5 text-[15px] font-medium text-neutral-900 dark:text-white">
        {titre}
        <span className="text-neutral-400 transition group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </details>
  );
}

export default async function Explication() {
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);
  const carburant = accesCarburant(utilisateur);

  return (
    <Conteneur>
      <TitrePage
        titre="Comment ça marche"
        icone="aide"
        description="Le guide rapide de la plateforme GPR."
      />

      {utilisateur && (
        <Carte className="mb-6">
          <p className="text-sm text-neutral-500">Connecté en tant que</p>
          <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
            {utilisateur.prenom} {utilisateur.nom} — {LABELS_ROLE[utilisateur.role] ?? utilisateur.role}
          </p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {vueGlobale
              ? "Vous voyez tous les sites (Garage Central, D1 Nikki, D2 Bessassi, Réserve Comptable Matières)."
              : utilisateur.site_nom
                ? `Vous ne voyez que votre site : ${utilisateur.site_nom}.`
                : "Aucun site rattaché à votre compte."}
            {carburant
              ? " Vous avez accès au module Carburant."
              : " Le module Carburant ne vous concerne pas."}
          </p>
        </Carte>
      )}

      <div className="space-y-2">
        <Section titre="🧭 Vue d'ensemble">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <IlluReseau size={120} className="mx-auto shrink-0 sm:mx-0" />
            <p>
              GPR remplace les échanges oraux, les déplacements et les bons papier par une
              visibilité partagée en temps réel : qui a quelle pièce, où est chaque véhicule,
              quels bons sont en attente, combien de carburant reste-t-il. Un site central
              (Garage Central), deux détachements (D1 Nikki, D2 Bessassi) et la Réserve
              Comptable Matières.
            </p>
          </div>
          <p>
            Le bon papier reste la référence officielle pour les signatures — le site est une
            mémoire numérique complémentaire, pas un circuit de validation.
          </p>
        </Section>

        <Section titre="🏠 Accueil (tableau de bord)">
          <p>
            La page d&apos;accueil résume votre journée : bons en attente, véhicules en réparation,
            pièces sous le seuil d&apos;alerte{carburant ? ", solde de carburant" : ""}, activité récente,
            et des raccourcis vers les actions les plus fréquentes de votre rôle.
          </p>
          <p>Tout y est déjà filtré selon ce que vous avez le droit de voir.</p>
        </Section>

        <Section titre="📦 Stock">
          <p>
            Le stock s&apos;ouvre sur la <strong>liste des sites</strong> : choisissez-en un pour
            voir tout ce qu&apos;il contient, avec les quantités, les seuils d&apos;alerte et
            l&apos;historique des mouvements.
          </p>
          <p>
            Sur la page d&apos;un site, vous pouvez saisir une quantité (elle{" "}
            <strong>remplace</strong> celle enregistrée) et, si vous y êtes autorisé,{" "}
            <strong>envoyer du stock vers un autre site</strong> : la quantité part du site de
            départ et s&apos;ajoute à celui d&apos;arrivée.
          </p>
          <p>
            {vueGlobale
              ? "Vous accédez à tous les sites."
              : utilisateur?.role === "chef_detachement"
                ? "Vous accédez à votre site, et pouvez y saisir des quantités et envoyer du stock ailleurs."
                : "Vous consultez le stock de votre site (lecture seule)."}
          </p>
          <p>
            Une quantité <strong>négative</strong> s&apos;affiche en rouge : cela signifie
            qu&apos;une pièce a été utilisée sans que sa réception ait été saisie. Corrigez-la en
            saisissant la quantité réelle.
          </p>
        </Section>

        <Section titre="🚚 Véhicules">
          <p>Enregistrer l&apos;arrivée d&apos;un véhicule (immatriculation, type, site), puis suivre son statut en le tapant directement :</p>
          <div className="py-1">
            <FluxStatuts etapes={["Arrivé", "En réparation", "Transféré", "Prêt"]} />
          </div>
          <p>
            Section « Pièce utilisée » : enregistrer ce qui a été consommé sur un véhicule, avec la
            date (aujourd&apos;hui par défaut, modifiable). La quantité est{" "}
            <strong>retirée automatiquement du stock</strong> du site où se trouve le véhicule —
            vous n&apos;avez rien à décompter vous-même.
          </p>
        </Section>

        <Section titre="📋 Bons">
          <p>
            Enregistrer une demande de pièce en choisissant le <strong>véhicule réel</strong>
            (immatriculation et type) : le bon renvoie ainsi à une fiche véhicule précise. Le site
            du bon est celui du véhicule. Le statut se change en un tap, directement sur la fiche :
          </p>
          <div className="py-1">
            <FluxStatuts etapes={["En attente", "Validé", "Livré"]} />
          </div>
          <p>« Refusé » reste possible à tout moment.</p>
        </Section>

        {carburant && (
          <Section titre="⛽ Carburant">
            <p>Solde de gasoil et d&apos;essence par détachement (D1 Nikki, D2 Bessassi uniquement — Garage Central et Comptable Matières n&apos;y ont pas accès).</p>
            <p>Enregistrer un ravitaillement ou une consommation : boutons de quantités courantes (10L/20L/50L/100L) en un tap, ou saisie libre.</p>
          </Section>
        )}

        {vueGlobale && (
          <Section titre="👤 Comptes">
            <p>
              Réservé à votre rôle. Créer un compte affiche un{" "}
              <strong>mot de passe temporaire une seule fois</strong> : notez-le et transmettez-le à
              la personne de vive voix — aucun email n&apos;est envoyé, le compte est utilisable
              immédiatement.
            </p>
            <p>
              La personne peut ensuite le changer via « Mon mot de passe » (l&apos;icône clé en haut
              à droite). Si quelqu&apos;un a perdu le sien, ou ne s&apos;est jamais connecté, le
              bouton « Réinitialiser le mot de passe » sur sa ligne lui en génère un nouveau.
            </p>
          </Section>
        )}

        <Section titre="🔑 Mon mot de passe">
          <p>
            L&apos;icône clé, en haut à droite, permet de changer votre mot de passe à tout moment.
          </p>
          <p>
            Mot de passe oublié ? Le service n&apos;envoie pas encore d&apos;emails : demandez à un
            responsable (Chef Garage, Comptable Matières ou Chef Service Technique) de vous en
            générer un nouveau depuis la page « Comptes ». Il vous le transmettra, et vous pourrez
            le changer ensuite.
          </p>
        </Section>

        <Section titre="💡 Astuces pour aller vite">
          <ul className="list-disc space-y-1 pl-4">
            <li>Sur les champs « pièce » ou « véhicule », tapez 2-3 lettres au lieu de faire défiler la liste.</li>
            <li>Vos derniers choix apparaissent en raccourcis juste en dessous du champ — un tap suffit.</li>
            <li>Le champ « Date » est replié sur aujourd&apos;hui par défaut ; dépliez-le seulement si besoin.</li>
            <li>Sur mobile, la barre du bas donne accès à chaque module en un tap.</li>
          </ul>
        </Section>

        <Section titre="🔒 Qui voit quoi">
          <ul className="list-disc space-y-1 pl-4">
            <li><strong>Technicien</strong> et <strong>Chef de détachement</strong> : leur site uniquement.</li>
            <li><strong>Chef Garage</strong> et <strong>Comptable Matières</strong> : tous les sites (pièces, véhicules, bons), pas le carburant.</li>
            <li><strong>Chef Service Technique</strong> : tous les sites, y compris le carburant des deux détachements.</li>
          </ul>
        </Section>
      </div>
    </Conteneur>
  );
}
