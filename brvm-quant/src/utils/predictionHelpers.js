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

// ===========================================================================
// SAISONNALITÉ, DUEL MODÈLE vs IA, DIRECTIVE & JUSTIFICATION (refonte signaux)
// ===========================================================================

/** Métadonnées visuelles d'un biais saisonnier (haussier / baissier / neutre). */
export function getSeasonMeta(season) {
  const dir = season?.season_dir || "neutre";
  if (dir === "haussier")
    return { dir, color: "var(--ipx-up)", bg: "var(--ipx-up-soft)", arrow: "▲", label: "Saisonnalité favorable" };
  if (dir === "baissier")
    return { dir, color: "var(--ipx-down)", bg: "var(--ipx-down-soft)", arrow: "▼", label: "Saisonnalité défavorable" };
  return { dir, color: "var(--ipx-muted)", bg: "var(--ipx-surface-2)", arrow: "■", label: "Saisonnalité neutre" };
}

/** Score /10 QUALITATIF dérivé de la recommandation Gemini (null si absente). */
export function getGeminiScore10(gemini) {
  if (!gemini || !gemini.recommandation) return null;
  switch (gemini.recommandation) {
    case "Achat fort": return 9;
    case "Achat modéré": return 7;
    case "Conservation": return 5;
    case "Vente": return 2;
    default: return 5;
  }
}

/** Verdict du duel Modèle vs IA : accord, divergence, ou IA indisponible. */
export function getDuelVerdict(modelScore, gemini) {
  const ia = getGeminiScore10(gemini);
  if (ia == null) return { state: "na", label: "Avis IA indisponible", color: "var(--ipx-muted)" };
  const gap = Math.abs(modelScore - ia);
  if (gap <= 1) return { state: "accord", label: "Modèle et IA d'accord", color: "var(--ipx-up)" };
  const who = modelScore > ia ? "Le modèle est plus optimiste que l'IA" : "L'IA est plus optimiste que le modèle";
  return { state: "divergence", label: `Divergence — ${who}`, color: "var(--ipx-warn)" };
}

/**
 * Directive FINALE ultra-claire (ACHAT / CONSERVER / VENTE), réconciliant le
 * signal du modèle et l'avis Gemini quand il est disponible. Transparente :
 * `diverge` indique un désaccord, `source` d'où vient la directive.
 */
export function getFinalDirective(pred, gemini) {
  const signal = getSignal(pred);
  const modelBull = signal === "Achat Fort" ? 2 : signal === "Achat Modéré" ? 1 : 0;
  const iaReco = gemini?.recommandation;
  const iaBull = iaReco === "Achat fort" ? 2 : iaReco === "Achat modéré" ? 1
    : iaReco === "Vente" ? -1 : iaReco === "Conservation" ? 0 : null;

  // Modèle seul haussier -> ACHAT ; sinon CONSERVER. L'IA peut faire basculer en VENTE.
  let label = modelBull >= 1 ? "ACHAT" : "CONSERVER";
  if (iaBull === -1 && modelBull === 0) label = "VENTE";
  const diverge = iaBull != null && ((modelBull >= 1) !== (iaBull >= 1));

  const meta = label === "ACHAT"
    ? { color: "var(--ipx-up)", bg: "var(--ipx-up-soft)" }
    : label === "VENTE"
      ? { color: "var(--ipx-down)", bg: "var(--ipx-down-soft)" }
      : { color: "var(--ipx-muted)", bg: "var(--ipx-surface-2)" };

  return { label, ...meta, diverge };
}

/** Prévision explicite : tendance + objectif (%) + probabilité, à l'horizon. */
export function getForecast(pred, horizonDays = 15, targetReturn = 3.5) {
  const p = Number(pred?.probabilite_modele ?? 0);
  const haussier = p >= 0.5;
  return {
    trend: haussier ? "haussière" : "baissière",
    color: haussier ? "var(--ipx-up)" : "var(--ipx-down)",
    arrow: haussier ? "▲" : "▼",
    objective: `${haussier ? "+" : "−"}${targetReturn.toFixed(1)} %`,
    probaPct: Math.round(p * 100),
    horizonDays,
  };
}

/**
 * Justification LISIBLE du score : liste de « moteurs » (+/−) construite à partir
 * des fondamentaux déjà disponibles (marché) et de la saisonnalité. Sans SHAP :
 * transparent et honnête sur ce qui pousse ou freine le score.
 * Retour : [{ text, sign: '+'|'−' }]
 */
export function buildScoreJustification(pred, market, season) {
  const drivers = [];

  // Momentum relatif (via variation récente si dispo)
  const varPct = Number(market?.variation);
  if (!Number.isNaN(varPct)) {
    if (varPct > 0) drivers.push({ text: "momentum récent positif", sign: "+" });
    else if (varPct < 0) drivers.push({ text: "momentum récent négatif", sign: "−" });
  }

  // RSI : survente (favorable au rebond) / surachat (frein)
  const rsi = Number(market?.rsi_14);
  if (!Number.isNaN(rsi) && rsi > 0) {
    if (rsi < 35) drivers.push({ text: "RSI en zone de survente (potentiel de rebond)", sign: "+" });
    else if (rsi > 70) drivers.push({ text: "RSI en zone de surachat", sign: "−" });
  }

  // Valorisation
  const valo = market?.statut_valorisation;
  if (valo && /sous/i.test(valo)) drivers.push({ text: "valorisation attractive (sous-évaluée)", sign: "+" });
  else if (valo && /sur/i.test(valo)) drivers.push({ text: "valorisation tendue (surévaluée)", sign: "−" });

  // Rendement dividende élevé
  const rdt = Number(market?.rendement_dividende);
  if (!Number.isNaN(rdt) && rdt >= 7) drivers.push({ text: `rendement du dividende élevé (${rdt} %)`, sign: "+" });

  // Saisonnalité (le facteur nouveau)
  if (season?.season_dir === "haussier") drivers.push({ text: "saisonnalité du mois favorable", sign: "+" });
  else if (season?.season_dir === "baissier") drivers.push({ text: "saisonnalité du mois défavorable", sign: "−" });

  return drivers;
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
    return { total: 0, wins: 0, hitRate: 0, avgReturn: 0, series: [], monthly: [], recent: [] };
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

  // Tableau d'écart MODÈLE vs RÉEL : les N dernières prédictions clôturées, du
  // plus récent au plus ancien (prédit -> réel -> réussite).
  const recent = rows
    .slice(-24)
    .reverse()
    .map((p) => ({
      symbole: p.symbole,
      date: p.date_cible,
      signal: p.signal_emis || null,
      proba: p.probabilite_modele != null ? Number(p.probabilite_modele) : null,
      score: p.score_sur_10 != null ? Number(p.score_sur_10) : null,
      real: Number(p.ecart_pourcentage),
      success: p.statut_reussite === true || p.statut_reussite === "true",
    }));

  return {
    total,
    wins,
    hitRate: Math.round((wins / total) * 100),
    avgReturn: sumReturn / total,
    series,
    monthly: Object.values(monthlyMap),
    recent,
  };
}
