import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSector } from './utils/brvmConfig';
import { getValColor, getRsiColor } from './utils/uiHelpers';
import useTheme from './hooks/useTheme'; // Source de vérité UNIQUE du thème (Dark/Solar)
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Composants de Layout et Modales
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import SellModal from './components/SellModal';
import PerSectorCompare from './components/PerSectorCompare';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import Simulator from './pages/Simulator';
import Portfolio from './pages/Portfolio';
import Predictions from './pages/Predictions'; // Nouveau Module Prédictif (autonome, thème Dark/Solar)
import Market from './pages/Market'; // Page ANALYSE unifiée (Fondamentaux + Signaux IA)
import useSimulator from './hooks/useSimulator';
import useRisk from './hooks/useRisk';
import RiskPanel from './components/RiskPanel';
import useNews from './hooks/useNews';
import NewsPanel from './components/NewsPanel';
import usePredictions from './hooks/usePredictions';
import useMarketData from './hooks/useMarketData';
import useStockHistory from './hooks/useStockHistory';
import useAuth from './hooks/useAuth';
import usePortfolio from './hooks/usePortfolio';
import useGeminiRecos from './hooks/useGeminiRecos';
import useSeasonality from './hooks/useSeasonality';
import PredictionAnalysisPanel from './components/PredictionAnalysisPanel';
import ProjectionChart from './components/prediction/ProjectionChart';
import GeminiRecoPanel from './components/prediction/GeminiRecoPanel';

// ==========================================
// MOYENNES MOBILES (MM20 / MM50 / MM100)
// ==========================================
// L'historique par titre ne contient que sma_20 (backend). On calcule MM50 et
// MM100 CÔTÉ CLIENT à partir des clôtures — sur l'historique COMPLET (les valeurs
// en début de fenêtre visible restent correctes), avant tout filtrage d'horizon.
const MA_CONFIG = [
  { win: 20, key: 'sma_20', color: 'var(--warn-color)', label: 'MM20' },
  { win: 50, key: 'sma_50', color: '#8b5cf6', label: 'MM50' },
  { win: 100, key: 'sma_100', color: '#14b8a6', label: 'MM100' },
];

function withMovingAverages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const closes = rows.map((r) => Number(r.close));
  const out = rows.map((r) => ({ ...r }));
  [50, 100].forEach((win) => {
    let sum = 0;
    for (let i = 0; i < out.length; i++) {
      sum += closes[i];
      if (i >= win) sum -= closes[i - win];
      out[i][`sma_${win}`] = i >= win - 1 ? Math.round(sum / win) : null;
    }
  });
  return out;
}

// Analyse de tendance dérivée des moyennes mobiles (dernier point disponible).
function movingAverageAnalysis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const last = rows[rows.length - 1];
  const price = Number(last.close);
  const above = (k) => (last[k] != null ? price >= Number(last[k]) : null);
  const cross = last.sma_50 != null && last.sma_100 != null
    ? (Number(last.sma_50) >= Number(last.sma_100) ? 'golden' : 'death')
    : null;
  return { price, above20: above('sma_20'), above50: above('sma_50'), above100: above('sma_100'), cross };
}


