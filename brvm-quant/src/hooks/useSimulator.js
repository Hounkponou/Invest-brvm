import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { expectedReturnsAndRisk, optimizeWeights, projectScenarios } from '../utils/portfolioOptim';

// Récupère ~3 ans d'historique (date, close) par titre, depuis le bucket CDN
// (déjà servi au graphique de détail), avec repli sur full_stock_pro.
async function fetchHistories(symbols, sinceStr) {
  const out = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const { data: pub } = supabase.storage.from('market-history').getPublicUrl(`${sym}.json`);
      const res = await fetch(pub.publicUrl, { cache: 'no-cache' });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) { out[sym] = rows.filter((r) => String(r.date).slice(0, 10) >= sinceStr); return; }
      }
    } catch (e) { /* repli ci-dessous */ }
    try {
      const { data } = await supabase.from('full_stock_pro').select('date, close')
        .eq('symbole', sym).gte('date', sinceStr).order('date', { ascending: true });
      if (Array.isArray(data)) out[sym] = data;
    } catch (e) { /* titre ignoré */ }
  }));
  return out;
}

/**
 * useSimulator — construit un portefeuille optimisé (rendement/risque + tilt de
 * méthode), le backteste sur 3 ans et projette 5 ans, puis permet de l'adopter.
 * Isole toute la logique de simulation hors d'App.jsx.
 *
 * @param {object[]} filteredMarket  Univers filtré (= marché visible).
 * @param {object|null} user         Utilisateur connecté (pour l'adoption en base).
 * @param {(rows: object[]) => void} onPurchased  Appelé avec les positions adoptées
 *   (shape portefeuille) pour les injecter dans le portefeuille courant.
 */
