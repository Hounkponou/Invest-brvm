import React from 'react';
import { useOutletContext } from 'react-router-dom';
import StockCard from '../components/StockCard';
import { FilterSelect, FilterInput, FilterPanel } from '../components/filters';
import { getSector } from '../utils/brvmConfig';

// Options des filtres (déclarées hors composant = pas recréées à chaque rendu)
const SORT_OPTIONS = [
  { value: 'score', label: '⭐ Score IA' },
  { value: 'yield_desc', label: '💰 Rendement' },
  { value: 'per_asc', label: '🟢 PER le plus bas' },
  { value: 'rsi_asc', label: '📉 RSI le plus bas' },
];
const VAL_OPTIONS = [
  { value: 'All', label: 'Tout' },
  { value: 'Sous-éval', label: 'Sous-évaluées' },
  { value: 'Suréval', label: 'Surévaluées' },
];
const RSI_OPTIONS = [
  { value: 'All', label: 'Tous' },
  { value: 'Survendu', label: 'Survendues (< 30)' },
  { value: 'Suracheté', label: 'Surachetées (> 70)' },
];

export default function Screener() {
  const {
    screenerSort, setScreenerSort,
    filterVal, setFilterVal,
    filterRsi, setFilterRsi,
    filterMinPrice, setFilterMinPrice,
    filterMaxPrice, setFilterMaxPrice,
    screenerData,
    setSelectedStock,
    sectorPerStats
  } = useOutletContext();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Stock Screener</h2>
        <FilterSelect
          label="Trier par"
          value={screenerSort}
          onChange={setScreenerSort}
          options={SORT_OPTIONS}
        />
      </div>

      {/* ZONE DES FILTRES AVANCÉS (composants réutilisables) */}
      <FilterPanel>
        <FilterSelect label="Valorisation" value={filterVal} onChange={setFilterVal} options={VAL_OPTIONS} />
        <FilterSelect label="Momentum" value={filterRsi} onChange={setFilterRsi} options={RSI_OPTIONS} />

        {/* Intervalle de prix : deux champs côte à côte sous un même label */}
        <div className="filter-field">
          <label className="filter-label">Prix (FCFA)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FilterInput type="number" placeholder="Min" min="0" value={filterMinPrice} onChange={setFilterMinPrice} />
            <FilterInput type="number" placeholder="Max" min="0" value={filterMaxPrice} onChange={setFilterMaxPrice} />
          </div>
        </div>
      </FilterPanel>

      {/* RÉSULTATS DU SCREENER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {screenerData.map(item => (
          <StockCard
            key={item.symbole}
            item={item}
            onClick={setSelectedStock}
            sectorAvgPer={sectorPerStats?.[getSector(item.symbole)]?.avg}
          />
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