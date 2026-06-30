import React from 'react';
import { useOutletContext } from 'react-router-dom';
import StockCard from '../components/StockCard';

export default function Screener() {
  const { 
    screenerSort, setScreenerSort, 
    filterVal, setFilterVal, 
    filterRsi, setFilterRsi, 
    filterMinPrice, setFilterMinPrice, 
    filterMaxPrice, setFilterMaxPrice,
    screenerData, 
    setSelectedStock
  } = useOutletContext();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Stock Screener</h2>
        </div>
        <select 
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', fontWeight: 'bold' }} 
          value={screenerSort} 
          onChange={(e) => setScreenerSort(e.target.value)}
        >
          <option value="score">⭐ Score IA</option>
          <option value="yield_desc">💰 Rendement</option>
          <option value="per_asc">🟢 PER le plus bas</option>
          <option value="rsi_asc">📉 RSI le plus bas</option>
        </select>
      </div>
      
      {/* ZONE DES FILTRES AVANCÉS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px', background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        
        {/* Filtre Valorisation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Valorisation</label>
          <select 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            value={filterVal} 
            onChange={e => setFilterVal(e.target.value)}
          >
            <option value="All">Tout</option>
            <option value="Sous-éval">Sous-évaluées</option>
            <option value="Suréval">Surévaluées</option>
          </select>
        </div>

        {/* Filtre Momentum RSI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Momentum</label>
          <select 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            value={filterRsi} 
            onChange={e => setFilterRsi(e.target.value)}
          >
            <option value="All">Tous</option>
            <option value="Survendu">Survendues (&lt; 30)</option>
            <option value="Suracheté">Surachetées (&gt; 70)</option>
          </select>
        </div>

        {/* NOUVEAU : Filtre Intervalle de Prix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Prix (FCFA)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" 
              placeholder="Min" 
              min="0"
              value={filterMinPrice}
              onChange={e => setFilterMinPrice(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            />
            <input 
              type="number" 
              placeholder="Max" 
              min="0"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            />
          </div>
        </div>

      </div>
      
      {/* RÉSULTATS DU SCREENER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {screenerData.map(item => (
          <StockCard key={item.symbole} item={item} onClick={setSelectedStock} />
        ))}
        {screenerData.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-panel)', borderRadius: '8px' }}>
            Aucune action ne correspond à ces critères.
          </div>
        )}
      </div>
    </div>
  );
}