export default function useSimulator(filteredMarket, user, onPurchased) {
  const [simCapital, setSimCapital] = useState(1000000);
  const [simStrategy, setSimStrategy] = useState('value');
  const [proposedPortfolio, setProposedPortfolio] = useState([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  const runSimulationAndBacktest = async () => {
    setLoadingSim(true); setBacktestResult(null);
    // 1. Score de MÉTHODE -> shortlist des 8 meilleurs candidats.
    const scoredStocks = [...filteredMarket].map((item) => {
      let simScore = item.score_ia;
      if (simStrategy === 'value' && item.per && item.per < 12) simScore += 3;
      if (simStrategy === 'value' && item.rsi_14 < 35) simScore += 2;
      if (simStrategy === 'momentum' && item.variation > 1) simScore += 3;
      if (simStrategy === 'momentum' && item.rsi_14 > 50 && item.rsi_14 < 70) simScore += 2;
      if (simStrategy === 'rente' && (item.rendement_dividende || 0) > 7) simScore += 5;
      return { ...item, simScore };
    }).sort((a, b) => b.simScore - a.simScore);

    const shortlist = scoredStocks.slice(0, 8);
    const symbols = shortlist.map((s) => s.symbole);
    const bySym = Object.fromEntries(shortlist.map((s) => [s.symbole, s]));
    const sinceStr = new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0];

    try {
      // 2. Historique 3 ans -> rendement annualisé & volatilité par titre.
      const historyBySymbol = await fetchHistories(symbols, sinceStr);
      const stats = expectedReturnsAndRisk(historyBySymbol);

      // 3. OPTIMISATION des poids : rendement/risque robuste + tilt de méthode.
      const scores = shortlist.map((s) => s.simScore);
      const minS = Math.min(...scores), maxS = Math.max(...scores);
      const candidates = shortlist
        .filter((s) => stats[s.symbole] && stats[s.symbole].nMonths >= 4)
        .map((s) => ({
          symbole: s.symbole,
          mu: stats[s.symbole].mu,
          sigma: stats[s.symbole].sigma,
          methodSignal: maxS > minS ? (s.simScore - minS) / (maxS - minS) : 0.5,
        }));
      let weights = optimizeWeights(candidates, { cap: 0.35, minWeight: 0.05, maxHoldings: 6 });
      if (weights.length === 0) {
        // Repli (aucun historique) : équipondération des 4 premiers.
        weights = shortlist.slice(0, 4).map((s) => ({ symbole: s.symbole, weight: 0.25 }));
      }

      // 4. Portefeuille à ACHETER AUJOURD'HUI (un seul compte d'actions, cohérent
      //    entre cartes, capital investi et backtest).
      const newPort = [];
      weights.forEach(({ symbole, weight }) => {
        const item = bySym[symbole];
        const rows = (historyBySymbol[symbole] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
        const pastPrice = rows.length ? Number(rows[0].close) : item.close;
        const sigma = stats[symbole]?.sigma || 0.2;
        const sharesNow = Math.floor((simCapital * weight) / item.close);
        if (sharesNow <= 0) return;                       // trop cher pour 1 action -> ignoré
        newPort.push({ sigle: symbole, nom: item.nom, shares: sharesNow, buyPrice: item.close, pastPrice, yield: item.rendement_dividende || 0, sigma, targetWeight: weight });
      });

      // REMPLISSAGE du cash résiduel : on rachète des actions ENTIÈRES avec le
      // reste, en visant le titre le plus sous-alloué vs sa cible -> on déploie
      // ~tout le capital tout en respectant les proportions.
      let remaining = simCapital - newPort.reduce((a, p) => a + p.shares * p.buyPrice, 0);
      for (let guard = 0; guard < 10000; guard++) {
        const affordable = newPort.filter((p) => p.buyPrice <= remaining);
        if (affordable.length === 0) break;               // reste < action la moins chère
        affordable.sort((a, b) =>
          (b.targetWeight * simCapital - b.shares * b.buyPrice) - (a.targetWeight * simCapital - a.shares * a.buyPrice));
        affordable[0].shares += 1;
        remaining -= affordable[0].buyPrice;
      }

      // Totaux APRÈS remplissage + poids réels (somme = 100 %, alignés aux « Alloué »).
      let investedNow = 0, value3yAgo = 0, dividends3y = 0, portVar = 0;
      newPort.forEach((p) => {
        p.total = p.shares * p.buyPrice;
        investedNow += p.total;
        value3yAgo += p.shares * p.pastPrice;
        dividends3y += (p.shares * p.pastPrice) * ((p.yield || 0) / 100) * 3;
      });
      newPort.forEach((p) => { p.weight = investedNow > 0 ? p.total / investedNow : 0; portVar += (p.weight * p.sigma) ** 2; });
      const cashRestant = Math.max(0, Math.round(simCapital - investedNow));
      setProposedPortfolio(newPort);

      // 5. Preuve de concept + PROJECTION (base = ce qu'on investit AUJOURD'HUI).
      const capitalGain = investedNow - value3yAgo;
      const perf3y = value3yAgo > 0 ? ((capitalGain + dividends3y) / value3yAgo) * 100 : 0;
      const capAnnual = (value3yAgo > 0 && investedNow > 0) ? Math.pow(investedNow / value3yAgo, 1 / 3) - 1 : 0;
      const annualVol = Math.sqrt(portVar);
      const divYieldAnnual = value3yAgo > 0 ? (dividends3y / value3yAgo) / 3 : 0;
      const projection = projectScenarios(Math.round(investedNow), capAnnual, annualVol, divYieldAnnual, 5);

      setBacktestResult({
        investedNow: Math.round(investedNow),   // = somme des « Alloué » des cartes
        capital: Math.round(simCapital),
        cashRestant,
        value3yAgo: Math.round(value3yAgo),
        capitalGain: Math.round(capitalGain),
        dividends: Math.round(dividends3y),
        perf3y,
        annualReturn: (capAnnual + divYieldAnnual) * 100,
        annualVol: annualVol * 100,
        projection,
        objectiveLabel: 'Rendement/risque, cohérent avec la méthode',
      });
    } catch (err) { console.error(err); }
    setLoadingSim(false);
  };

  const confirmPurchase = async () => {
    const cloudEntries = proposedPortfolio.map((p) => ({ user_id: user.id, sigle: p.sigle, nom: p.nom, shares: p.shares, buy_price: p.buyPrice, total: p.total }));
    const { data, error } = await supabase.from('user_portfolios').insert(cloudEntries).select();
    if (!error && data) {
      onPurchased?.(data.map((item) => ({ id: item.id, sigle: item.sigle, nom: item.nom, shares: Number(item.shares), buyPrice: Number(item.buy_price), total: Number(item.total) })));
      setProposedPortfolio([]); setBacktestResult(null);
    }
  };

  return {
    simCapital, setSimCapital,
    simStrategy, setSimStrategy,
    proposedPortfolio,
    loadingSim, backtestResult,
    runSimulationAndBacktest, confirmPurchase,
  };
}
