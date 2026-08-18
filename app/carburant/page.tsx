import { supabase } from "@/lib/supabaseClient";
import { ajouterMouvementCarburant } from "./actions";
import styles from "./page.module.css";

type Stock = {
  id: number;
  type: string;
  quantite_litres: number;
  sites: { nom: string } | null;
};

type Mouvement = {
  id: number;
  type: string;
  mouvement: string;
  quantite_litres: number;
  date_mouvement: string;
  sites: { nom: string } | null;
};

export default async function Carburant() {
  const { data: sites } = await supabase
    .from("sites")
    .select("id, nom")
    .eq("type", "detachement")
    .order("nom");

  const { data: stocks } = await supabase
    .from("carburant_stock")
    .select("id, type, quantite_litres, sites(nom)")
    .returns<Stock[]>();

  const { data: mouvements } = await supabase
    .from("mouvements_carburant")
    .select("id, type, mouvement, quantite_litres, date_mouvement, sites(nom)")
    .order("date_mouvement", { ascending: false })
    .returns<Mouvement[]>();

  return (
    <div className={styles.container}>
      <h1>Carburant</h1>

      <div className={styles.cards}>
        {sites?.map((site) => (
          <div key={site.id} className={styles.card}>
            <div className={styles.cardTitle}>{site.nom}</div>
            {stocks
              ?.filter((s) => s.sites?.nom === site.nom)
              .map((s) => (
                <div key={s.id}>
                  {s.type} : {s.quantite_litres} L
                </div>
              ))}
          </div>
        ))}
      </div>

      <form action={ajouterMouvementCarburant} className={styles.form}>
        <label>
          Votre nom
          <input
            name="utilisateur_nom"
            required
            className={styles.input}
            placeholder="Prénom Nom"
          />
        </label>
        <label>
          Détachement
          <select name="site_id" required className={styles.select}>
            <option value="">-- choisir --</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type de carburant
          <select name="type" required className={styles.select}>
            <option value="gasoil">Gasoil</option>
            <option value="essence">Essence</option>
          </select>
        </label>
        <label>
          Mouvement
          <select name="mouvement" required className={styles.select}>
            <option value="ravitaillement">Ravitaillement</option>
            <option value="consommation">Consommation</option>
          </select>
        </label>
        <label>
          Quantité (litres)
          <input
            name="quantite"
            type="number"
            min={1}
            required
            className={styles.input}
          />
        </label>
        <button type="submit" className={styles.button}>
          Enregistrer
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Site</th>
            <th className={styles.th}>Type</th>
            <th className={styles.th}>Mouvement</th>
            <th className={styles.th}>Quantité</th>
          </tr>
        </thead>
        <tbody>
          {mouvements?.map((m) => (
            <tr key={m.id}>
              <td className={styles.td}>
                {new Date(m.date_mouvement).toLocaleDateString("fr-FR")}
              </td>
              <td className={styles.td}>{m.sites?.nom}</td>
              <td className={styles.td}>{m.type}</td>
              <td className={styles.td}>{m.mouvement}</td>
              <td className={styles.td}>{m.quantite_litres} L</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
