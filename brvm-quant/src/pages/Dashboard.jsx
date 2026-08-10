import React from 'react';
import { useOutletContext } from 'react-router-dom';
import MarketTable from '../components/MarketTable';

export default function Dashboard() {
  const { loadingMarket, globalSector, marketStats, setSelectedStock, riskBySymbol = {} } = useOutletContext();

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
          {/* RÉSUMÉ : barre synthétique (3 indicateurs séparés) */}
          <div className="market-summary">
            <div className="ms-cell">
              <div className="ms-label">Sentiment</div>
              <div className="ms-value" style={{ color: marketStats.sentiment === 'Haussier' ? 'var(--up-color)' : (marketStats.sentiment === 'Baissier' ? 'var(--down-color)' : 'var(--text-main)') }}>
                {marketStats.sentiment}
              </div>
              <div className="ms-sub">
                <span style={{ color: 'var(--up-color)', fontWeight: 600 }}>{marketStats.advances} ▲</span>
                {'  '}<span style={{ color: 'var(--down-color)', fontWeight: 600 }}>{marketStats.declines} ▼</span>
              </div>
            </div>
            <div className="ms-cell">
              <div className="ms-label">Volume échangé</div>
              <div className="ms-value">{marketStats.totalVol.toLocaleString('fr-FR')}</div>
              <div className="ms-sub">titres</div>
            </div>
            <div className="ms-cell">
              <div className="ms-label">Valeurs analysées</div>
              <div className="ms-value">{marketStats.count}</div>
              <div className="ms-sub">sur la cote</div>
            </div>
          </div>

          {/* TOP 3 / FLOP 3 — en tables (plus haut de gain / de perte de la séance) */}
          <div className="topflop-grid" style={{ marginBottom: 24 }}>
            <div>
              <h3 className="tf-title" style={{ color: 'var(--up-color)' }}>Top {marketStats.top3.length}</h3>
              <MarketTable items={marketStats.top3} onSelect={setSelectedStock} riskBySymbol={riskBySymbol} initialSort={{ key: 'variation', dir: 'desc' }} compact />
            </div>
            <div>
              <h3 className="tf-title" style={{ color: 'var(--down-color)' }}>Flop {marketStats.flop3.length}</h3>
              <MarketTable items={marketStats.flop3} onSelect={setSelectedStock} riskBySymbol={riskBySymbol} initialSort={{ key: 'variation', dir: 'asc' }} compact />
            </div>
          </div>

          <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
            → Pour explorer, trier et filtrer l'ensemble des {marketStats.count} valeurs, utilisez le <strong style={{ color: 'var(--text-main)' }}>Screener</strong>.
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>Aucune action trouvée.</div>
      )}
    </div>
  );
}
