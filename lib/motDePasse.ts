import "server-only";

/**
 * Génération d'un mot de passe temporaire, destiné à être lu à voix haute ou
 * recopié à la main par la personne qui crée le compte.
 *
 * L'alphabet exclut les caractères qui se confondent à l'écrit et à l'oral
 * (0/O, 1/l/I) : un mot de passe qu'on ne peut pas transmettre sans erreur ne
 * sert à rien. Il est présenté par groupes de 4, séparés par des tirets, pour
 * rester lisible d'un seul coup d'œil.
 *
 * 16 caractères pris dans un alphabet de 54 → environ 92 bits d'entropie.
 * Ce mot de passe n'est affiché qu'une fois, à la création du compte : la
 * personne est invitée à le changer dès sa première connexion.
 */

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGUEUR = 16;
const TAILLE_GROUPE = 4;

export function genererMotDePasseTemporaire(): string {
  const octets = new Uint8Array(LONGUEUR);
  crypto.getRandomValues(octets);

  // Rejet des valeurs qui biaiseraient le tirage : 256 n'est pas un multiple de
  // 54, donc un simple modulo rendrait les premiers caractères plus fréquents.
  const limite = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const caracteres: string[] = [];

  while (caracteres.length < LONGUEUR) {
    for (const octet of octets) {
      if (caracteres.length >= LONGUEUR) break;
      if (octet < limite) caracteres.push(ALPHABET[octet % ALPHABET.length]);
    }
    if (caracteres.length < LONGUEUR) crypto.getRandomValues(octets);
  }

  return caracteres
    .join("")
    .match(new RegExp(`.{1,${TAILLE_GROUPE}}`, "g"))!
    .join("-");
}

/** Règle minimale appliquée avant d'accepter un mot de passe choisi par la personne. */
export const LONGUEUR_MINIMALE = 8;

export function messageSiMotDePasseInvalide(motDePasse: string): string | null {
  if (motDePasse.length < LONGUEUR_MINIMALE) {
    return `Le mot de passe doit contenir au moins ${LONGUEUR_MINIMALE} caractères.`;
  }
  return null;
}
