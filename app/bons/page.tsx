import { supabase } from "@/lib/supabaseClient";
import { ajouterDemande, mettreAJourStatut } from "./actions";
import VehiculeSelect from "./VehiculeSelect";
import styles from "./page.module.css";

type Bon = {
  id: number;
  quantite: number;
  statut: string;
  date_demande: string;
  demandeur_nom: string | null;
  vehicule_nom: string | null;
  pieces: { nom: string } | null;
};

function classeStatut(statut: string) {
  if (statut === "valide") return styles.valide;
  if (statut === "refuse") return styles.refuse;
  if (statut === "livre") return styles.livre;
  return styles.enAttente;
}

export default async function Bons() {
  const { data: bons } = await supabase
    .from("demandes_pieces")
    .select(
      "id, quantite, statut, date_demande, demandeur_nom, vehicule_nom, pieces(nom)",
    )
    .order("date_demande", { ascending: false })
    .returns<Bon[]>();

  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, nom")
    .order("nom");
  const { data: types } = await supabase
    .from("types_vehicules")
    .select("id, nom")
    .order("nom");

  return (
    <div className={styles.container}>
      <h1>Registre des bons</h1>

      <form action={ajouterDemande} className={styles.form}>
        <label>
          Votre nom
          <input
            name="demandeur_nom"
            required
            className={styles.input}
            placeholder="Prénom Nom"
          />
        </label>

        <VehiculeSelect types={types ?? []} />

        <label>
          Pièce
          <select name="piece_id" required className={styles.select}>
            <option value="">-- choisir --</option>
            {pieces?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantité
          <input
            name="quantite"
            type="number"
            defaultValue={1}
            min={1}
            required
            className={styles.input}
          />
        </label>

        <label>
          Date de la demande
          <input
            name="date_demande"
            type="date"
            required
            className={styles.input}
          />
        </label>

        <label>
          Statut
          <select
            name="statut"
            defaultValue="en_attente"
            required
            className={styles.select}
          >
            <option value="en_attente">en_attente</option>
            <option value="valide">valide</option>
            <option value="refuse">refuse</option>
            <option value="livre">livre</option>
          </select>
        </label>

        <button type="submit" className={styles.button}>
          Envoyer la demande
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Demandeur</th>
            <th className={styles.th}>Véhicule</th>
            <th className={styles.th}>Pièce</th>
            <th className={styles.th}>Qté</th>
            <th className={styles.th}>Statut</th>
            <th className={styles.th}>Changer</th>
          </tr>
        </thead>
        <tbody>
          {bons?.map((b) => (
            <tr key={b.id}>
              <td className={styles.td}>
                {new Date(b.date_demande).toLocaleDateString("fr-FR")}
              </td>
              <td className={styles.td}>{b.demandeur_nom}</td>
              <td className={styles.td}>{b.vehicule_nom}</td>
              <td className={styles.td}>{b.pieces?.nom}</td>
              <td className={styles.td}>{b.quantite}</td>
              <td className={styles.td}>
                <span className={`${styles.badge} ${classeStatut(b.statut)}`}>
                  {b.statut}
                </span>
              </td>
              <td className={styles.td}>
                <form action={mettreAJourStatut} className={styles.statutForm}>
                  <input type="hidden" name="id" value={b.id} />
                  <select
                    name="statut"
                    defaultValue={b.statut}
                    className={styles.select}
                  >
                    <option value="en_attente">en_attente</option>
                    <option value="valide">valide</option>
                    <option value="refuse">refuse</option>
                    <option value="livre">livre</option>
                  </select>
                  <button type="submit" className={styles.button}>
                    OK
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
