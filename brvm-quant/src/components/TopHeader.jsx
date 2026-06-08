import React from 'react';
import { UNIQUE_SECTORS } from '../utils/brvmConfig';

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
  return (
    <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.5em', cursor: 'pointer' }}>☰</button>
        <input 
          type="text" 
          placeholder="Rechercher (Ex: SGBC)..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', width: '250px' }} 
        />
        <select 
          value={globalSector} 
          onChange={(e) => setGlobalSector(e.target.value)} 
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <option value="All">🌍 Tous les secteurs</option>
          {UNIQUE_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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