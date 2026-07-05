/**
 * predictionHelpers.js
 * --------------------
 * Fonctions pures de « vulgarisation » : elles traduisent les grandeurs
 * quantitatives (probabilité, signal, écart) en éléments visuels lisibles
 * (couleurs, libellés, score sur 10). Aucune dépendance React -> testables.
 *
 * Toutes les couleurs renvoyées pointent vers les tokens de thème (--ipx-*),
 * elles s'adaptent donc automatiquement au mode Dark ou Solar.
 */

/** Score entier sur 10 à partir d'une ligne de prédiction.
 *  Utilise la colonne `score_sur_10` si présente, sinon dérive de la proba. */
export function getScore10(pred) {
  if (pred?.score_sur_10 != null) return Math.round(pred.score_sur_10);
  const p = Number(pred?.probabilite_modele ?? 0);
  return Math.max(0, Math.min(10, Math.round(p * 10)));
}

/** Signal métier : on privilégie la valeur stockée, sinon on la recalcule. */
export function getSignal(pred) {
  if (pred?.signal_emis) return pred.signal_emis;
  const p = Number(pred?.probabilite_modele ?? 0);
  if (p >= 0.7) return "Achat Fort";
  if (p >= 0.55) return "Achat Modéré";
  return "Conserver";
}

/** Métadonnées visuelles d'un signal : couleur + fond + intensité (0..1). */
export function getSignalMeta(signal) {
  switch (signal) {
    case "Achat Fort":
      return { color: "var(--ipx-up)", bg: "var(--ipx-up-soft)", strength: 1, label: "Achat Fort" };
    case "Achat Modéré":
      return { color: "var(--ipx-warn)", bg: "var(--ipx-warn-soft)", strength: 0.6, label: "Achat Modéré" };
    default:
      return { color: "var(--ipx-muted)", bg: "var(--ipx-surface-2)", strength: 0.25, label: "Conserver" };
  }
}

/** Couleur d'un score /10 : rouge (faible) -> ambre -> vert (fort). */
export function getScoreColor(score) {
  if (score >= 7) return "var(--ipx-up)";
  if (score >= 5) return "var(--ipx-warn)";
  return "var(--ipx-down)";
}

/** Couleur d'un écart de performance (backtest) selon son signe. */
export function getPnlColor(pct) {
  if (pct > 0) return "var(--ipx-up)";
  if (pct < 0) return "var(--ipx-down)";
  return "var(--ipx-muted)";
}

/** Formatage FCFA compact et lisible. */
export function formatFcfa(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("fr-FR")} F`;
}

/** Formatage pourcentage signé (ex: +3.4 %). */
export function formatPct(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const v = Number(value);
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)} %`;
}

/**
 * Agrège une liste de prédictions CLÔTURÉES (avec statut_reussite) en
 * statistiques de backtest + séries temporelles prêtes pour Recharts.
 */
export function computeBacktest(closedPreds) {
  const rows = (closedPreds || [])
    .filter((p) => p.statut_reussite != null && p.ecart_pourcentage != null)
    .sort((a, b) => (a.date_cible < b.date_cible ? -1 : 1));

  const total = rows.length;
  if (total === 0) {
    return { total: 0, wins: 0, hitRate: 0, avgReturn: 0, series: [], monthly: [] };
  }

  let wins = 0;
  let cumWins = 0;
  let sumReturn = 0;
  const series = [];
  const monthlyMap = {};

  rows.forEach((p, i) => {
    const success = p.statut_reussite === true || p.statut_reussite === "true";
    if (success) {
      wins += 1;
      cumWins += 1;
    }
    sumReturn += Number(p.ecart_pourcentage);

    // Taux de réussite CUMULÉ (courbe qui se lisse dans le temps)
    series.push({
      date: p.date_cible,
      hitRate: Math.round((cumWins / (i + 1)) * 100),
      ecart: Number(p.ecart_pourcentage),
    });

    // Agrégat mensuel (barres succès vs échec)
    const month = String(p.date_cible).slice(0, 7); // YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = { month, success: 0, fail: 0 };
    if (success) monthlyMap[month].success += 1;
    else monthlyMap[month].fail += 1;
  });

  return {
    total,
    wins,
    hitRate: Math.round((wins / total) * 100),
    avgReturn: sumReturn / total,
    series,
    monthly: Object.values(monthlyMap),
  };
}
