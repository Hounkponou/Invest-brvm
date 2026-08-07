import React, { useMemo } from 'react';
import { UNIQUE_SECTORS } from '../utils/brvmConfig';
import { FilterSelect, FilterInput } from './filters';
import DataFreshness from './DataFreshness';

export default function TopHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery,
  globalSector,
  setGlobalSector,
  resultCount,
  isDarkMode,
  toggleTheme,
  marketMeta
}) {
  // Options secteur (le "Tous" en tête) — mémoïsées
  const sectorOptions = useMemo(
    () => [{ value: 'All', label: 'Tous les secteurs' }, ...UNIQUE_SECTORS.map((s) => ({ value: s, label: s }))],
    []
  );

  return (
    <header className="top-header">
      <button className="th-menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Recherche & secteur : mêmes composants de filtre que les pages */}
      <div className="th-filters">
        <FilterInput
          type="text"
          placeholder="Rechercher (Ex: SGBC)..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: '250px' }}
        />
        <FilterSelect value={globalSector} onChange={setGlobalSector} options={sectorOptions} />
      </div>

      <div className="th-meta">
        {/* Fraîcheur des données — visible sur toutes les pages du Layout */}
        <DataFreshness date={marketMeta?.date} generatedAt={marketMeta?.generatedAt} />
        {(searchQuery || globalSector !== 'All') && (
          <div style={{ color: 'var(--accent-blue)', fontSize: '0.9em', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {resultCount} résultats
          </div>
        )}
      </div>

      <button className="th-theme" onClick={toggleTheme} aria-label="Changer de thème" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'grid', placeItems: 'center' }}>
        {isDarkMode ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        )}
      </button>
    </header>
  );
}