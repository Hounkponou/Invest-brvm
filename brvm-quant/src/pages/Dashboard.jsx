import React from 'react';
import { useOutletContext } from 'react-router-dom';
import StockCard from '../components/StockCard';

export default function Dashboard() {
  const { loadingMarket, globalSector, marketStats, setSelectedStock } = useOutletContext();

  if (loadingMarket) {
    return <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronisation avec la BRVM en cours...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>
          Résumé du Marché {globalSector !== 'All' ? `(${globalSector})` : 'Global'}
        </h2>
      </div>
      
      {marketStats ? (
        <>
          {/* RÉSUMÉ : barre synthétique sobre (3 indicateurs séparés) */}
          <div className="market-summary">
            <div className="ms-cell">
              <div className="ms-label">Sentiment</div>
              <div
                className="ms-value"
                style={{ color: marketStats.sentiment === 'Haussier' ? 'var(--up-color)' : (marketStats.sentiment === 'Baissier' ? 'var(--down-color)' : 'var(--text-main)') }}
              >
                {marketStats.sentiment}
              </div>
              <div className="ms-sub">
                <span style={{ color: 'var(--up-color)', fontWeight: 600 }}>{marketStats.advances} ▲</span>
                {'  '}<span style={{ color: 'var(--down-color)', fontWeight: 600 }}>{marketStats.declines} ▼</span>
              </div>
            </div>

            <div className="ms-cell">
              <div className="ms-label">Volume échangé</div>
              <div className="ms-value">{marketStats.totalVol.toLocaleString()}</div>
              <div className="ms-sub">titres</div>
            </div>

            <div className="ms-cell">
              <div className="ms-label">Valeurs analysées</div>
              <div className="ms-value">{marketStats.count}</div>
              <div className="ms-sub">sur la cote</div>
            </div>
          </div>

          {/* LISTE TOP ET FLOP */}
          <div className="topflop-grid">
            <div>
              <h3 className="tf-title" style={{ color: 'var(--up-color)' }}>Top {marketStats.top3.length}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marketStats.top3.map(item => <StockCard key={item.symbole} item={item} onClick={setSelectedStock} />)}
              </div>
            </div>
            <div>
              <h3 className="tf-title" style={{ color: 'var(--down-color)' }}>Flop {marketStats.flop3.length}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marketStats.flop3.map(item => <StockCard key={item.symbole} item={item} onClick={setSelectedStock} />)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>Aucune action trouvée.</div>
      )}
    </div>
  );
}