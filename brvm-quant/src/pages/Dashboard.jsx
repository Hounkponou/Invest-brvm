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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            
            {/* CARTE 1 : SENTIMENT */}
            <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: `4px solid ${marketStats.sentiment === 'Haussier' ? 'var(--up-color)' : (marketStats.sentiment === 'Baissier' ? 'var(--down-color)' : 'var(--text-muted)')}` }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase' }}>Sentiment</div>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0' }}>{marketStats.sentiment}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}><span style={{ color: 'var(--up-color)' }}>{marketStats.advances} Hausses</span> vs <span style={{ color: 'var(--down-color)' }}>{marketStats.declines} Baisses</span></div>
            </div>

            {/* CARTE 2 : VOLUME (Celle qui avait disparu) */}
            <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase' }}>Volume Échangé</div>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0' }}>
                {marketStats.totalVol.toLocaleString()}
              </div>
            </div>

            {/* CARTE 3 : ACTIONS ANALYSÉES (Celle qui avait disparu) */}
            <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #9f7aea' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase' }}>Actions Analysées</div>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--text-main)', margin: '10px 0' }}>
                {marketStats.count}
              </div>
            </div>

          </div>

          {/* LISTE TOP ET FLOP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', minWidth: '0' }}>
            <div>
              <h3 style={{ color: 'var(--up-color)', margin: '0 0 15px 0' }}>🚀 Top {marketStats.top3.length}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {marketStats.top3.map(item => <StockCard key={item.symbole} item={item} onClick={setSelectedStock} />)}
              </div>
            </div>
            <div>
              <h3 style={{ color: 'var(--down-color)', margin: '0 0 15px 0' }}>⚠️ Flop {marketStats.flop3.length}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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