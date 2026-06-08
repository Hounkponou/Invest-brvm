import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// CONFIGURATION SUPABASE
const supabase = createClient(
  "https://pskfhrxqokavxaogqsud.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2Zocnhxb2thdnhhb2dxc3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwNzE0NiwiZXhwIjoyMDk0MDgzMTQ2fQ.1cFFQFvEfeEquOh0Wc4yfGM_f5xuHi0aWqL6-ZnUpGQ"
);

const BRVM_SECTORS = {
  'BICC': 'Finances', 'BOAC': 'Finances', 'BOAN': 'Finances', 'BOABF': 'Finances',
  'BOAM': 'Finances', 'BICB': 'Finances', 'BOAB': 'Finances', 'BOAS': 'Finances',
  'ETIT': 'Finances', 'SGBC': 'Finances', 'SIBC': 'Finances', 'NSBC': 'Finances',
  'CORI': 'Finances', 'SAFC': 'Finances', 'ORGT': 'Finances',

  'BNBC': 'Distribution', 'ABJC': 'Distribution', 'CFAC': 'Distribution',
  'PRSC': 'Distribution', 'SHEC': 'Distribution', 'TTLC': 'Distribution', 'TTRC': 'Distribution',

  'CABC': 'Industrie', 'NTLC': 'Industrie', 'STBC': 'Industrie', 'SMBC': 'Industrie',
  'SLBC': 'Industrie', 'UNXC': 'Industrie', 'CILC': 'Industrie',

  'SOGC': 'Agriculture', 'SPHC': 'Agriculture', 'PALC': 'Agriculture', 'SICC': 'Agriculture',

  'CIEC': 'Services Publics', 'ONEC': 'Services Publics', 'SDCC': 'Services Publics',

  'SDSC':'Transport',
  
  'ORAC':'Telecommunications','ONTBF':'Telecommunications','SNTS': 'Telecommunications',
};

const getSector = (symbole) => BRVM_SECTORS[symbole] || 'Autres';
const UNIQUE_SECTORS = [...new Set(Object.values(BRVM_SECTORS))].sort();
const PIE_COLORS = ['#089981', '#FFB300', '#2962FF', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];