export default function App() {
  // ==========================================
  // 1. ÉTATS GLOBAUX
  // ==========================================
  // Authentification (session + formulaire de connexion) — encapsulée dans le hook.
  const {
    user, sessionLoading,
    showAuthModal, setShowAuthModal, isSignUp, setIsSignUp,
    authEmail, setAuthEmail, authPassword, setAuthPassword,
    authLoading, handleAuth, handleLogout,
  } = useAuth();

  // ── THÈME UNIFIÉ ────────────────────────────────────────────────────────
  // Un SEUL hook pilote désormais tout l'app (anciennes pages + Module
  // Prédictif). Il écrit data-theme="dark|solar" sur <html> ; toutes les
  // variables CSS (--bg-base, --ipx-*, utilitaires Tailwind) en découlent.
  // On expose isDarkMode/toggleTheme pour rester compatible avec les
  // composants existants (TopHeader, Landing) qui attendent ces props.
  const { isDark, toggleTheme } = useTheme();
  const isDarkMode = isDark;

  // Menu ouvert par défaut sur desktop, FERMÉ sur mobile (le tiroir couvrirait le contenu).
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 768
  );
  
  // Snapshot marché (+ fraîcheur) — chargement/polling encapsulés dans le hook.
  const { marketData, loadingMarket, marketMeta } = useMarketData(user);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSector, setGlobalSector] = useState('All');
  const [filterVal, setFilterVal] = useState('All');
  const [filterRsi, setFilterRsi] = useState('All');
  const [filterLiquidity, setFilterLiquidity] = useState('All');
  const { bySymbol: riskBySymbol } = useRisk();  // métriques de risque par titre (risk.json)
  const { bySymbol: newsBySymbol } = useNews();  // actualité par titre (news.json)
  // Prédictions + Gemini + saisonnalité REMONTÉS ici : partagés entre la page
  // Signaux (via contexte) et la modale de détail (analyse par titre).
  const predictions = usePredictions();
  const { bySymbol: geminiBySymbol } = useGeminiRecos();
  const { bySymbol: seasonBySymbol } = useSeasonality();
  const [screenerSort, setScreenerSort] = useState('score');
  
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartHorizon, setChartHorizon] = useState('ALL');
  // Historique du titre sélectionné — chargement/repli encapsulés dans le hook.
  const { stockHistory, loadingHistory } = useStockHistory(selectedStock);
  // Réinitialise l'horizon du graphe à chaque changement de titre.
  useEffect(() => { setChartHorizon('ALL'); }, [selectedStock]);
  // Visibilité des moyennes mobiles (l'utilisateur affiche celles qu'il veut).
  const [visibleMA, setVisibleMA] = useState({ 20: true, 50: true, 100: false });
  // Détection mobile : le graphique de cours devient défilable horizontalement.
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  
  // Portefeuille cloud + modale de vente — logique isolée dans le hook.
  const {
    savedPortfolio, setSavedPortfolio,
    manualSymbol, setManualSymbol, manualShares, setManualShares, manualPrice, setManualPrice,
    handleManualAdd,
    sellModal, setSellModal, sellQuantity, setSellQuantity, isSelling,
    openSellModal, confirmPartialSell,
  } = usePortfolio(user, marketData);

  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');


  // ==========================================
  // 3. FONCTIONS UTILITAIRES & ACTIONS
  // ==========================================
  // toggleTheme provient désormais du hook useTheme (bascule dark ⇄ solar).

  // ==========================================
  // 4. CALCULS MÉMORISÉS (useMemo)
  // ==========================================
  // MM50/MM100 calculées sur l'historique COMPLET (valeurs correctes en début de
  // fenêtre), puis on filtre par horizon.
  const historyWithMA = useMemo(() => withMovingAverages(stockHistory), [stockHistory]);
  const displayedHistory = useMemo(() => {
    if (chartHorizon === 'ALL') return historyWithMA;
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - parseInt(chartHorizon));
    return historyWithMA.filter(d => d.date >= cutoffDate.toISOString().split('T')[0]);
  }, [historyWithMA, chartHorizon]);
  // Analyse de tendance (moyennes mobiles) sur la dernière valeur connue.
  const maAnalysis = useMemo(() => movingAverageAnalysis(historyWithMA), [historyWithMA]);

  const globallyFilteredMarket = useMemo(() => marketData.filter(i =>
    (i.nom.toLowerCase().includes(searchQuery.toLowerCase()) || i.symbole.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (globalSector === 'All' || getSector(i.symbole) === globalSector)
  ), [marketData, searchQuery, globalSector]);

  // Simulateur / backtest — logique isolée dans le hook (opère sur le marché filtré).
  const {
    simCapital, setSimCapital, simStrategy, setSimStrategy,
    proposedPortfolio, loadingSim, backtestResult,
    runSimulationAndBacktest, confirmPurchase,
  } = useSimulator(globallyFilteredMarket, user, (rows) => setSavedPortfolio((prev) => [...prev, ...rows]));

  const marketStats = useMemo(() => {
    if (globallyFilteredMarket.length === 0) return null;
    
    const advances = globallyFilteredMarket.filter(m => m.variation > 0).length;
    const declines = globallyFilteredMarket.filter(m => m.variation < 0).length;
    const sortedMarket = [...globallyFilteredMarket].sort((a, b) => b.variation - a.variation);
    const top3 = sortedMarket.filter(m => m.variation > 0).slice(0, 3);
    const flop3 = sortedMarket.filter(m => m.variation < 0).reverse().slice(0, 3);

    return {
      sentiment: advances > declines ? 'Haussier' : (declines > advances ? 'Baissier' : 'Neutre'),
      advances, declines, 
      totalVol: globallyFilteredMarket.reduce((acc, curr) => acc + (curr.volume || 0), 0), 
      count: globallyFilteredMarket.length,
      top3, flop3
    };
  }, [globallyFilteredMarket]);

  // Moyenne des PER PAR SECTEUR (sur tout le marché, indépendamment des filtres).
  // On EXCLUT les PER non significatifs (<= 0 : pertes ou donnée absente) pour ne
  // pas fausser la moyenne. Résultat : { 'Finances': { avg, count }, ... }.
  const sectorPerStats = useMemo(() => {
    const acc = {};
    marketData.forEach((s) => {
      const per = Number(s.per);
      if (!per || per <= 0) return;
      const sec = getSector(s.symbole);
      if (!acc[sec]) acc[sec] = { sum: 0, count: 0 };
      acc[sec].sum += per;
      acc[sec].count += 1;
    });
    const out = {};
    Object.keys(acc).forEach((sec) => {
      out[sec] = { avg: acc[sec].sum / acc[sec].count, count: acc[sec].count };
    });
    return out;
  }, [marketData]);

  const screenerData = useMemo(() => {
      let result = globallyFilteredMarket.filter(i => {
        // Vérification Valorisation & RSI (protégé contre les valeurs nulles).
        const passVal = filterVal === 'All' || (i.statut_valorisation || '').includes(filterVal);
        const passRsi = filterRsi === 'All' || (i.statut_rsi || '').includes(filterRsi);
        
        // Vérification du Prix (Intervalle libre)
        const currentPrice = i.close || 0;
        const minPrice = filterMinPrice !== '' ? Number(filterMinPrice) : 0;
        const maxPrice = filterMaxPrice !== '' ? Number(filterMaxPrice) : Infinity;
        const passPrice = currentPrice >= minPrice && currentPrice <= maxPrice;

        // Filtre de LIQUIDITÉ (niveau issu de risk.json). 'All' = pas de filtre ;
        // si le risque n'est pas encore chargé pour un titre, on ne l'exclut pas.
        const liqLevel = riskBySymbol[i.symbole]?.liquidity?.level;
        const passLiq = filterLiquidity === 'All' || !liqLevel || liqLevel === filterLiquidity;

        return passVal && passRsi && passPrice && passLiq;
      });

      if (screenerSort === 'score') result.sort((a, b) => b.score_ia - a.score_ia);
      if (screenerSort === 'var_up') result.sort((a, b) => b.variation - a.variation);
      if (screenerSort === 'var_down') result.sort((a, b) => a.variation - b.variation);
      if (screenerSort === 'rsi_asc') result.sort((a, b) => (a.rsi_14 || 100) - (b.rsi_14 || 100)); 
      if (screenerSort === 'per_asc') result.sort((a, b) => ((a.per <= 0 ? 999 : a.per) - (b.per <= 0 ? 999 : b.per)));
      if (screenerSort === 'yield_desc') result.sort((a, b) => (b.rendement_dividende || 0) - (a.rendement_dividende || 0));
      
      return result;
    }, [globallyFilteredMarket, filterVal, filterRsi, filterMinPrice, filterMaxPrice, screenerSort, filterLiquidity, riskBySymbol]);

  const groupedPortfolio = useMemo(() => {
    if (!savedPortfolio || savedPortfolio.length === 0) return [];
    const map = {};
    savedPortfolio.forEach(pos => {
      if(!map[pos.sigle]) map[pos.sigle] = { sigle: pos.sigle, nom: pos.nom, totalShares: 0, totalInvested: 0 };
      map[pos.sigle].totalShares += pos.shares; map[pos.sigle].totalInvested += pos.total;
    });

    return Object.values(map).map(group => {
      const liveData = marketData.find(d => d.symbole === group.sigle);
      const currentPrice = liveData ? liveData.close : (group.totalInvested / group.totalShares);
      const cmp = group.totalInvested / group.totalShares;
      const currentValue = currentPrice * group.totalShares;
      const profit = currentValue - group.totalInvested;
      const profitPct = (profit / group.totalInvested) * 100;

      let conseil = { texte: 'Conserver', color: 'var(--text-muted)' };
      if (liveData) {
        if (liveData.score_ia >= 7) conseil = { texte: 'Renforcer', color: 'var(--accent-blue)' };
        else if (liveData.score_ia >= 5) conseil = { texte: 'Conserver', color: 'var(--up-color)' };
        else if (liveData.score_ia === 4) conseil = { texte: 'Surveiller', color: 'var(--warn-color)' };
        else conseil = { texte: 'Vendre', color: 'var(--down-color)' };
      }
      return { ...group, cmp, currentPrice, currentValue, profit, profitPct, conseil };
    }).sort((a, b) => b.currentValue - a.currentValue);
  }, [savedPortfolio, marketData]);

  const portfolioAnalytics = useMemo(() => {
    if (groupedPortfolio.length === 0 || marketData.length === 0) return null;
    let totalValue = 0, totalInvested = 0;
    const assetAllocation = {}, sectorAllocation = {};

    groupedPortfolio.forEach(pos => {
      totalValue += pos.currentValue; totalInvested += pos.totalInvested;
      if (!assetAllocation[pos.sigle]) assetAllocation[pos.sigle] = 0;
      assetAllocation[pos.sigle] += pos.currentValue;
      const sector = getSector(pos.sigle);
      if (!sectorAllocation[sector]) sectorAllocation[sector] = 0;
      sectorAllocation[sector] += pos.currentValue;
    });

    const assetsChart = Object.keys(assetAllocation).map(key => ({ name: key, value: assetAllocation[key] })).sort((a, b) => b.value - a.value);
    const sectorsChart = Object.keys(sectorAllocation).map(key => ({ name: key, value: sectorAllocation[key] })).sort((a, b) => b.value - a.value);
    const topSectorPct = sectorsChart.length > 0 ? (sectorsChart[0].value / totalValue) * 100 : 0;
    
    let riskStatus = { label: 'Saine', color: 'var(--up-color)', desc: 'Diversification optimale.' };
    if (topSectorPct > 60) riskStatus = { label: 'Danger', color: 'var(--down-color)', desc: `Concentration critique (${sectorsChart[0].name}).` };
    else if (topSectorPct > 40) riskStatus = { label: 'Alerte', color: 'var(--warn-color)', desc: `Forte exposition (${sectorsChart[0].name}).` };

    return { totalValue, totalInvested, assetsChart, sectorsChart, riskStatus };
  }, [groupedPortfolio, marketData]);

  // ==========================================
  // 5. RENDU
  // ==========================================
  // Plus de <style> injecté ici : toute la palette (Dark/Solar) vient de
  // styles/theme.css via l'attribut data-theme piloté par le hook useTheme.

  if (sessionLoading) return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-base)', color: 'var(--text-main)'}}>Securing connection...</div>;

  return (
    <BrowserRouter>
      {/* MODALES GLOBALES */}
      {showAuthModal && (
        <AuthModal 
          isSignUp={isSignUp} setIsSignUp={setIsSignUp}
          authEmail={authEmail} setAuthEmail={setAuthEmail}
          authPassword={authPassword} setAuthPassword={setAuthPassword}
          handleAuth={handleAuth} authLoading={authLoading}
          setShowAuthModal={setShowAuthModal}
        />
      )}

      {sellModal.isOpen && (
        <SellModal 
          sellModal={sellModal} setSellModal={setSellModal}
          sellQuantity={sellQuantity} setSellQuantity={setSellQuantity}
          confirmPartialSell={confirmPartialSell} isSelling={isSelling}
        />
      )}

      {/* MODALE DE GRAPHIQUE HISTORIQUE & STRATÉGIE IA */}
      {selectedStock && (
        <div className="stock-detail" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-base)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '30px 40px', overflowY: 'auto' }}>
          <div className="stock-detail-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div className="dash-kicker">{selectedStock.symbole} · {getSector(selectedStock.symbole)}</div>
              <h2 className="dash-title" style={{ fontSize: '1.9rem' }}>{selectedStock.nom}</h2>
              <div className="dash-num" style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 700, color: selectedStock.variation >= 0 ? 'var(--up-color)' : 'var(--down-color)' }}>
                {selectedStock.close?.toLocaleString('fr-FR')} F ({selectedStock.variation >= 0 ? '+' : ''}{selectedStock.variation}%)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Toggles moyennes mobiles : l'utilisateur affiche celles qu'il veut */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {MA_CONFIG.map(({ win, color, label }) => {
                  const on = visibleMA[win];
                  return (
                    <button
                      key={win}
                      type="button"
                      onClick={() => setVisibleMA((v) => ({ ...v, [win]: !v[win] }))}
                      title={`Afficher/masquer la moyenne mobile ${win} jours`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.85em',
                        border: `1px solid ${on ? color : 'var(--border-color)'}`,
                        background: on ? 'var(--bg-panel)' : 'transparent',
                        color: on ? 'var(--text-main)' : 'var(--text-muted)',
                        opacity: on ? 1 : 0.6,
                      }}
                    >
                      <span style={{ width: 14, height: 3, borderRadius: 2, background: color, opacity: on ? 1 : 0.4 }} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <select value={chartHorizon} onChange={(e) => setChartHorizon(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>
                <option value="30">Zoom 1 Mois</option>
                <option value="180">Zoom 6 Mois</option>
                <option value="365">Zoom 1 An</option>
                <option value="730">Zoom 2 Ans</option>
                <option value="1095">Zoom 3 Ans</option>
                <option value="1825">Zoom 5 Ans</option>
                <option value="ALL">Historique Complet</option>
              </select>
              <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setSelectedStock(null)}>Fermer ✕</button>
            </div>
          </div>

          {/* PLAN DE TRADING (ATR dynamique) — bande plate */}
          <section className="dash-block" style={{ marginTop: 4 }}>
            <div className="dash-block-head">
              <span>Plan de trading · ATR</span>
              <span className="dash-muted" style={{ fontWeight: 600 }}>
                Ratio gain/risque
                <strong className="dash-num" style={{ marginLeft: 6, color: ((selectedStock.exit - selectedStock.entry) / (selectedStock.entry - selectedStock.stopLoss)) >= 2 ? 'var(--up-color)' : 'var(--warn-color)' }}>
                  1 : {((selectedStock.exit - selectedStock.entry) / (selectedStock.entry - selectedStock.stopLoss)).toFixed(1)}
                </strong>
              </span>
            </div>
            <div className="pf-kpis" style={{ marginBottom: 0 }}>
              <div className="pf-kpi"><div className="pf-kpi-label">Entrée optimale</div><div className="pf-kpi-val dash-num" style={{ color: 'var(--up-color)' }}>{selectedStock.entry?.toLocaleString('fr-FR')} F</div><div className="pf-kpi-desc">Prix conseillé</div></div>
              <div className="pf-kpi"><div className="pf-kpi-label">Objectif</div><div className="pf-kpi-val dash-num" style={{ color: 'var(--accent-blue)' }}>{selectedStock.exit?.toLocaleString('fr-FR')} F</div><div className="pf-kpi-desc">Take profit</div></div>
              <div className="pf-kpi"><div className="pf-kpi-label">Stop-loss</div><div className="pf-kpi-val dash-num" style={{ color: 'var(--down-color)' }}>{selectedStock.stopLoss?.toLocaleString('fr-FR')} F</div><div className="pf-kpi-desc">−1.5× ATR · volatilité {selectedStock.volatility} F</div></div>
            </div>
          </section>

          {/* FONDAMENTAUX — bande plate */}
          <section className="dash-block">
            <div className="dash-block-head"><span>Fondamentaux</span></div>
            <div className="pf-kpis" style={{ marginBottom: 16 }}>
              <div className="pf-kpi"><div className="pf-kpi-label">Revenu passif</div><div className="pf-kpi-val dash-num">{selectedStock.rendement_dividende ? `${selectedStock.rendement_dividende}% /an` : 'N/A'}</div></div>
              <div className="pf-kpi"><div className="pf-kpi-label">Valorisation</div><div className="pf-kpi-val" style={{ color: getValColor(selectedStock.statut_valorisation), fontSize: '1.15rem' }}>{selectedStock.statut_valorisation || 'N/A'}</div></div>
              <div className="pf-kpi"><div className="pf-kpi-label">Momentum RSI</div><div className="pf-kpi-val" style={{ color: getRsiColor(selectedStock.statut_rsi), fontSize: '1.15rem' }}>{selectedStock.statut_rsi || 'Neutre'}</div></div>
            </div>
            {/* Comparaison du PER de la société à la moyenne de son secteur */}
            <PerSectorCompare
              per={selectedStock.per}
              sectorAvg={sectorPerStats[getSector(selectedStock.symbole)]?.avg}
              sectorName={getSector(selectedStock.symbole)}
              count={sectorPerStats[getSector(selectedStock.symbole)]?.count || 0}
            />
          </section>

          {/* TENDANCE PAR MOYENNES MOBILES — libellés plats */}
          {!loadingHistory && maAnalysis && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tendance MM</span>
              {[
                { lbl: 'MM20', v: maAnalysis.above20, hint: 'court terme' },
                { lbl: 'MM50', v: maAnalysis.above50, hint: 'moyen terme' },
                { lbl: 'MM100', v: maAnalysis.above100, hint: 'long terme' },
              ].map(({ lbl, v, hint }) => (
                <span key={lbl} title={hint} style={{ fontSize: '0.86rem', fontWeight: 700, color: v == null ? 'var(--text-muted)' : v ? 'var(--up-color)' : 'var(--down-color)' }}>
                  {lbl} {v == null ? '—' : v ? '▲' : '▼'}
                </span>
              ))}
              {maAnalysis.cross && (
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: maAnalysis.cross === 'golden' ? 'var(--up-color)' : 'var(--down-color)' }}>
                  · {maAnalysis.cross === 'golden' ? 'MM50 > MM100, fond haussier' : 'MM50 < MM100, fond baissier'}
                </span>
              )}
            </div>
          )}

          {/* ZONE DE GRAPHIQUES HISTORIQUES */}
          <div className="stock-chart-panel" style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', minHeight: '350px' }}>
            {loadingHistory ? <div className="skeleton" style={{ width: '100%', height: '100%', minHeight: '310px' }} /> : (
             <div style={{ width: '100%', height: '100%', overflowX: isMobile ? 'auto' : 'visible', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
              {isMobile && <div style={{ fontSize: '0.72em', color: 'var(--text-muted)', marginBottom: 4 }}>← faites glisser le graphique →</div>}
              <div style={{ height: isMobile ? 'calc(100% - 18px)' : '100%', minWidth: isMobile ? `${Math.min(3200, Math.max(680, displayedHistory.length * 6))}px` : '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayedHistory}>
                  <defs><linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} minTickGap={40} />
                  <YAxis yAxisId="left" stroke="var(--text-muted)" domain={['auto', 'auto']} tickFormatter={v => `${v.toLocaleString()} F`} width={75} />
                  <YAxis yAxisId="right" orientation="right" display="none" />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                  <Area yAxisId="left" type="monotone" dataKey="close" name="Cours de Clôture" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorClose)" />
                  {visibleMA[20] && <Line yAxisId="left" type="monotone" dataKey="sma_20" name="Moyenne 20J" stroke="var(--warn-color)" dot={false} strokeWidth={2} strokeDasharray="5 5" connectNulls />}
                  {visibleMA[50] && <Line yAxisId="left" type="monotone" dataKey="sma_50" name="Moyenne 50J" stroke="#8b5cf6" dot={false} strokeWidth={2} connectNulls />}
                  {visibleMA[100] && <Line yAxisId="left" type="monotone" dataKey="sma_100" name="Moyenne 100J" stroke="#14b8a6" dot={false} strokeWidth={2} connectNulls />}
                  <Bar yAxisId="right" dataKey="volume" name="Volume Échangé" fill="var(--text-muted)" opacity={0.15} />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
             </div>
            )}
          </div>

          {/* TRAJECTOIRES PRÉDITES (projection) — juste après le graphique du cours */}
          <ProjectionChart
            symbol={selectedStock.symbole}
            predictions={predictions.live}
            market={selectedStock}
            risk={riskBySymbol[selectedStock.symbole]}
            gemini={geminiBySymbol[selectedStock.symbole]}
          />

          {/* SIGNAUX PRÉDICTIFS détaillés (par horizon : directive, duel, justification…) */}
          <PredictionAnalysisPanel
            symbol={selectedStock.symbole}
            predictions={predictions.live}
            market={selectedStock}
            gemini={geminiBySymbol[selectedStock.symbole]}
            season={seasonBySymbol[selectedStock.symbole]}
          />

          {/* RECOMMANDATION TEXTE de Gemini (une seule fois par titre) */}
          <GeminiRecoPanel gemini={geminiBySymbol[selectedStock.symbole]} />

          {/* ACTUALITÉS de la société (Google News + résumé IA) */}
          <NewsPanel news={newsBySymbol[selectedStock.symbole]} />

          {/* ANALYSE DU RISQUE (liquidité, volatilité ajustée, VaR, distribution, bêta) */}
          <RiskPanel risk={riskBySymbol[selectedStock.symbole]} sector={getSector(selectedStock.symbole)} />
        </div>
      )}

      {/* SYSTÈME DE ROUTAGE DE L'APPLICATION */}
      <Routes>
        <Route path="/" element={<Landing user={user} toggleTheme={toggleTheme} isDarkMode={isDarkMode} setIsSignUp={setIsSignUp} setShowAuthModal={setShowAuthModal} />} />

        <Route element={
          <Layout 
            isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            globalSector={globalSector} setGlobalSector={setGlobalSector}
            resultCount={globallyFilteredMarket ? globallyFilteredMarket.length : 0}
            isDarkMode={isDarkMode} toggleTheme={toggleTheme}
            marketMeta={marketMeta}
            user={user} handleLogout={handleLogout}
            
            marketData={marketData} loadingMarket={loadingMarket} 
            marketStats={marketStats} setSelectedStock={setSelectedStock}
            
            screenerSort={screenerSort} setScreenerSort={setScreenerSort}
            filterVal={filterVal} setFilterVal={setFilterVal}
            filterRsi={filterRsi} setFilterRsi={setFilterRsi}
            filterLiquidity={filterLiquidity} setFilterLiquidity={setFilterLiquidity}
            riskBySymbol={riskBySymbol}
            predictions={predictions} geminiBySymbol={geminiBySymbol} seasonBySymbol={seasonBySymbol}
            screenerData={screenerData}
            sectorPerStats={sectorPerStats}
            
            simCapital={simCapital} setSimCapital={setSimCapital}
            simStrategy={simStrategy} setSimStrategy={setSimStrategy}
            runSimulationAndBacktest={runSimulationAndBacktest}
            loadingSim={loadingSim} backtestResult={backtestResult}
            proposedPortfolio={proposedPortfolio} confirmPurchase={confirmPurchase}
            
            handleManualAdd={handleManualAdd} manualSymbol={manualSymbol}
            setManualSymbol={setManualSymbol} manualShares={manualShares}
            setManualShares={setManualShares} manualPrice={manualPrice}
            setManualPrice={setManualPrice} groupedPortfolio={groupedPortfolio}
            portfolioAnalytics={portfolioAnalytics} openSellModal={openSellModal}

            filterMinPrice={filterMinPrice} setFilterMinPrice={setFilterMinPrice}
            filterMaxPrice={filterMaxPrice} setFilterMaxPrice={setFilterMaxPrice}
            screenerData={screenerData}
          />
        }>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          {/* Page ANALYSE unifiée : Fondamentaux (Screener) + Signaux IA sous une bascule */}
          <Route path="/analyse" element={user ? <Market /> : <Navigate to="/" />} />
          {/* Redirections des anciennes routes -> page unifiée */}
          <Route path="/screener" element={<Navigate to="/analyse" replace />} />
          <Route path="/predictions" element={<Navigate to="/analyse" replace />} />
          <Route path="/simulator" element={user ? <Simulator /> : <Navigate to="/" />} />
          <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}