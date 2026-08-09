/**
 * portfolioOptim.js — optimisation de portefeuille & projection (fonctions PURES).
 * -------------------------------------------------------------------------------
 * Aucune dépendance React/Supabase -> testable hors navigateur.
 *
 * Choix méthodologiques (marché BRVM peu liquide, historique court) :
 *   - risque DIAGONAL (volatilité par titre, pas de matrice de covariance complète
 *     qui serait instable) ;
 *   - pondération « variance inverse TILTÉE » : w ∝ attractivité / σ²  -> équilibre
 *     rendement/risque, robuste et peu sujet au sur-apprentissage ;
 *   - rendement attendu SHRINKÉ (ramené vers la moyenne) pour ne pas courir après le
 *     meilleur performeur passé ;
 *   - contraintes : plafond par titre, poids minimaux éliminés, nombre max de lignes.
 */

const MONTH_MS = 30.44 * 24 * 3600 * 1000;
const SIGMA_FLOOR = 0.05;   // volatilité annualisée plancher (évite ÷ 0)
const Z = 1.0;              // ~68 % pour les bandes de projection

// ---------------------------------------------------------------------------
// 1. Rendement annualisé (CAGR) + volatilité, par titre
// ---------------------------------------------------------------------------
/** Échantillonne la DERNIÈRE clôture de chaque mois (rows triés par date asc). */
function _monthlyCloses(rows) {
  const byMonth = new Map();
  for (const r of rows) {
    const d = new Date(`${String(r.date).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime()) || !(Number(r.close) > 0)) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, Number(r.close)); // dernière valeur du mois écrase
  }
  return [...byMonth.values()];
}

/** Stats d'un titre : { mu (annualisé), sigma (annualisée), nMonths }. */
export function annualizedStats(rows) {
  const sorted = [...(rows || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = _monthlyCloses(sorted);
  const n = closes.length;
  if (n < 4) return { mu: 0, sigma: SIGMA_FLOOR, nMonths: n };

  // Rendement annualisé par CAGR (moins bruité que la moyenne des rendements).
  const years = (n - 1) / 12;
  const cagr = years > 0 ? Math.pow(closes[n - 1] / closes[0], 1 / years) - 1 : 0;

  // Volatilité : écart-type des rendements mensuels, annualisé (× √12).
  const rets = [];
  for (let i = 1; i < n; i++) rets.push(closes[i] / closes[i - 1] - 1);
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const varMonthly = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  const sigma = Math.max(SIGMA_FLOOR, Math.sqrt(varMonthly) * Math.sqrt(12));

  return { mu: cagr, sigma, nMonths: n };
}

/** { [sym]: {mu, sigma, nMonths} } à partir de { [sym]: rows[] }. */
export function expectedReturnsAndRisk(historyBySymbol) {
  const out = {};
  for (const [sym, rows] of Object.entries(historyBySymbol || {})) {
    out[sym] = annualizedStats(rows);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Optimisation des poids (variance inverse tiltée + contraintes)
// ---------------------------------------------------------------------------
function _clamp01(x) { return Math.max(0, Math.min(1, x)); }

function _normalize01(vals) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!(max > min)) return vals.map(() => 0.5);
  return vals.map((v) => (v - min) / (max - min));
}

/** Applique un plafond par poids puis renormalise (water-filling simple). */
function _capNormalize(weights, cap) {
  let w = [...weights];
  for (let iter = 0; iter < 12; iter++) {
    const total = w.reduce((s, x) => s + x, 0) || 1;
    w = w.map((x) => x / total);
    const over = w.some((x) => x > cap + 1e-9);
    if (!over) break;
    const excess = w.reduce((s, x) => s + Math.max(0, x - cap), 0);
    const underSum = w.reduce((s, x) => s + (x < cap ? x : 0), 0) || 1;
    w = w.map((x) => (x >= cap ? cap : x + (excess * x) / underSum));
  }
  return w;
}

/**
 * Optimise les poids d'un portefeuille long-only, robuste et cohérent avec la
 * méthode. `candidates` : [{ symbole, mu, sigma, methodSignal }] (methodSignal ∈ [0,1]).
 * Retourne [{ symbole, weight }] (poids > 0, somme = 1), trié par poids décroissant.
 */
export function optimizeWeights(candidates, opts = {}) {
  const {
    cap = 0.35, minWeight = 0.05, maxHoldings = 6,
    returnWeight = 0.6, methodWeight = 0.4, shrink = 0.5,
  } = opts;

  const list = (candidates || []).filter((c) => c && c.symbole && Number(c.sigma) > 0);
  if (list.length === 0) return [];
  if (list.length === 1) return [{ symbole: list[0].symbole, weight: 1 }];

  // Rendement attendu SHRINKÉ (vers la moyenne transversale) puis normalisé [0,1].
  const mus = list.map((c) => Number(c.mu) || 0);
  const meanMu = mus.reduce((s, x) => s + x, 0) / mus.length;
  const muShrunk = mus.map((m) => shrink * m + (1 - shrink) * meanMu);
  const muNorm = _normalize01(muShrunk);

  // Attractivité = mélange rendement + signal de méthode ; puis /σ² (risque).
  let raw = list.map((c, i) => {
    const method = _clamp01(Number(c.methodSignal ?? 0.5));
    const attractiveness = returnWeight * muNorm[i] + methodWeight * method;
    const sigma = Math.max(SIGMA_FLOOR, Number(c.sigma));
    return Math.max(0, attractiveness) / (sigma * sigma);
  });
  if (raw.every((x) => x === 0)) raw = list.map((c) => 1 / (Number(c.sigma) ** 2)); // repli

  // Poids initiaux -> plafond -> on ne garde que les maxHoldings plus gros ->
  // on retire les poids < minWeight -> renormalise.
  let weights = _capNormalize(raw, cap);
  let idx = weights.map((w, i) => ({ i, w }))
    .sort((a, b) => b.w - a.w)
    .slice(0, maxHoldings);
  idx = idx.filter((e) => e.w >= minWeight);
  if (idx.length === 0) idx = [weights.map((w, i) => ({ i, w })).sort((a, b) => b.w - a.w)[0]];

  const keptRaw = idx.map((e) => raw[e.i]);
  const kept = _capNormalize(keptRaw, cap);
  return idx
    .map((e, k) => ({ symbole: list[e.i].symbole, weight: kept[k] }))
    .sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// 3. Projection à scénarios (pessimiste / médian / optimiste)
// ---------------------------------------------------------------------------
/**
 * Projette la valeur du portefeuille sur `years` années.
 * Modèle log-normal pour le capital (drift = ln(1+r), diffusion = σ√t) + revenu
 * de dividendes ajouté linéairement (plus stable). z≈1 => bande ~68 %.
 * Retour : [{ year, low, median, high }] (année 0 = capital investi).
 */
export function projectScenarios(invested, annualReturn, annualVol, dividendYield = 0, years = 5) {
  const V = Number(invested) || 0;
  const r = Number(annualReturn) || 0;
  const sig = Math.max(0, Number(annualVol) || 0);
  const dy = Math.max(0, Number(dividendYield) || 0);
  const drift = Math.log(1 + Math.max(-0.95, r));

  const out = [{ year: 0, low: V, median: V, high: V }];
  for (let t = 1; t <= years; t++) {
    const capMed = V * Math.exp(drift * t);
    const spread = Z * sig * Math.sqrt(t);
    const capLow = V * Math.exp(drift * t - spread);
    const capHigh = V * Math.exp(drift * t + spread);
    const div = V * dy * t; // dividendes cumulés (revenu, ajouté aux 3 scénarios)
    out.push({
      year: t,
      low: Math.round(capLow + div),
      median: Math.round(capMed + div),
      high: Math.round(capHigh + div),
    });
  }
  return out;
}
