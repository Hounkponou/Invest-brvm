import React, { useMemo } from 'react';
import { UNIQUE_SECTORS } from '../utils/brvmConfig';
import { FilterSelect, FilterInput } from './filters';

export default function TopHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery,
  globalSector,
  setGlobalSector,
  resultCount,
  isDarkMode,
  toggleTheme
}) {
  // Options secteur (le "Tous" en tête) — mémoïsées
  const sectorOptions = useMemo(
    () => [{ value: 'All', label: '🌍 Tous les secteurs' }, ...UNIQUE_SECTORS.map((s) => ({ value: s, label: s }))],
    []
  );

  return (
    <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.5em', cursor: 'pointer' }}>☰</button>
        {/* Recherche & secteur : mêmes composants de filtre que les pages */}
        <FilterInput
          type="text"
          placeholder="Rechercher (Ex: SGBC)..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: '250px' }}
        />
        <FilterSelect value={globalSector} onChange={setGlobalSector} options={sectorOptions} />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {(searchQuery || globalSector !== 'All') && (
          <div style={{ color: 'var(--accent-blue)', fontSize: '0.9em', fontWeight: 'bold' }}>
            {resultCount} résultats
          </div>
        )}
        <button onClick={toggleTheme} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '1.2em', cursor: 'pointer', padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}