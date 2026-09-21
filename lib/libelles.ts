/**
 * Libellés partagés — une seule définition par notion.
 *
 * Deux pièces peuvent porter le même nom pour des véhicules différents
 * (« Amortisseur AR » existe en CSK et en LAND-CRUISER) : dès qu'on affiche une
 * pièce, on affiche donc aussi le véhicule concerné. Ces fonctions sont la
 * source unique de ces libellés, côté formulaire comme côté liste.
 */

type TypeVehicule = { nom: string } | null | undefined;

/** « Amortisseur AR — MASSTECH », ou « … — Générique » pour les consommables. */
export function libellePiece(piece: {
  nom: string;
  types_vehicules?: TypeVehicule;
}): string {
  return `${piece.nom} — ${libelleTypeVehicule(piece.types_vehicules)}`;
}

/** « MASSTECH », ou « Générique » si la pièce n'est rattachée à aucun type. */
export function libelleTypeVehicule(type: TypeVehicule): string {
  return type?.nom ?? "Générique";
}

/** « 1234 AB 56 — MASSTECH ». */
export function libelleVehicule(vehicule: {
  immatriculation: string;
  types_vehicules?: TypeVehicule;
}): string {
  const type = vehicule.types_vehicules?.nom;
  return type ? `${vehicule.immatriculation} — ${type}` : vehicule.immatriculation;
}

const LIBELLES_ROLE: Record<string, string> = {
  technicien: "Technicien",
  chef_detachement: "Chef de détachement",
  chef_garage: "Chef Garage",
  comptable_matieres: "Comptable Matières",
  chef_service_technique: "Chef Service Technique",
};

/** Nom lisible d'un rôle technique (`chef_detachement` → « Chef de détachement »). */
export function libelleRole(role: string): string {
  return LIBELLES_ROLE[role] ?? role;
}

const LIBELLES_MOUVEMENT_STOCK: Record<string, string> = {
  consommation: "Pièce utilisée",
  transfert_sortie: "Envoi vers un autre site",
  transfert_entree: "Reçu d'un autre site",
  correction: "Mise à jour du stock",
};

export function libelleMouvementStock(type: string): string {
  return LIBELLES_MOUVEMENT_STOCK[type] ?? type;
}

/** Un mouvement qui fait baisser la quantité du site. */
export function mouvementEstSortie(type: string): boolean {
  return type === "consommation" || type === "transfert_sortie";
}
