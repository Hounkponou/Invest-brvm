import React from 'react';

export default function AuthModal({
  isSignUp,
  setIsSignUp,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  handleAuth,
  authLoading,
  setShowAuthModal
}) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'var(--bg-panel)', padding: '40px', borderRadius: '12px', width: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: 'var(--text-main)', marginTop: 0, textAlign: 'center' }}>
          {isSignUp ? 'Créer un compte' : 'Connexion'}
        </h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Email</label>
            <input 
              type="email" 
              value={authEmail} 
              onChange={e => setAuthEmail(e.target.value)} 
              required 
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Mot de passe</label>
            <input 
              type="password" 
              value={authPassword} 
              onChange={e => setAuthPassword(e.target.value)} 
              required 
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            />
          </div>
          <button 
            type="submit" 
            className="landing-btn landing-btn-primary" 
            disabled={authLoading} 
            style={{ marginTop: '10px' }}
          >
            {authLoading ? 'Chargement...' : (isSignUp ? "S'inscrire" : "Se Connecter")}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span 
            style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9em', textDecoration: 'underline' }} 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Déjà un compte ? Connectez-vous' : "Pas de compte ? S'inscrire"}
          </span>
        </div>
        
        <button 
          onClick={() => setShowAuthModal(false)} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}