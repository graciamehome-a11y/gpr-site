import {
  accesCarburant,
  aVueGlobale,
  getUtilisateurConnecte,
} from "@/lib/getUtilisateurConnecte";
import { Carte, TitrePage } from "@/app/components/ui";

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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <TitrePage
        titre="Comment ça marche"
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
          <p>
            GPR remplace les échanges oraux, les déplacements et les bons papier par une
            visibilité partagée en temps réel : qui a quelle pièce, où est chaque véhicule,
            quels bons sont en attente, combien de carburant reste-t-il.
          </p>
          <p>
            Le bon papier reste la référence officielle pour les signatures — le site est une
            mémoire numérique complémentaire, pas un circuit de validation.
          </p>
        </Section>

        <Section titre="📦 Stock">
          <p>Liste des pièces disponibles, avec la quantité par site et un seuil d&apos;alerte (surligné en rouge si atteint).</p>
          <p>
            {vueGlobale
              ? "Vous pouvez ajouter/mettre à jour une quantité pour n'importe quel site."
              : utilisateur?.role === "chef_detachement"
                ? "Vous pouvez ajouter/mettre à jour une quantité pour votre site."
                : "Vous consultez le stock de votre site (lecture seule)."}
          </p>
        </Section>

        <Section titre="🚚 Véhicules">
          <p>Enregistrer l&apos;arrivée d&apos;un véhicule (immatriculation, type, site), puis suivre son statut en le tapant directement : Arrivé → En réparation → Transféré → Prêt.</p>
          <p>Section « Pièce utilisée » : enregistrer ce qui a été consommé sur un véhicule, avec la date (aujourd&apos;hui par défaut, modifiable).</p>
        </Section>

        <Section titre="📋 Bons">
          <p>Enregistrer une demande de pièce (véhicule, pièce, quantité). Le statut (en attente / validé / refusé / livré) se change en un tap, directement sur la fiche.</p>
        </Section>

        {carburant && (
          <Section titre="⛽ Carburant">
            <p>Solde de gasoil et d&apos;essence par détachement (D1 Nikki, D2 Bessassi uniquement — Garage Central et Comptable Matières n&apos;y ont pas accès).</p>
            <p>Enregistrer un ravitaillement ou une consommation : boutons de quantités courantes (10L/20L/50L/100L) en un tap, ou saisie libre.</p>
          </Section>
        )}

        {vueGlobale && (
          <Section titre="👤 Comptes">
            <p>Réservé à votre rôle : créer un compte envoie une invitation par email à la personne, qui définit elle-même son mot de passe.</p>
          </Section>
        )}

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
    </div>
  );
}
