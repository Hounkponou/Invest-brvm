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
    case "Vente":
      return { color: "var(--ipx-down)", bg: "var(--ipx-down-soft)", strength: 1, label: "Vente" };
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
// HORIZONS MULTIPLES (miroir de core.config.HORIZONS côté backend)
// ===========================================================================
export const HORIZONS = [
  { days: 5, key: "court", target: 1, label: "Court terme", short: "Court · 5 j" },
  { days: 20, key: "moyen", target: 2, label: "Moyen terme", short: "Moyen · 20 j" },
  { days: 60, key: "long", target: 4, label: "Long terme", short: "Long · 60 j" },
];

/** Cible de rendement (%) d'un horizon (jours). Défaut 2 % (moyen). */
export function horizonTarget(days) {
  const h = HORIZONS.find((x) => x.days === Number(days));
  return h ? h.target : 2;
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
  const modelBear = signal === "Vente";
  const iaReco = gemini?.recommandation;
  const iaBull = iaReco === "Achat fort" ? 2 : iaReco === "Achat modéré" ? 1
    : iaReco === "Vente" ? -1 : iaReco === "Conservation" ? 0 : null;

  // Modèle haussier -> ACHAT ; modèle baissier -> VENTE ; sinon CONSERVER.
  // L'IA (Gemini) peut aussi faire basculer un « Conserver » modèle en VENTE.
  let label = modelBull >= 1 ? "ACHAT" : modelBear ? "VENTE" : "CONSERVER";
  if (iaBull === -1 && modelBull === 0 && !modelBear) label = "VENTE";
  const diverge = iaBull != null && ((modelBull >= 1) !== (iaBull >= 1));

  const meta = label === "ACHAT"
    ? { color: "var(--ipx-up)", bg: "var(--ipx-up-soft)" }
    : label === "VENTE"
      ? { color: "var(--ipx-down)", bg: "var(--ipx-down-soft)" }
      : { color: "var(--ipx-muted)", bg: "var(--ipx-surface-2)" };

  return { label, ...meta, diverge };
}

/** Sens de la directive : +1 (ACHAT), -1 (VENTE), 0 (CONSERVER). */
function directiveDir(directive) {
  if (directive?.label === "ACHAT") return 1;
  if (directive?.label === "VENTE") return -1;
  return 0;
}

/**
 * Prévision explicite, COHÉRENTE avec la directive : la tendance affichée suit
 * la directive finale (fini « CONSERVER + tendance haussière »).
 *   - ACHAT    -> tendance haussière ;
 *   - VENTE    -> tendance baissière ;
 *   - CONSERVER-> tendance neutre.
 */
export function getForecast(pred, directive, horizonDays = 15, targetReturn = 2.0) {
  const p = Number(pred?.probabilite_modele ?? 0);
  const dir = directiveDir(directive);
  if (dir > 0)
    return { trend: "haussière", color: "var(--ipx-up)", arrow: "▲",
             objective: `+${targetReturn.toFixed(1)} %`, probaPct: Math.round(p * 100), horizonDays };
  if (dir < 0)
    return { trend: "baissière", color: "var(--ipx-down)", arrow: "▼",
             objective: `−${targetReturn.toFixed(1)} %`, probaPct: Math.round(p * 100), horizonDays };
  return { trend: "neutre", color: "var(--ipx-muted)", arrow: "■",
           objective: "≈ stable", probaPct: Math.round(p * 100), horizonDays };
}

/**
 * COURS CIBLE chiffré (valeur de l'action prévue) + fourchette basse/haute.
 * Transparent : le point central est le niveau-objectif du modèle
 * (prix × (1 ± objectif)) ; la fourchette est une amplitude ~1σ sur l'horizon,
 * estimée depuis l'ATR (volatilité) ou, à défaut, ±3 %. Cohérent avec la
 * directive : ACHAT vise plus haut, VENTE plus bas, CONSERVER reste autour du prix.
 */
