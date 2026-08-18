import { supabase } from "@/lib/supabaseClient";
import { ajouterVehicule, ajouterUtilisation } from "./actions";
import styles from "./page.module.css";

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

export default async function Vehicules() {
  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, immatriculation, statut, types_vehicules(nom), sites(nom)")
    .order("id", { ascending: false })
    .returns<Vehicule[]>();

  const { data: types } = await supabase
    .from("types_vehicules")
    .select("id, nom")
    .order("nom");
  const { data: sites } = await supabase
    .from("sites")
    .select("id, nom")
    .order("nom");
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, nom")
    .order("nom");

  const { data: utilisations } = await supabase
    .from("pieces_utilisees")
    .select(
      "id, quantite, date_utilisation, utilisateur_nom, vehicules(immatriculation), pieces(nom)",
    )
    .order("date_utilisation", { ascending: false })
    .returns<Utilisation[]>();

  return (
    <div className={styles.container}>
      <h1>Véhicules</h1>

      <h2>Enregistrer l&apos;arrivée d&apos;un véhicule</h2>
      <form action={ajouterVehicule} className={styles.form}>
        <label>
          Immatriculation
          <input name="immatriculation" required className={styles.input} />
        </label>
        <label>
          Type de véhicule
          <select name="type_vehicule_id" required className={styles.select}>
            <option value="">-- choisir --</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          Site d&apos;arrivée
          <select name="site_id" required className={styles.select}>
            <option value="">-- choisir --</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.button}>
          Enregistrer l&apos;arrivée
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Immatriculation</th>
            <th className={styles.th}>Type</th>
            <th className={styles.th}>Site</th>
            <th className={styles.th}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {vehicules?.map((v) => (
            <tr key={v.id}>
              <td className={styles.td}>{v.immatriculation}</td>
              <td className={styles.td}>{v.types_vehicules?.nom}</td>
              <td className={styles.td}>{v.sites?.nom}</td>
              <td className={styles.td}>{v.statut}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className={styles.sectionTitle}>
        Enregistrer les pièces utilisées pour une réparation
      </h2>
      <form action={ajouterUtilisation} className={styles.form}>
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
          Véhicule
          <select name="vehicule_id" required className={styles.select}>
            <option value="">-- choisir --</option>
            {vehicules?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.immatriculation}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pièce utilisée
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
          Date d&apos;utilisation
          <input
            name="date_utilisation"
            type="date"
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
            <th className={styles.th}>Véhicule</th>
            <th className={styles.th}>Pièce</th>
            <th className={styles.th}>Qté</th>
            <th className={styles.th}>Par</th>
          </tr>
        </thead>
        <tbody>
          {utilisations?.map((u) => (
            <tr key={u.id}>
              <td className={styles.td}>
                {new Date(u.date_utilisation).toLocaleDateString("fr-FR")}
              </td>
              <td className={styles.td}>{u.vehicules?.immatriculation}</td>
              <td className={styles.td}>{u.pieces?.nom}</td>
              <td className={styles.td}>{u.quantite}</td>
              <td className={styles.td}>{u.utilisateur_nom}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
