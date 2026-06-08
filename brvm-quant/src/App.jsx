import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabase';
import { getSector } from './utils/brvmConfig';
import { getValColor, getRsiColor } from './utils/uiHelpers';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Composants de Layout et Modales
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import SellModal from './components/SellModal';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import Simulator from './pages/Simulator';
import Portfolio from './pages/Portfolio';

export default function App() {
  // ==========================================
  // 1. ÉTATS GLOBAUX
  // ==========================================
  const [sessionLoading, setSessionLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [marketData, setMarketData] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSector, setGlobalSector] = useState('All');
  const [filterVal, setFilterVal] = useState('All');
  const [filterRsi, setFilterRsi] = useState('All');
  const [screenerSort, setScreenerSort] = useState('score');
  
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartHorizon, setChartHorizon] = useState('ALL'); 

  const [simCapital, setSimCapital] = useState(1000000);
  const [simStrategy, setSimStrategy] = useState('value');
  const [proposedPortfolio, setProposedPortfolio] = useState([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);
  
  const [savedPortfolio, setSavedPortfolio] = useState([]);
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualShares, setManualShares] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  const [sellModal, setSellModal] = useState({ isOpen: false, sigle: '', maxShares: 0 });
  const [sellQuantity, setSellQuantity] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  // ==========================================
  // 2. EFFETS (Chargement Session & Data)
  // ==========================================
  useEffect(() => {
    const savedTheme = localStorage.getItem('brvm_theme');
    if (savedTheme === 'light') setIsDarkMode(false);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return; 
    
    async function fetchLatestMarket() {
      setLoadingMarket(true);
      try {
        const { data: dateData } = await supabase.from('full_stock_pro').select('date').order('date', { ascending: false }).limit(1);
        if (dateData[0]?.date) {
          const { data } = await supabase.from('full_stock_pro').select('*').eq('date', dateData[0].date);
          console.log("Données chargées dans App.jsx :", data);
          setMarketData(data || []);
        }
      } catch (err) { console.error(err); } 
      finally { setLoadingMarket(false); }
    }
    
    async function fetchCloudPortfolio() {
      const { data } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id);
      if (data) {
        setSavedPortfolio(data.map(item => ({ id: item.id, sigle: item.sigle, nom: item.nom, shares: Number(item.shares), buyPrice: Number(item.buy_price), total: Number(item.total) })));
      }
    }

    fetchLatestMarket();
    fetchCloudPortfolio();
  }, [user]);

  useEffect(() => {
    async function fetchStockHistory() {
      if (!selectedStock) return;
      setLoadingHistory(true);
      setChartHorizon('ALL'); 
      try {
        let allStockData = [], startRow = 0, keepFetching = true;
        while (keepFetching) {
          const { data } = await supabase.from('full_stock_pro').select('date, close, sma_20, volume').eq('symbole', selectedStock.symbole).order('date', { ascending: true }).range(startRow, startRow + 999);
          if (data && data.length > 0) { allStockData = [...allStockData, ...data]; startRow += 1000; if (data.length < 1000) keepFetching = false; } else keepFetching = false;
        }
        setStockHistory(allStockData);
      } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
    }
    fetchStockHistory();
  }, [selectedStock]);

  // ==========================================
  // 3. FONCTIONS UTILITAIRES & ACTIONS
  // ==========================================
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('brvm_theme', newTheme ? 'dark' : 'light');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    let error;
    if (isSignUp) {
      const res = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = res.error;
      if(!error) {
        alert("Inscription réussie !");
        setShowAuthModal(false);
      }
    } else {
      const res = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = res.error;
      if(!error) setShowAuthModal(false);
    }
    setAuthLoading(false);
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    const cleanSymbol = manualSymbol.trim().toUpperCase();
    if (!cleanSymbol || !manualShares || !manualPrice) return;
    
    const stockInfo = marketData.find(s => s.symbole === cleanSymbol);
    if (!stockInfo) {
      alert(`L'action "${cleanSymbol}" est introuvable. Veuillez vérifier le sigle (ex: SGBC).`);
      return;
    }

    const newEntry = { user_id: user.id, sigle: cleanSymbol, nom: stockInfo.nom, shares: Number(manualShares), buy_price: Number(manualPrice), total: Number(manualShares) * Number(manualPrice) };
    const { data, error } = await supabase.from('user_portfolios').insert([newEntry]).select();
    if (!error && data) {
      setSavedPortfolio([...savedPortfolio, { id: data[0].id, sigle: data[0].sigle, nom: data[0].nom, shares: data[0].shares, buyPrice: data[0].buy_price, total: data[0].total }]);
      setManualSymbol(''); setManualShares(''); setManualPrice('');
    }
  };

  const openSellModal = (sigle, maxShares) => {
    setSellModal({ isOpen: true, sigle, maxShares });
    setSellQuantity('');
  };

  const confirmPartialSell = async () => {
    const qtyToSell = Number(sellQuantity);
    if (qtyToSell <= 0 || qtyToSell > sellModal.maxShares) { alert("Quantité invalide."); return; }
    setIsSelling(true);
    let remainingToSell = qtyToSell;
    const lots = savedPortfolio.filter(p => p.sigle === sellModal.sigle).sort((a,b) => a.id.localeCompare(b.id));
    const toDelete = []; const toUpdate = [];

    for (let lot of lots) {
      if (remainingToSell <= 0) break;
      if (lot.shares <= remainingToSell) {
        toDelete.push(lot.id); remainingToSell -= lot.shares;
      } else {
        const newShares = lot.shares - remainingToSell;
        toUpdate.push({ id: lot.id, shares: newShares, buyPrice: lot.buyPrice });
        remainingToSell = 0;
      }
    }

    if (toDelete.length > 0) await supabase.from('user_portfolios').delete().in('id', toDelete);
    for (let update of toUpdate) {
      await supabase.from('user_portfolios').update({ shares: update.shares, total: update.shares * update.buyPrice }).eq('id', update.id);
    }

    const { data } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id);
    if (data) setSavedPortfolio(data.map(item => ({ id: item.id, sigle: item.sigle, nom: item.nom, shares: Number(item.shares), buyPrice: Number(item.buy_price), total: Number(item.total) })));
    setIsSelling(false); setSellModal({ isOpen: false, sigle: '', maxShares: 0 }); setSellQuantity('');
  };

  const runSimulationAndBacktest = async () => {
    setLoadingSim(true); setBacktestResult(null);
    let scoredStocks = [...globallyFilteredMarket].map(item => {
      let simScore = item.score_ia;
      if (simStrategy === 'value' && item.per && item.per < 12) simScore += 3;
      if (simStrategy === 'value' && item.rsi_14 < 35) simScore += 2;
      if (simStrategy === 'momentum' && item.variation > 1) simScore += 3;
      if (simStrategy === 'momentum' && item.rsi_14 > 50 && item.rsi_14 < 70) simScore += 2;
      if (simStrategy === 'rente' && (item.rendement_dividende || 0) > 7) simScore += 5; 
      return { ...item, simScore };
    }).sort((a, b) => b.simScore - a.simScore);

    const selection = scoredStocks.slice(0, 4); const symbols = selection.map(s => s.symbole); const weights = [0.40, 0.30, 0.20, 0.10]; 
    const dateStr = new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0];

    try {
      const { data: histData } = await supabase.from('full_stock_pro').select('symbole, close').in('symbole', symbols).gte('date', dateStr).order('date', { ascending: true }).limit(40);
      const pastPrices = {};
      symbols.forEach(sym => { const rows = histData?.filter(r => r.symbole === sym); if (rows && rows.length > 0) pastPrices[sym] = rows[0].close; });

      let initialBacktestValue = 0, finalCapitalValue = 0, totalDividendsCollected = 0; const newPort = [];
      selection.forEach((item, index) => {
        const allocAmount = simCapital * weights[index];
        const sharesToBuyNow = Math.floor(allocAmount / item.close);
        const pastPrice = pastPrices[item.symbole] || item.close; 
        const sharesBoughtPast = Math.floor(allocAmount / pastPrice);
        initialBacktestValue += (sharesBoughtPast * pastPrice);
        finalCapitalValue += (sharesBoughtPast * item.close);
        totalDividendsCollected += ((sharesBoughtPast * pastPrice) * ((item.rendement_dividende || 0) / 100) * 3);
        newPort.push({ sigle: item.symbole, nom: item.nom, shares: sharesToBuyNow, buyPrice: item.close, total: sharesToBuyNow * item.close, pastPrice: pastPrice, yield: item.rendement_dividende || 0 });
      });
      setProposedPortfolio(newPort);
      setBacktestResult({ initial: initialBacktestValue, finalCapital: finalCapitalValue, dividends: totalDividendsCollected, totalReturnVal: finalCapitalValue + totalDividendsCollected, perfTotal: initialBacktestValue > 0 ? (((finalCapitalValue + totalDividendsCollected) - initialBacktestValue) / initialBacktestValue) * 100 : 0 });
    } catch (err) { console.error(err); } setLoadingSim(false);
  };

  const confirmPurchase = async () => {
    const cloudEntries = proposedPortfolio.map(p => ({ user_id: user.id, sigle: p.sigle, nom: p.nom, shares: p.shares, buy_price: p.buyPrice, total: p.total }));
    const { data, error } = await supabase.from('user_portfolios').insert(cloudEntries).select();
    if (!error && data) {
      setSavedPortfolio([...savedPortfolio, ...data.map(item => ({ id: item.id, sigle: item.sigle, nom: item.nom, shares: Number(item.shares), buyPrice: Number(item.buy_price), total: Number(item.total) }))]);
      setProposedPortfolio([]); setBacktestResult(null);
    }
  };

  // ==========================================
  // 4. CALCULS MÉMORISÉS (useMemo)
  // ==========================================
  const displayedHistory = useMemo(() => {
    if (chartHorizon === 'ALL') return stockHistory;
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - parseInt(chartHorizon));
    return stockHistory.filter(d => d.date >= cutoffDate.toISOString().split('T')[0]);
  }, [stockHistory, chartHorizon]);

  const globallyFilteredMarket = useMemo(() => marketData.filter(i => 
    (i.nom.toLowerCase().includes(searchQuery.toLowerCase()) || i.symbole.toLowerCase().includes(searchQuery.toLowerCase())) && 
    (globalSector === 'All' || getSector(i.symbole) === globalSector)
  ), [marketData, searchQuery, globalSector]);