export function getTargetPrice(pred, market, directive, horizonDays = 15, targetReturn = 2.0) {
  const entry = Number(pred?.prix_initial);
  if (!entry || entry <= 0) return null;

  const dir = directiveDir(directive);
  const central = entry * (1 + (dir * targetReturn) / 100);

  // Amplitude d'incertitude : ATR journalier projeté sur l'horizon (~écart-type).
  const atr = Number(market?.atr_14);
  const band = atr > 0 ? atr * Math.sqrt(horizonDays) : central * 0.03;

  const low = Math.max(0, Math.round(central - band));
  const high = Math.round(central + band);
  return {
    entry: Math.round(entry),
    central: Math.round(central),
    low,
    high,
    dir,
    deltaPct: ((central - entry) / entry) * 100,
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
/**
 * Statut à 3 MODALITÉS d'une prédiction clôturée :
 *   - "reussi"  : objectif atteint (statut_reussite = true) ;
 *   - "partiel" : bon SENS mais objectif non atteint (écart > 0 sans toucher la cible) ;
 *   - "manque"  : mauvais sens (écart ≤ 0).
 * Dérivé sans migration : statut_reussite (cible atteinte) + signe de l'écart.
 */
export function getClosedStatus(p) {
  const reached = p.statut_reussite === true || p.statut_reussite === "true";
  if (reached) return "reussi";
  return Number(p.ecart_pourcentage) > 0 ? "partiel" : "manque";
}

/** Métadonnées visuelles d'un statut à 3 modalités. */
export function getClosedStatusMeta(status) {
  if (status === "reussi")
    return { label: "Réussi", color: "var(--ipx-up)", bg: "var(--ipx-up-soft)" };
  if (status === "partiel")
    return { label: "Partiel", color: "var(--ipx-warn)", bg: "var(--ipx-warn-soft)" };
  return { label: "Manqué", color: "var(--ipx-down)", bg: "var(--ipx-down-soft)" };
}

export function computeBacktest(closedPreds, horizonDays = null) {
  const rows = (closedPreds || [])
    .filter((p) => p.statut_reussite != null && p.ecart_pourcentage != null)
    // Filtre optionnel par horizon (challenge harmonisé avec le sélecteur d'horizon).
    .filter((p) => horizonDays == null || Number(p.horizon_jours) === Number(horizonDays))
    .sort((a, b) => (a.date_cible < b.date_cible ? -1 : 1));

  const total = rows.length;
  if (total === 0) {
    return {
      total: 0, wins: 0, partial: 0, missed: 0, hitRate: 0, directionalRate: 0,
      avgReturn: 0, series: [], monthly: [], recent: [],
    };
  }

  let wins = 0;
  let partial = 0;
  let missed = 0;
  let cumWins = 0;
  let cumDir = 0; // réussi + partiel (bon sens)
  let sumReturn = 0;
  const series = [];
  const monthlyMap = {};

  rows.forEach((p, i) => {
    const status = getClosedStatus(p);
    if (status === "reussi") { wins += 1; cumWins += 1; cumDir += 1; }
    else if (status === "partiel") { partial += 1; cumDir += 1; }
    else { missed += 1; }
    sumReturn += Number(p.ecart_pourcentage);

    // Courbes CUMULÉES : réussite stricte + « bon sens » (réussi + partiel).
    series.push({
      date: p.date_cible,
      hitRate: Math.round((cumWins / (i + 1)) * 100),
      dirRate: Math.round((cumDir / (i + 1)) * 100),
      ecart: Number(p.ecart_pourcentage),
    });

    // Agrégat mensuel à 3 modalités (barres empilées réussi / partiel / manqué).
    const month = String(p.date_cible).slice(0, 7); // YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = { month, reussi: 0, partiel: 0, manque: 0 };
    monthlyMap[month][status] += 1;
  });

  // Tableau d'écart MODÈLE vs RÉEL : les N dernières prédictions clôturées.
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
      status: getClosedStatus(p),
    }));

  return {
    total,
    wins,
    partial,
    missed,
    hitRate: Math.round((wins / total) * 100),
    directionalRate: Math.round(((wins + partial) / total) * 100),
    avgReturn: sumReturn / total,
    series,
    monthly: Object.values(monthlyMap),
    recent,
  };
}
