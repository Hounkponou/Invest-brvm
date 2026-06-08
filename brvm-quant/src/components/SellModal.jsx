import React from 'react';

export default function SellModal({
  sellModal,
  setSellModal,
  sellQuantity,
  setSellQuantity,
  confirmPartialSell,
  isSelling
}) {
  //if (!sellModal.isOpen) return null;
    if (!sellModal?.isOpen) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'var(--bg-panel)', padding: '30px', borderRadius: '12px', width: '350px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h3 style={{ color: 'var(--text-main)', marginTop: 0, marginBottom: '20px' }}>
          Vendre {sellModal.sigle}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Actions disponibles :</span>
            <strong style={{ color: 'var(--text-main)' }}>{sellModal.maxShares}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Quantité à vendre</label>
            <input 
              type="number" 
              min="1" 
              max={sellModal.maxShares} 
              value={sellQuantity} 
              onChange={e => setSellQuantity(e.target.value)} 
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
              autoFocus 
            />
          </div>
          <button 
            onClick={confirmPartialSell} 
            disabled={isSelling} 
            className="landing-btn landing-btn-primary" 
            style={{ backgroundColor: 'var(--down-color)', marginTop: '10px' }}
          >
            {isSelling ? 'Traitement...' : 'Confirmer la Vente'}
          </button>
          <button 
            onClick={() => { setSellModal({ isOpen: false, sigle: '', maxShares: 0 }); setSellQuantity(''); }} 
            disabled={isSelling} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}