const marketStats = useMemo(() => {
    if (globallyFilteredMarket.length === 0) return null;
    
    const advances = globallyFilteredMarket.filter(m => m.variation > 0).length;
    const declines = globallyFilteredMarket.filter(m => m.variation < 0).length;
    
    // 1. On trie toutes les actions de la plus forte hausse à la plus forte baisse
    const sortedMarket = [...globallyFilteredMarket].sort((a, b) => b.variation - a.variation);

    // 2. On filtre strictement les positives pour le TOP
    const top3 = sortedMarket.filter(m => m.variation > 0).slice(0, 3);
    
    // 3. On filtre strictement les négatives pour le FLOP (et on inverse pour avoir la pire en premier)
    const flop3 = sortedMarket.filter(m => m.variation < 0).reverse().slice(0, 3);

    return {
      sentiment: advances > declines ? 'Haussier' : (declines > advances ? 'Baissier' : 'Neutre'),
      advances, 
      declines, 
      totalVol: globallyFilteredMarket.reduce((acc, curr) => acc + (curr.volume || 0), 0), 
      count: globallyFilteredMarket.length,
      top3, 
      flop3
    };
  }, [globallyFilteredMarket]);

  const screenerData = useMemo(() => {
    let result = globallyFilteredMarket.filter(i => (filterVal === 'All' || i.statut_valorisation.includes(filterVal)) && (filterRsi === 'All' || i.statut_rsi.includes(filterRsi)));
    if (screenerSort === 'score') result.sort((a, b) => b.score_ia - a.score_ia);
    if (screenerSort === 'var_up') result.sort((a, b) => b.variation - a.variation);
    if (screenerSort === 'var_down') result.sort((a, b) => a.variation - b.variation);
    if (screenerSort === 'rsi_asc') result.sort((a, b) => (a.rsi_14 || 100) - (b.rsi_14 || 100)); 
    if (screenerSort === 'per_asc') result.sort((a, b) => ((a.per <= 0 ? 999 : a.per) - (b.per <= 0 ? 999 : b.per)));
    if (screenerSort === 'yield_desc') result.sort((a, b) => (b.rendement_dividende || 0) - (a.rendement_dividende || 0));
    return result;
  }, [globallyFilteredMarket, filterVal, filterRsi, screenerSort]);

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

      let conseil = { texte: '➖ Conserver', color: 'var(--text-muted)' };
      if (liveData) {
        if (liveData.score_ia >= 7) conseil = { texte: '🔥 Renforcer', color: 'var(--accent-blue)' };
        else if (liveData.score_ia >= 5) conseil = { texte: '✅ Conserver', color: 'var(--up-color)' };
        else if (liveData.score_ia === 4) conseil = { texte: '⚠️ Surveiller', color: 'var(--warn-color)' };
        else conseil = { texte: '🚨 Vendre', color: 'var(--down-color)' };
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
  // 5. CSS & RENDU
  // ==========================================
  const themeCSS = isDarkMode ? `
    :root {
      --bg-base: #0b0e14; --bg-panel: #151a23; --text-main: #ffffff; --text-muted: #8b98a5;
      --border-color: #2a2e39; --up-color: #089981; --down-color: #f23645;
      --warn-color: #ffb300; --accent-blue: #2962ff;
    }
  ` : `
    :root {
      --bg-base: #f1f5f9; --bg-panel: #ffffff; --text-main: #0f172a; --text-muted: #64748b;
      --border-color: #e2e8f0; --up-color: #10b981; --down-color: #ef4444;
      --warn-color: #f59e0b; --accent-blue: #3b82f6;
    }
  `;

  if (sessionLoading) return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0b0e14', color: 'white'}}>Securing connection...</div>;

  return (
    <BrowserRouter>
      <style>{themeCSS}</style>

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

      {/* MODALE DE GRAPHIQUE HISTORIQUE */}
      {selectedStock && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-base)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '30px 40px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.5em', color: 'var(--text-main)' }}>{selectedStock.nom}</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.2em', marginRight: '15px' }}>{selectedStock.symbole} • {getSector(selectedStock.symbole)}</span>
              <span style={{ color: selectedStock.variation >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontSize: '1.2em', fontWeight: 'bold' }}>{selectedStock.close?.toLocaleString()} F ({selectedStock.variation >= 0 ? '+' : ''}{selectedStock.variation}%)</span>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <select value={chartHorizon} onChange={(e) => setChartHorizon(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>
                <option value="30">Zoom 1 Mois</option>
                <option value="180">Zoom 6 Mois</option>
                <option value="365">Zoom 1 An</option>
                <option value="ALL">Historique Complet</option>
              </select>
              <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => { setSelectedStock(null); setStockHistory([]); }}>Fermer ✕</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid var(--accent-blue)` }}>
              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' }}>Revenu Passif</div>
              <div style={{ fontSize: '1.3em', color: 'var(--text-main)', fontWeight: '900' }}>{selectedStock.rendement_dividende ? `${selectedStock.rendement_dividende}% / an` : 'N/A'}</div>
            </div>
            <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${getValColor(selectedStock.statut_valorisation)}` }}>
              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' }}>Valorisation</div>
              <div style={{ fontSize: '1.3em', color: getValColor(selectedStock.statut_valorisation), fontWeight: '900' }}>{selectedStock.statut_valorisation || 'N/A'}</div>
            </div>
            <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${getRsiColor(selectedStock.statut_rsi)}` }}>
              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' }}>Momentum RSI</div>
              <div style={{ fontSize: '1.3em', color: getRsiColor(selectedStock.statut_rsi), fontWeight: '900' }}>{selectedStock.statut_rsi || 'Neutre'}</div>
            </div>
          </div>

          <div style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', minHeight: '350px' }}>
            {loadingHistory ? <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)' }}>Chargement...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayedHistory}>
                  <defs><linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} minTickGap={40} />
                  <YAxis yAxisId="left" stroke="var(--text-muted)" domain={['auto', 'auto']} tickFormatter={v => `${v.toLocaleString()} F`} width={75} />
                  <YAxis yAxisId="right" orientation="right" display="none" />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                  <Area yAxisId="left" type="monotone" dataKey="close" name="Cours de Clôture" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorClose)" />
                  <Line yAxisId="left" type="monotone" dataKey="sma_20" name="Moyenne 20J" stroke="var(--warn-color)" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                  <Bar yAxisId="right" dataKey="volume" name="Volume Échangé" fill="var(--text-muted)" opacity={0.15} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Landing user={user} toggleTheme={toggleTheme} isDarkMode={isDarkMode} setIsSignUp={setIsSignUp} setShowAuthModal={setShowAuthModal} />} />
        
        <Route element={
          <Layout 
            isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            globalSector={globalSector} setGlobalSector={setGlobalSector}
            resultCount={globallyFilteredMarket ? globallyFilteredMarket.length : 0}
            isDarkMode={isDarkMode} toggleTheme={toggleTheme}
            user={user} handleLogout={handleLogout}
            
            marketData={marketData} loadingMarket={loadingMarket} 
            marketStats={marketStats} setSelectedStock={setSelectedStock}
            
            screenerSort={screenerSort} setScreenerSort={setScreenerSort}
            filterVal={filterVal} setFilterVal={setFilterVal}
            filterRsi={filterRsi} setFilterRsi={setFilterRsi}
            screenerData={screenerData}
            
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
          />
        }>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/screener" element={user ? <Screener /> : <Navigate to="/" />} />
          <Route path="/simulator" element={user ? <Simulator /> : <Navigate to="/" />} />
          <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}