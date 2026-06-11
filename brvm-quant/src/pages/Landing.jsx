import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing({ user, toggleTheme, isDarkMode, setIsSignUp, setShowAuthModal }) {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* ========================================== */}
      {/* 1. HEADER (Navigation utilitaire discrète) */}
      {/* ========================================== */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(var(--bg-panel-rgb), 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        
        {/* Logo cliquable */}
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-blue), #00d2ff)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 15px rgba(41, 98, 255, 0.3)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: '1.5em', fontWeight: '900', letterSpacing: '0.5px', color: 'var(--text-main)' }}>
            Invest<span style={{ background: 'linear-gradient(90deg, var(--accent-blue), #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pro</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Bouton Thème */}
          <button onClick={toggleTheme} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '1.2em', cursor: 'pointer', padding: '8px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          {/* Boutons d'en-tête */}
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', fontSize: '0.95em', background: 'transparent', color: 'var(--text-main)', border: '2px solid var(--border-color)', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}>
              My Dashboard
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} style={{ fontSize: '0.95em', color: 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                Login
              </span>
              <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} style={{ padding: '10px 20px', fontSize: '0.95em', background: 'var(--text-main)', color: 'var(--bg-base)', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.8'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                Sign up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ========================================== */}
      {/* 2. MAIN HERO (L'action principale)         */}
      {/* ========================================== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3.8em', margin: '0 0 20px 0', maxWidth: '850px', lineHeight: '1.1', letterSpacing: '-1px' }}>
          BRVM Quantitative Analysis.
        </h1>
        <p style={{ fontSize: '1.2em', color: 'var(--text-muted)', marginBottom: '50px', maxWidth: '600px', lineHeight: '1.6' }}>
          Analyze the market in real time, test your strategies, and manage your portfolio in a secure  environment.
        </p>
        
        {/* Le CTA Central (Unique et impactant) */}
        <div style={{ marginBottom: '80px' }}>
          {user ? (
            <button 
              onClick={() => navigate('/screener')} 
              style={{ padding: '18px 45px', fontSize: '1.2em', background: 'linear-gradient(135deg, var(--accent-blue), #00d2ff)', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 25px rgba(41, 98, 255, 0.4)', transition: 'all 0.3s ease' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(41, 98, 255, 0.6)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(41, 98, 255, 0.4)'; }}
            >
              Run analysis on the market
            </button>
          ) : (
            <button 
              onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} 
              style={{ padding: '18px 45px', fontSize: '1.2em', background: 'linear-gradient(135deg, var(--accent-blue), #00d2ff)', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 25px rgba(41, 98, 255, 0.4)', transition: 'all 0.3s ease' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(41, 98, 255, 0.6)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(41, 98, 255, 0.4)'; }}
            >
              Get Started
            </button>
          )}
        </div>

        {/* ========================================== */}
        {/* 3. CARTES FONCTIONNALITÉS (Ghost Buttons)  */}
        {/* ========================================== */}
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1100px', width: '100%' }}>
          
          {/* Carte 1 : Screener */}
          <div className="feature-card" style={{ background: 'var(--bg-panel)', padding: '40px 30px', borderRadius: '16px', border: '1px solid var(--border-color)', flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3em', marginBottom: '20px' }}>🤖</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>Scoring</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0 }}>Each stock is analyzed from both a technical and fundamental perspective to provide you with an instant score out of 10</p>
            </div>
            <button 
              onClick={() => user ? navigate('/screener') : setShowAuthModal(true)}
              style={{ marginTop: '30px', width: '100%', padding: '12px', background: 'transparent', border: '2px solid var(--accent-blue)', color: 'var(--accent-blue)', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-blue)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Open Screener
            </button>
          </div>

          {/* Carte 2 : Simulator */}
          <div className="feature-card" style={{ background: 'var(--bg-panel)', padding: '40px 30px', borderRadius: '16px', border: '1px solid var(--border-color)', flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏱️</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>Backtesting</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0 }}>Our time-traveling machine proves the profitability of your strategies over the last 3 years.</p>
            </div>
            <button 
              onClick={() => user ? navigate('/simulator') : setShowAuthModal(true)}
              style={{ marginTop: '30px', width: '100%', padding: '12px', background: 'transparent', border: '2px solid #9f7aea', color: '#9f7aea', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={e => { e.currentTarget.style.background = '#9f7aea'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9f7aea'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Test your strategy
            </button>
          </div>

          {/* Carte 3 : Portfolio */}
          <div className="feature-card" style={{ background: 'var(--bg-panel)', padding: '40px 30px', borderRadius: '16px', border: '1px solid var(--border-color)', flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3em', marginBottom: '20px' }}>☁️</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>Cloud Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1em', lineHeight: '1.6', margin: 0 }}>Your portfolio is securely backed up. Access your risk monitoring and allocation tracking from anywhere.</p>
            </div>
            <button 
              onClick={() => user ? navigate('/portfolio') : setShowAuthModal(true)}
              style={{ marginTop: '30px', width: '100%', padding: '12px', background: 'transparent', border: '2px solid var(--up-color)', color: 'var(--up-color)', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--up-color)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--up-color)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Create My Portfolio
            </button>
          </div>

        </div>
      </main>

      <footer style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', marginTop: 'auto' }}>
        © 2026 Invest Pro. All rights reserved.
      </footer>
    </div>
  );
}