export default function App() {
  // ==========================================
  // ÉTATS GLOBAUX
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

  const [currentView, setCurrentView] = useState('landing');
  
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

  // États pour la vente partielle
  const [sellModal, setSellModal] = useState({ isOpen: false, sigle: '', maxShares: 0 });
  const [sellQuantity, setSellQuantity] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  // ==========================================
  // 1. GESTION DE SESSION ET THEME
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

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('brvm_theme', newTheme ? 'dark' : 'light');
  };

  // ==========================================
  // 2. CHARGEMENT DES DONNÉES
  // ==========================================
  useEffect(() => {
    if (!user) return; 
    
    async function fetchLatestMarket() {
      setLoadingMarket(true);
      try {
        const { data: dateData } = await supabase.from('full_stock_pro').select('date').order('date', { ascending: false }).limit(1);
        if (dateData[0]?.date) {
          const { data } = await supabase.from('full_stock_pro').select('*').eq('date', dateData[0].date);
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

  const displayedHistory = useMemo(() => {
    if (chartHorizon === 'ALL') return stockHistory;
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - parseInt(chartHorizon));
    return stockHistory.filter(d => d.date >= cutoffDate.toISOString().split('T')[0]);
  }, [stockHistory, chartHorizon]);

  // ==========================================
  // 3. AUTHENTIFICATION FONCTIONS
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    let error;
    if (isSignUp) {
      const res = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = res.error;
      if(!error) {
        alert("Inscription réussie !");
        setCurrentView('home');
      }
    } else {
      const res = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = res.error;
      if(!error) setCurrentView('home');
    }
    setAuthLoading(false);
    if (error) alert(error.message);
    else setShowAuthModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('landing');
  };

  const navigateTo = (view) => {
    if (user) {
      setCurrentView(view);
    } else {
      setIsSignUp(true);
      setShowAuthModal(true);
    }
  };

  // ==========================================
  // 4. LOGIQUE MÉTIER & PORTFOLIO IA
  // ==========================================
  const globallyFilteredMarket = useMemo(() => marketData.filter(i => (i.nom.toLowerCase().includes(searchQuery.toLowerCase()) || i.symbole.toLowerCase().includes(searchQuery.toLowerCase())) && (globalSector === 'All' || getSector(i.symbole) === globalSector)), [marketData, searchQuery, globalSector]);

  const marketStats = useMemo(() => {
    if (globallyFilteredMarket.length === 0) return null;
    const advances = globallyFilteredMarket.filter(m => m.variation > 0).length;
    const declines = globallyFilteredMarket.filter(m => m.variation < 0).length;
    return {
      sentiment: advances > declines ? 'Haussier' : (declines > advances ? 'Baissier' : 'Neutre'),
      advances, declines, totalVol: globallyFilteredMarket.reduce((acc, curr) => acc + (curr.volume || 0), 0), count: globallyFilteredMarket.length,
      top3: [...globallyFilteredMarket].sort((a, b) => b.variation - a.variation).slice(0, 3), flop3: [...globallyFilteredMarket].sort((a, b) => b.variation - a.variation).slice(-3).reverse()
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

  // Regroupement du portefeuille pour affichage
  const groupedPortfolio = useMemo(() => {
    if (savedPortfolio.length === 0) return [];
    const map = {};
    savedPortfolio.forEach(pos => {
      if(!map[pos.sigle]) map[pos.sigle] = { sigle: pos.sigle, nom: pos.nom, totalShares: 0, totalInvested: 0 };
      map[pos.sigle].totalShares += pos.shares;
      map[pos.sigle].totalInvested += pos.total;
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
  // ACTIONS PORTEFEUILLE (AJOUT RECHERCHE & VENTE FIFO)
  // ==========================================
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
    if (qtyToSell <= 0 || qtyToSell > sellModal.maxShares) {
      alert("Quantité invalide.");
      return;
    }
    
    setIsSelling(true);
    let remainingToSell = qtyToSell;
    
    // On récupère tous les achats (lots) de cette action, triés par ID (chronologique)
    const lots = savedPortfolio.filter(p => p.sigle === sellModal.sigle).sort((a,b) => a.id.localeCompare(b.id));
    
    const toDelete = [];
    const toUpdate = [];

    // Logique FIFO (First In, First Out)
    for (let lot of lots) {
      if (remainingToSell <= 0) break;
      
      if (lot.shares <= remainingToSell) {
        toDelete.push(lot.id);
        remainingToSell -= lot.shares;
      } else {
        const newShares = lot.shares - remainingToSell;
        toUpdate.push({ id: lot.id, shares: newShares, buyPrice: lot.buyPrice });
        remainingToSell = 0;
      }
    }

    // Exécution dans la base de données
    if (toDelete.length > 0) await supabase.from('user_portfolios').delete().in('id', toDelete);
    
    for (let update of toUpdate) {
      await supabase.from('user_portfolios').update({ shares: update.shares, total: update.shares * update.buyPrice }).eq('id', update.id);
    }

    // Re-téléchargement propre du portfolio pour synchroniser l'affichage
    const { data } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id);
    if (data) {
      setSavedPortfolio(data.map(item => ({ id: item.id, sigle: item.sigle, nom: item.nom, shares: Number(item.shares), buyPrice: Number(item.buy_price), total: Number(item.total) })));
    }

    setIsSelling(false);
    setSellModal({ isOpen: false, sigle: '', maxShares: 0 });
    setSellQuantity('');
  };

  // ==========================================
  // SIMULATEUR
  // ==========================================
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
      setProposedPortfolio([]); setBacktestResult(null); setCurrentView('portfolio');
    }
  };

  // ==========================================
  // UI HELPERS & COMPOSANTS
  // ==========================================
  const getValColor = (status) => { if (!status) return 'var(--text-muted)'; if (status.includes('Forte Sous')) return 'var(--up-color)'; if (status.includes('Sous-éval')) return '#48bb78'; if (status.includes('Juste')) return 'var(--warn-color)'; if (status.includes('Suréval')) return 'var(--down-color)'; return 'var(--text-muted)'; };
  const getRsiColor = (status) => { if (!status) return 'var(--text-muted)'; if (status.includes('Survendu')) return 'var(--up-color)'; if (status.includes('Suracheté')) return 'var(--down-color)'; return 'var(--text-muted)'; };

  const StockCard = ({ item }) => {
    const isUp = item.variation >= 0;
    return (
      <div className="stock-card" onClick={() => setSelectedStock(item)} style={{cursor: 'pointer', backgroundColor: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'transform 0.2s'}}>
        <div className="card-header" style={{display: 'flex', justifyContent: 'space-between'}}>
          <div><span className="stock-symbol" style={{color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.2em', display: 'block'}}>{item.symbole}</span><span className="stock-name" style={{color: 'var(--text-muted)', fontSize: '0.85em'}}>{item.nom}</span></div>
          <div style={{ textAlign: 'right' }}><div className="stock-price" style={{color: 'var(--text-main)', fontWeight: 'bold'}}>{item.close?.toLocaleString()} F</div><div style={{color: isUp ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold'}}>{isUp ? '+' : ''}{item.variation}%</div></div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-color)'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <span style={{fontSize: '0.8em', color: 'var(--text-muted)'}}>VALO: <strong style={{color: getValColor(item.statut_valorisation)}}>{item.statut_valorisation || 'N/A'}</strong></span>
            <span style={{fontSize: '0.8em', color: 'var(--text-muted)'}}>Rendement: <strong style={{color: (item.rendement_dividende||0) > 7 ? 'var(--accent-blue)' : 'var(--text-main)'}}>{item.rendement_dividende ? `${item.rendement_dividende}%` : 'N/A'}</strong></span>
          </div>
          <div style={{textAlign: 'center', background: 'var(--bg-base)', padding: '10px', borderRadius: '8px', border: `1px solid ${item.score_ia >= 7 ? 'var(--up-color)' : item.score_ia <= 4 ? 'var(--down-color)' : 'var(--warn-color)'}`}}>
            <div style={{fontSize: '0.7em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom:'2px'}}>Score IA</div>
            <div style={{fontSize: '1.5em', fontWeight: '900', color: 'var(--text-main)'}}>{item.score_ia}/10</div>
          </div>
        </div>
      </div>
    );
  };

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

  // ==========================================
  // VUE 1 : LANDING PAGE
  // ==========================================
  if (currentView === 'landing') {
    return (
      <div style={{height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column'}}>
        <style>{themeCSS}</style>
        <style>{`
          .landing-btn { padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 1.1em; transition: 0.2s; }
          .landing-btn-primary { background-color: var(--accent-blue); color: white; }
          .landing-btn-primary:hover { opacity: 0.9; }
          .landing-btn-secondary { background-color: transparent; border: 1px solid var(--text-muted); color: var(--text-muted); }
          .landing-btn-secondary:hover { border-color: var(--text-main); color: var(--text-main); }
          .feature-card { background: var(--bg-panel); padding: 40px 30px; border-radius: 12px; border: 1px solid var(--border-color); flex: 1; min-width: 280px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, border-color 0.2s; display: flex; flex-direction: column; justify-content: space-between; }
          .feature-card:hover { transform: translateY(-5px); border-color: var(--accent-blue); }
        `}</style>
        
        <header style={{padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 10}}>
          <div onClick={() => setCurrentView('landing')} style={{cursor: 'pointer', fontSize: '1.5em', fontWeight: '900', letterSpacing: '2px'}}>INVEST <span style={{color: 'var(--accent-blue)'}}>PRO</span></div>
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <button onClick={toggleTheme} style={{background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '1.2em', cursor: 'pointer', padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <button className="landing-btn landing-btn-primary" onClick={() => setCurrentView('home')} style={{padding: '8px 16px', fontSize: '0.9em'}}>Dashboard</button>
            ) : (
              <button className="landing-btn landing-btn-secondary" onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} style={{padding: '8px 16px', fontSize: '0.9em'}}>Log In</button>
            )}
          </div>
        </header>

        <main style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center'}}>
          <h1 style={{fontSize: '3.5em', margin: '0 0 20px 0', maxWidth: '800px', lineHeight: '1.2'}}>L'investissement quantitatif arrive sur la BRVM.</h1>
          <p style={{fontSize: '1.2em', color: 'var(--text-muted)', marginBottom: '50px', maxWidth: '600px', lineHeight: '1.6'}}>
            Analysez le marché en temps réel grâce à l'intelligence artificielle, testez vos stratégies sur 3 ans et gérez votre portefeuille dans un cloud sécurisé.
          </p>
          
          <div style={{display: 'flex', gap: '20px', marginBottom: '60px'}}>
            {user ? (
               <button className="landing-btn landing-btn-primary" onClick={() => setCurrentView('home')} style={{padding: '15px 40px', fontSize: '1.2em'}}>Accéder à l'application 🚀</button>
            ) : (
               <button className="landing-btn landing-btn-primary" onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} style={{padding: '15px 40px', fontSize: '1.2em'}}>Créer un compte gratuit</button>
            )}
          </div>

          <div style={{display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1100px', width: '100%'}}>
            <div className="feature-card" onClick={() => navigateTo('screener')}>
              <div>
                <div style={{fontSize: '3em', marginBottom: '20px'}}>🤖</div>
                <h3 style={{margin: '0 0 15px 0', fontSize: '1.3em'}}>Scoring IA</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0}}>Chaque action est analysée techniquement et fondamentalement pour vous donner une note sur 10 instantanée.</p>
              </div>
              <div style={{marginTop: '25px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '1.1em'}}>Open Stock Screener ➔</div>
            </div>
            <div className="feature-card" onClick={() => navigateTo('simulator')}>
              <div>
                <div style={{fontSize: '3em', marginBottom: '20px'}}>⏱️</div>
                <h3 style={{margin: '0 0 15px 0', fontSize: '1.3em'}}>Backtesting</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0}}>Notre machine à remonter le temps prouve la rentabilité de vos stratégies sur les 3 dernières années.</p>
              </div>
              <div style={{marginTop: '25px', color: '#9f7aea', fontWeight: 'bold', fontSize: '1.1em'}}>Open Backtest Lab ➔</div>
            </div>
            <div className="feature-card" onClick={() => navigateTo('portfolio')}>
              <div>
                <div style={{fontSize: '3em', marginBottom: '20px'}}>☁️</div>
                <h3 style={{margin: '0 0 15px 0', fontSize: '1.3em'}}>Gestion Cloud</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0}}>Votre portefeuille est sauvegardé en toute sécurité. Retrouvez votre suivi de risque et d'allocation partout.</p>
              </div>
              <div style={{marginTop: '25px', color: 'var(--up-color)', fontWeight: 'bold', fontSize: '1.1em'}}>Open Portfolio Cloud ➔</div>
            </div>
          </div>
        </main>

        <footer style={{padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', marginTop: 'auto'}}>
          © 2026 Invest Pro. Tous droits réservés.
        </footer>

        {showAuthModal && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div style={{background: 'var(--bg-panel)', padding: '40px', borderRadius: '12px', width: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}}>
              <h2 style={{color: 'var(--text-main)', marginTop: 0, textAlign: 'center'}}>{isSignUp ? 'Créer un compte' : 'Connexion'}</h2>
              <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                  <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Email</label>
                  <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required style={{padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                  <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Mot de passe</label>
                  <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required style={{padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} />
                </div>
                <button type="submit" className="landing-btn landing-btn-primary" disabled={authLoading} style={{marginTop: '10px'}}>{authLoading ? 'Chargement...' : (isSignUp ? "S'inscrire" : "Se Connecter")}</button>
              </form>
              <div style={{textAlign: 'center', marginTop: '20px'}}>
                <span style={{color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9em', textDecoration: 'underline'}} onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? 'Déjà un compte ? Connectez-vous' : "Pas de compte ? S'inscrire"}
                </span>
              </div>
              <button onClick={() => setShowAuthModal(false)} style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold'}}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VUE 2 : L'APPLICATION PRINCIPALE 
  // ==========================================
  return (
    <div className="app-container" style={{display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden'}}>
      <style>{themeCSS}</style>
      
      {/* SIDEBAR */}
      <nav className="sidebar" style={{display: isSidebarOpen ? 'flex' : 'none', flexDirection: 'column', width: '250px', backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-color)', padding: '20px', zIndex: 50}}>
        <div>
          <div className="sidebar-brand" onClick={() => setCurrentView('landing')} style={{cursor: 'pointer', fontSize: '1.5em', fontWeight: '900', marginBottom: '30px', color: 'var(--text-main)'}}>INVEST <span style={{color: 'var(--accent-blue)'}}>PRO</span></div>
          
          <button className="nav-btn" onClick={() => setCurrentView('landing')} style={{width: '100%', textAlign: 'left', padding: '12px', marginBottom: '20px', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 'bold'}}>🏠 Landing Page</button>
          
          <button className={`nav-btn ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')} style={{width: '100%', textAlign: 'left', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: currentView === 'home' ? 'var(--accent-blue)' : 'transparent', color: currentView === 'home' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>📊 Dashboard</button>
          <button className={`nav-btn ${currentView === 'screener' ? 'active' : ''}`} onClick={() => setCurrentView('screener')} style={{width: '100%', textAlign: 'left', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: currentView === 'screener' ? 'var(--accent-blue)' : 'transparent', color: currentView === 'screener' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>⚡ Stock Screener</button>
          <button className={`nav-btn ${currentView === 'simulator' ? 'active' : ''}`} onClick={() => setCurrentView('simulator')} style={{width: '100%', textAlign: 'left', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: currentView === 'simulator' ? '#9f7aea' : 'transparent', color: currentView === 'simulator' ? 'white' : '#9f7aea', border: '1px solid #9f7aea', cursor: 'pointer', fontWeight: 'bold'}}>🧪 Backtest Lab</button>
          <button className={`nav-btn ${currentView === 'portfolio' ? 'active' : ''}`} onClick={() => setCurrentView('portfolio')} style={{width: '100%', textAlign: 'left', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: currentView === 'portfolio' ? 'var(--accent-blue)' : 'transparent', color: currentView === 'portfolio' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>💼 Portfolio Cloud</button>
        </div>
        
        <div style={{marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center'}}>
          <div style={{color: 'var(--text-muted)', fontSize: '0.8em', marginBottom: '10px', wordBreak: 'break-all'}}>{user?.email}</div>
          <button onClick={handleLogout} style={{background: 'transparent', border: '1px solid var(--down-color)', color: 'var(--down-color)', padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: 'bold'}}>Log Out</button>
        </div>
      </nav>

      <div className="main-content" style={{flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto'}}>
        
        {/* TOP HEADER */}
        <header className="top-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.5em', cursor: 'pointer'}}>☰</button>
            <input type="text" placeholder="Rechercher (Ex: SGBC)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', width: '250px'}} />
            <select value={globalSector} onChange={(e) => setGlobalSector(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold'}}>
              <option value="All">🌍 Tous les secteurs</option>
              {UNIQUE_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            {(searchQuery || globalSector !== 'All') && <div style={{color: 'var(--accent-blue)', fontSize: '0.9em', fontWeight: 'bold'}}>{globallyFilteredMarket.length} résultats</div>}
            <button onClick={toggleTheme} style={{background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '1.2em', cursor: 'pointer', padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {loadingMarket && <div style={{padding: '50px', textAlign: 'center', color: 'var(--text-muted)'}}>Synchronisation avec la BRVM en cours...</div>}

        <div className="view-area" style={{padding: '30px', flex: 1}}>
          
          {/* DASHBOARD VIEW */}
          {!loadingMarket && currentView === 'home' && (
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px'}}>
                <h2 style={{color: 'var(--text-main)', margin: 0}}>Résumé du Marché {globalSector !== 'All' ? `(${globalSector})` : 'Global'}</h2>
              </div>
              {marketStats ? (
                <>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                    <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: `4px solid ${marketStats.sentiment === 'Haussier' ? 'var(--up-color)' : (marketStats.sentiment === 'Baissier' ? 'var(--down-color)' : 'var(--text-muted)')}`}}>
                      <div style={{color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase'}}>Sentiment</div>
                      <div style={{fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0'}}>{marketStats.sentiment}</div>
                      <div style={{color: 'var(--text-muted)', fontSize: '0.85em'}}><span style={{color: 'var(--up-color)'}}>{marketStats.advances} Hausses</span> vs <span style={{color: 'var(--down-color)'}}>{marketStats.declines} Baisses</span></div>
                    </div>
                    <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: '4px solid var(--accent-blue)'}}><div style={{color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase'}}>Volume Échangé</div><div style={{fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0'}}>{marketStats.totalVol.toLocaleString()}</div></div>
                    <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #9f7aea'}}><div style={{color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase'}}>Actions Analysées</div><div style={{fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0'}}>{marketStats.count}</div></div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', minWidth: '0'}}>
                    <div><h3 style={{color: 'var(--up-color)', margin: '0 0 15px 0'}}>🚀 Top {marketStats.top3.length}</h3><div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>{marketStats.top3.map(item => <StockCard key={item.symbole} item={item} />)}</div></div>
                    <div><h3 style={{color: 'var(--down-color)', margin: '0 0 15px 0'}}>⚠️ Flop {marketStats.flop3.length}</h3><div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>{marketStats.flop3.map(item => <StockCard key={item.symbole} item={item} />)}</div></div>
                  </div>
                </>
              ) : (<div style={{color: 'var(--text-muted)'}}>Aucune action trouvée.</div>)}
            </div>
          )}

          {/* STOCK SCREENER VIEW */}
          {!loadingMarket && currentView === 'screener' && (
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px'}}>
                <div><h2 style={{color: 'var(--text-main)', margin: 0}}>Stock Screener</h2></div>
                <select style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', fontWeight:'bold'}} value={screenerSort} onChange={(e) => setScreenerSort(e.target.value)}><option value="score">⭐ Score IA</option><option value="yield_desc">💰 Rendement</option><option value="per_asc">🟢 PER le plus bas</option><option value="rsi_asc">📉 RSI le plus bas</option></select>
              </div>
              <div style={{display: 'flex', gap: '20px', marginBottom: '30px', background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}><label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Valorisation</label><select style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} value={filterVal} onChange={e => setFilterVal(e.target.value)}><option value="All">Tout</option><option value="Sous-éval">Sous-évaluées</option><option value="Suréval">Surévaluées</option></select></div>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}><label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Momentum</label><select style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} value={filterRsi} onChange={e => setFilterRsi(e.target.value)}><option value="All">Tous</option><option value="Survendu">Survendues (&lt; 30)</option><option value="Suracheté">Surachetées (&gt; 70)</option></select></div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>{screenerData.map(item => <StockCard key={item.symbole} item={item} />)}</div>
            </div>
          )}

          {/* BACKTEST LAB VIEW */}
          {!loadingMarket && currentView === 'simulator' && (
            <div>
              <h2 style={{color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px'}}>🧪 Backtest Lab & Strategies</h2>
              <div style={{display: 'flex', gap: '20px', alignItems: 'flex-end', background: 'var(--bg-panel)', padding: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '30px'}}>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}><label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Capital (FCFA)</label><input style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} type="number" value={simCapital} onChange={e => setSimCapital(Number(e.target.value))} disabled={loadingSim} /></div>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}><label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Méthode</label><select style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} value={simStrategy} onChange={e => setSimStrategy(e.target.value)} disabled={loadingSim}><option value="rente">Revenus & Dividendes</option><option value="value">Value Investing</option><option value="momentum">Momentum</option></select></div>
                <button style={{padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#9f7aea', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px'}} onClick={runSimulationAndBacktest} disabled={loadingSim}>{loadingSim ? 'Calcul...' : 'Lancer Backtest'}</button>
              </div>
              {backtestResult && (
                <div style={{background: 'var(--bg-panel)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '20px', marginBottom: '30px'}}>
                  <h3 style={{margin: '0 0 15px 0', color: 'var(--text-main)'}}>Preuve de concept sur 3 ans</h3>
                  <div style={{display: 'flex', gap: '30px'}}>
                    <div><div style={{color: 'var(--text-muted)', fontSize: '0.8em'}}>Gain Capital</div><div style={{fontSize: '1.2em', color: 'var(--text-main)'}}>{backtestResult.finalCapital.toLocaleString()} F</div></div>
                    <div><div style={{color: 'var(--text-muted)', fontSize: '0.8em'}}>Dividendes</div><div style={{fontSize: '1.2em', color: 'var(--accent-blue)'}}>+ {backtestResult.dividends.toLocaleString()} F</div></div>
                    <div style={{borderLeft: '1px solid var(--border-color)', paddingLeft: '30px'}}><div style={{color: 'var(--text-muted)', fontSize: '0.8em'}}>TOTAL RETURN</div><div style={{fontSize: '1.8em', color: backtestResult.perfTotal >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold'}}>{backtestResult.totalReturnVal.toLocaleString()} F <span style={{fontSize: '0.6em', marginLeft: '10px'}}>({backtestResult.perfTotal > 0 ? '+' : ''}{backtestResult.perfTotal.toFixed(2)}%)</span></div></div>
                  </div>
                </div>
              )}
              {proposedPortfolio.length > 0 && (
                <div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>{proposedPortfolio.map(item => (
                    <div key={item.sigle} style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', borderLeft: '4px solid #9f7aea'}}>
                      <div style={{fontSize: '1.2em', fontWeight: 'bold', color: 'var(--text-main)'}}>{item.sigle}</div><div style={{color: 'var(--text-muted)', marginBottom: '10px'}}>{item.nom}</div>
                      <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)'}}><span>Quantité:</span> <strong>{item.shares}</strong></div>
                      <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)'}}><span>Alloué:</span> <strong>{item.total.toLocaleString()} F</strong></div>
                    </div>
                  ))}</div>
                  <div style={{marginTop: '20px', textAlign: 'right'}}><button style={{padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--up-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer'}} onClick={confirmPurchase}>✅ Valider l'Achat</button></div>
                </div>
              )}
            </div>
          )}

          {/* PORTFOLIO CLOUD VIEW AVEC CMP, RECHERCHE & VENTE PARTIELLE */}
          {!loadingMarket && currentView === 'portfolio' && (
            <div>
              <div style={{borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px'}}>
                <h2 style={{color: 'var(--text-main)', margin: 0}}>💼 Portfolio Cloud & Risque</h2>
              </div>

              <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid var(--border-color)'}}>
                <h3 style={{margin: '0 0 15px 0', color: 'var(--text-main)'}}>➕ Ajouter une position</h3>
                <form onSubmit={handleManualAdd} style={{display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                  {/* BARRE DE RECHERCHE AVEC DATALIST */}
                  <div style={{flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                    <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Rechercher l'action</label>
                    <input 
                      list="stock-options" 
                      value={manualSymbol} 
                      onChange={(e) => setManualSymbol(e.target.value)} 
                      placeholder="Ex: SGBC ou Société..." 
                      required
                      style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} 
                    />
                    <datalist id="stock-options">
                      {[...marketData].sort((a,b) => a.symbole.localeCompare(b.symbole)).map(i => (
                        <option key={i.symbole} value={i.symbole}>{i.nom}</option>
                      ))}
                    </datalist>
                  </div>
                  <div style={{flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                    <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Quantité</label>
                    <input style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} type="number" min="1" value={manualShares} onChange={(e) => setManualShares(e.target.value)} required placeholder="Qté" />
                  </div>
                  <div style={{flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                    <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>PRU Unitaire</label>
                    <input style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} type="number" min="1" step="any" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} required placeholder="Ex: 2500" />
                  </div>
                  <button type="submit" style={{padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--up-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px'}}>Ajouter</button>
                </form>
              </div>

              {groupedPortfolio.length === 0 || !portfolioAnalytics ? (
                <div style={{textAlign: 'center', padding: '50px', background: 'var(--bg-panel)', borderRadius: '10px', color: 'var(--text-muted)'}}>Votre portefeuille est vide.</div>
              ) : (
                <>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)'}}>
                        <div style={{color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', fontWeight:'bold'}}>Valeur Globale</div>
                        <div style={{fontSize: '2.5em', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '5px'}}>{portfolioAnalytics.totalValue.toLocaleString()} F</div>
                        <div style={{fontSize: '0.9em', color: (portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) >= 0 ? 'var(--up-color)' : 'var(--down-color)', marginTop: '5px'}}>
                          P/L : {(portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) >= 0 ? '+' : ''}{(portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested).toLocaleString()} F
                        </div>
                      </div>
                      <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: `4px solid ${portfolioAnalytics.riskStatus.color}`}}>
                        <div style={{color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', fontWeight:'bold'}}>Profil de Risque</div>
                        <div style={{fontSize: '1.5em', fontWeight: 'bold', color: portfolioAnalytics.riskStatus.color, marginTop: '5px'}}>{portfolioAnalytics.riskStatus.label}</div>
                      </div>
                    </div>
                    <div style={{background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'row', gap: '10px'}}>
                      <div style={{flex: 1, height: '220px', minWidth: '150px'}}>
                        <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: 'bold'}}>Actifs</div>
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={portfolioAnalytics.assetsChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">{portfolioAnalytics.assetsChart.map((e,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
                      </div>
                      <div style={{flex: 1, height: '220px', minWidth: '150px', borderLeft: '1px solid var(--border-color)'}}>
                        <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: 'bold'}}>Secteurs</div>
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={portfolioAnalytics.sectorsChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">{portfolioAnalytics.sectorsChart.map((e,i)=><Cell key={i} fill={PIE_COLORS[(i+3)%PIE_COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  {/* TABLEAU GROUPÉ */}
                  <div style={{overflowX: 'auto', background: 'var(--bg-panel)', borderRadius: '10px', border: '1px solid var(--border-color)'}}>
                    <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr style={{borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)'}}>
                          <th style={{padding: '15px'}}>Actif</th>
                          <th style={{padding: '15px'}}>Qté</th>
                          <th style={{padding: '15px'}}>CMP (Investi)</th>
                          <th style={{padding: '15px'}}>Cours (Valeur)</th>
                          <th style={{padding: '15px'}}>P/L Latent</th>
                          <th style={{padding: '15px'}}>Conseil IA</th>
                          <th style={{padding: '15px'}}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedPortfolio.map((pos) => (
                          <tr key={pos.sigle} style={{borderBottom: '1px solid var(--border-color)'}}>
                            <td style={{padding: '15px'}}><strong style={{color: 'var(--text-main)', fontSize: '1.1em'}}>{pos.sigle}</strong><br/><span style={{fontSize:'0.8em', color:'var(--text-muted)'}}>{getSector(pos.sigle)}</span></td>
                            <td style={{padding: '15px', fontWeight: 'bold'}}>{pos.totalShares}</td>
                            <td style={{padding: '15px'}}>{Math.round(pos.cmp).toLocaleString()} F<br/><span style={{fontSize:'0.8em', color:'var(--text-muted)'}}>Tot: {pos.totalInvested.toLocaleString()}</span></td>
                            <td style={{padding: '15px'}}>{pos.currentPrice.toLocaleString()} F<br/><span style={{fontSize:'0.8em', color:'var(--accent-blue)'}}>Val: {pos.currentValue.toLocaleString()}</span></td>
                            <td style={{padding: '15px', color: pos.profit >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold'}}>{pos.profit >= 0 ? '+' : ''}{Math.round(pos.profit).toLocaleString()} F <br/><span style={{fontSize: '0.8em'}}>({pos.profit >= 0 ? '+' : ''}{pos.profitPct.toFixed(2)}%)</span></td>
                            <td style={{padding: '15px'}}>
                              <span style={{color: pos.conseil.color, fontWeight: 'bold', border: `1px solid ${pos.conseil.color}`, padding: '6px 10px', borderRadius: '20px', fontSize: '0.85em', display: 'inline-block'}}>
                                {pos.conseil.texte}
                              </span>
                            </td>
                            <td style={{padding: '15px'}}>
                              <button onClick={() => openSellModal(pos.sigle, pos.totalShares)} style={{background: 'transparent', border: '1px solid var(--down-color)', color: 'var(--down-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                                Vendre
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ==================== MODAL VENTE PARTIELLE ==================== */}
        {sellModal.isOpen && (
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div style={{background: 'var(--bg-panel)', padding: '30px', borderRadius: '12px', width: '350px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}}>
              <h3 style={{color: 'var(--text-main)', marginTop: 0, marginBottom: '20px'}}>Vendre {sellModal.sigle}</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)'}}>
                  <span>Actions disponibles :</span>
                  <strong style={{color: 'var(--text-main)'}}>{sellModal.maxShares}</strong>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                  <label style={{color: 'var(--text-muted)', fontSize: '0.9em'}}>Quantité à vendre</label>
                  <input type="number" min="1" max={sellModal.maxShares} value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} style={{padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)'}} autoFocus />
                </div>
                <button onClick={confirmPartialSell} disabled={isSelling} className="landing-btn landing-btn-primary" style={{backgroundColor: 'var(--down-color)', marginTop: '10px'}}>
                  {isSelling ? 'Traitement...' : 'Confirmer la Vente'}
                </button>
                <button onClick={() => { setSellModal({isOpen: false, sigle: '', maxShares: 0}); setSellQuantity(''); }} disabled={isSelling} style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '5px', cursor: 'pointer', fontWeight: 'bold'}}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MODAL ANALYSE RECHARTS ==================== */}
        {selectedStock && (
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-base)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '30px 40px', overflowY: 'auto'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <div>
                <h2 style={{margin: 0, fontSize: '2.5em', color: 'var(--text-main)'}}>{selectedStock.nom}</h2>
                <span style={{color: 'var(--text-muted)', fontSize: '1.2em', marginRight: '15px'}}>{selectedStock.symbole} • {getSector(selectedStock.symbole)}</span>
                <span style={{color: selectedStock.variation >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontSize: '1.2em', fontWeight: 'bold'}}>{selectedStock.close?.toLocaleString()} F ({selectedStock.variation >= 0 ? '+' : ''}{selectedStock.variation}%)</span>
              </div>
              <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                <select value={chartHorizon} onChange={(e) => setChartHorizon(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold'}}>
                  <option value="30">Zoom 1 Mois</option>
                  <option value="180">Zoom 6 Mois</option>
                  <option value="365">Zoom 1 An</option>
                  <option value="ALL">Historique Complet</option>
                </select>
                <button style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => { setSelectedStock(null); setStockHistory([]); }}>Fermer ✕</button>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px'}}>
              <div style={{background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid var(--accent-blue)`}}>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold'}}>Revenu Passif</div>
                <div style={{fontSize: '1.3em', color: 'var(--text-main)', fontWeight: '900'}}>{selectedStock.rendement_dividende ? `${selectedStock.rendement_dividende}% / an` : 'N/A'}</div>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px'}}>Rendement Dividende</div>
              </div>
              <div style={{background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${getValColor(selectedStock.statut_valorisation)}`}}>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold'}}>Analyse Fondamentale</div>
                <div style={{fontSize: '1.3em', color: getValColor(selectedStock.statut_valorisation), fontWeight: '900'}}>{selectedStock.statut_valorisation || 'N/A'}</div>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px'}}>PER : {selectedStock.per || 'N/A'}</div>
              </div>
              <div style={{background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${getRsiColor(selectedStock.statut_rsi)}`}}>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold'}}>Momentum Technique</div>
                <div style={{fontSize: '1.3em', color: getRsiColor(selectedStock.statut_rsi), fontWeight: '900'}}>{selectedStock.statut_rsi || 'Neutre'}</div>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px'}}>RSI (14) : {selectedStock.rsi_14?.toFixed(2) || 'N/A'}</div>
              </div>
              <div style={{background: 'var(--bg-panel)', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${selectedStock.tendance_court_terme === 'Haussière' ? 'var(--up-color)' : 'var(--down-color)'}`}}>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold'}}>Tendance Court Terme</div>
                <div style={{fontSize: '1.3em', color: selectedStock.tendance_court_terme === 'Haussière' ? 'var(--up-color)' : 'var(--down-color)', fontWeight: '900'}}>{selectedStock.tendance_court_terme || 'N/A'}</div>
                <div style={{fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px'}}>Moyenne Mobile 20 Jours</div>
              </div>
            </div>

            <div style={{flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', minHeight: '350px'}}>
              {loadingHistory ? <div style={{textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)'}}>Chargement des séries historiques...</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={displayedHistory}>
                    <defs><linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fontSize: 12}} minTickGap={40} />
                    <YAxis yAxisId="left" stroke="var(--text-muted)" domain={['auto', 'auto']} tickFormatter={v => `${v.toLocaleString()} F`} width={75} />
                    <YAxis yAxisId="right" orientation="right" display="none" />
                    <Tooltip contentStyle={{backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)'}} labelStyle={{color: 'var(--text-muted)'}} />
                    <Area yAxisId="left" type="monotone" dataKey="close" name="Cours de Clôture" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorClose)" />
                    <Line yAxisId="left" type="monotone" dataKey="sma_20" name="Moyenne 20J" stroke="var(--warn-color)" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                    <Bar yAxisId="right" dataKey="volume" name="Volume Échangé" fill="var(--text-muted)" opacity={0.15} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}