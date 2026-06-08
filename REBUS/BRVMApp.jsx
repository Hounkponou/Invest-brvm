import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// 1. CONFIGURATION CLIENT SUPABASE
// ============================================================================
const supabaseUrl = "https://pskfhrxqokavxaogqsud.supabase.co";
// NOTE : En production, remplace cette clé service_role par ta clé 'anon' publique !
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2Zocnhxb2thdnhhb2dxc3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwNzE0NiwiZXhwIjoyMDk0MDgzMTQ2fQ.1cFFQFvEfeEquOh0Wc4yfGM_f5xuHi0aWqL6-ZnUpGQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BRVMApp() {
  // États pour le marché global
  const [marketData, setMarketData] = useState([]);
  const [latestDate, setLatestDate] = useState('');
  const [loadingMarket, setLoadingMarket] = useState(true);

  // États pour l'action sélectionnée (Graphique)
  const [selectedSymbole, setSelectedSymbole] = useState('BOAC'); // Valeur par défaut
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ============================================================================
  // 2. RECUPERATION DES DONNEES DU MARCHE (TABLEAU)
  // ============================================================================
  useEffect(() => {
    async function fetchMarketData() {
      try {
        setLoadingMarket(true);
        // Trouver la dernière date disponible
        const { data: dateRes, error: dateErr } = await supabase
          .from('full_stock')
          .select('date')
          .order('date', { ascending: false })
          .limit(1);

        if (dateErr) throw dateErr;
        const maxDate = dateRes[0]?.date;
        setLatestDate(maxDate);

        if (maxDate) {
          // Récupérer toutes les actions pour cette date
          const { data: dataStocks, error: stockErr } = await supabase
            .from('full_stock')
            .select('*')
            .eq('date', maxDate)
            .order('valeur_echangee', { ascending: false });

          if (stockErr) throw stockErr;
          setMarketData(dataStocks);
          
          // Sélectionner par défaut la première action du tableau pour le graphique
          if (dataStocks.length > 0) {
            setSelectedSymbole(dataStocks[0].symbole);
          }
        }
      } catch (err) {
        console.error("Erreur marché:", err.message);
      } finally {
        setLoadingMarket(false);
      }
    }
    fetchMarketData();
  }, []);

  // ============================================================================
  // 3. RECUPERATION DE L'HISTORIQUE DE L'ACTION SELECTIONNEE (GRAPHIQUE)
  // ============================================================================
  useEffect(() => {
    async function fetchHistory() {
      if (!selectedSymbole) return;
      try {
        setLoadingHistory(true);
        const { data, error } = await supabase
          .from('full_stock')
          .select('date, close, sma_20, sma_50, rsi_14')
          .eq('symbole', selectedSymbole)
          .order('date', { ascending: true })
          .limit(30); // Récupère les 30 derniers points de données

        if (error) throw error;
        setHistoryData(data);
      } catch (err) {
        console.error("Erreur historique:", err.message);
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [selectedSymbole]);

  // Helper pour la couleur du RSI
  const getRsiStyle = (rsi) => {
    if (rsi >= 70) return 'bg-red-100 text-red-800 font-bold'; // Suracheté
    if (rsi <= 30) return 'bg-green-100 text-green-800 font-bold'; // Survendu
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      
      {/* HEADER */}
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-black tracking-tight text-white">BRVM <span className="text-indigo-500">QUANT</span></h1>
        <p className="text-sm text-gray-400 mt-1">Terminal d'analyse technique — Dernière mise à jour : <span className="text-indigo-400 font-mono">{latestDate || '...'}</span></p>
      </header>

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNE DE GAUCHE & CENTRE : LE GRAPHIQUE TECHNIQUE */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Analyse Graphique</span>
                <h2 className="text-2xl font-bold text-white mt-1">{selectedSymbole} — Historique Récent</h2>
              </div>
              {loadingHistory && <span className="text-xs text-indigo-400 font-mono animate-pulse">Calcul des indicateurs...</span>}
            </div>

            {/* Zone Graphique */}
            <div className="h-80 w-full mt-4">
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9CA3AF" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#fff' }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, pt: 10 }} />
                    {/* Courbe du Prix de clôture */}
                    <Line type="monotone" dataKey="close" name="Clôture" stroke="#6366F1" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
                    {/* Courbes Moyennes Mobiles */}
                    <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">Aucune donnée historique trouvée</div>
              )}
            </div>
          </div>

          {/* Mini Widget d'aide à la décision basé sur le dernier point */}
          {historyData.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700 bg-gray-850 rounded-lg p-3 text-center">
              <div>
                <p className="text-xs text-gray-400 uppercase">Dernier RSI (14)</p>
                <p className={`text-lg font-bold mt-1 inline-block px-2 rounded ${getRsiStyle(historyData[historyData.length - 1].rsi_14)}`}>
                  {historyData[historyData.length - 1].rsi_14?.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Position / SMA20</p>
                <p className={`text-lg font-bold mt-1 ${historyData[historyData.length - 1].close >= historyData[historyData.length - 1].sma_20 ? 'text-green-400' : 'text-red-400'}`}>
                  {historyData[historyData.length - 1].close >= historyData[historyData.length - 1].sma_20 ? 'Haussier' : 'Baissier'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Tendance Générale</p>
                <p className={`text-lg font-bold mt-1 ${historyData[historyData.length - 1].sma_20 >= historyData[historyData.length - 1].sma_50 ? 'text-green-500' : 'text-red-500'}`}>
                  {historyData[historyData.length - 1].sma_20 >= historyData[historyData.length - 1].sma_50 ? 'Bullish' : 'Bearish'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE : LE DASHBOARD / SCREENER DU MARCHE */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl flex flex-col">
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Screener du Marché</span>
            <h2 className="text-xl font-bold text-white mt-1">Actions BRVM du Jour</h2>
          </div>

          {loadingMarket ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse">Chargement du flux Supabase...</div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
              {marketData.map((stock) => (
                <div 
                  key={stock.symbole}
                  onClick={() => setSelectedSymbole(stock.symbole)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${selectedSymbole === stock.symbole ? 'bg-indigo-950 border-indigo-500 shadow-md shadow-indigo-900/20' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-base">{stock.symbole}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${getRsiStyle(stock.rsi_14)}`}>RSI: {Math.round(stock.rsi_14)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[160px] mt-0.5">{stock.nom}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono font-semibold text-gray-100">{stock.close?.toLocaleString()} F</p>
                    <span className={`text-xs font-bold font-mono ${stock.variation > 0 ? 'text-green-400' : stock.variation < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {stock.variation > 0 ? `+${stock.variation}` : stock.variation}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}