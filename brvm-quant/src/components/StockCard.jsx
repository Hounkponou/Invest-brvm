import React from 'react';
import { getValColor } from '../utils/uiHelpers';

export default function StockCard({ item, onClick, sectorAvgPer }) {
  const isUp = item.variation >= 0;

  // Comparaison compacte du PER à la moyenne du secteur (badge sur la carte).
  const per = Number(item.per);
  const avg = Number(sectorAvgPer);
  let perBadge = null;
  if (per > 0 && avg > 0) {
    const delta = ((per - avg) / avg) * 100;
    const below = per < avg;                                  // moins cher que le secteur
    const color = below ? 'var(--up-color)' : 'var(--warn-color)';
    perBadge = (
      <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
        PER:{' '}
        <strong style={{ color }}>
          {per.toFixed(1)}× ({delta > 0 ? '+' : ''}{delta.toFixed(0)}% vs sect.)
        </strong>
      </span>
    );
  } else if (per > 0) {
    perBadge = (
      <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
        PER: <strong style={{ color: 'var(--text-main)' }}>{per.toFixed(1)}×</strong>
      </span>
    );
  }

  return (
    <div 
      className="stock-card" 
      onClick={() => onClick(item)} 
      style={{
        cursor: 'pointer', 
        backgroundColor: 'var(--bg-panel)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)', 
        transition: 'transform 0.2s'
      }}
    >
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span className="stock-symbol" style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.2em', display: 'block' }}>
            {item.symbole}
          </span>
          <span className="stock-name" style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
            {item.nom}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stock-price" style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
            {item.close?.toLocaleString()} F
          </div>
          <div style={{ color: isUp ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold' }}>
            {isUp ? '+' : ''}{item.variation}%
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
            VALO: <strong style={{ color: getValColor(item.statut_valorisation) }}>{item.statut_valorisation || 'N/A'}</strong>
          </span>
          <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
            Rendement: <strong style={{ color: (item.rendement_dividende || 0) > 7 ? 'var(--accent-blue)' : 'var(--text-main)' }}>
              {item.rendement_dividende ? `${item.rendement_dividende}%` : 'N/A'}
            </strong>
          </span>
          {perBadge}
        </div>
        
        <div style={{ textAlign: 'center', background: 'var(--bg-base)', padding: '10px', borderRadius: '8px', border: `1px solid ${item.score_ia >= 7 ? 'var(--up-color)' : item.score_ia <= 4 ? 'var(--down-color)' : 'var(--warn-color)'}` }}>
          <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>
            Score IA
          </div>
          <div style={{ fontSize: '1.5em', fontWeight: '900', color: 'var(--text-main)' }}>
            {item.score_ia}/10
          </div>
        </div>
      </div>
    </div>
  );
}