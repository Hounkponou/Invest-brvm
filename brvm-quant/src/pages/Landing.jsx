import React from 'react';
import { useNavigate } from 'react-router-dom';

/* --------------------------------------------------------------------------
   Icônes ligne (SVG) — remplacent les emoji "app IA" par une iconographie
   financière sobre. Trait fin, monochrome (hérite de currentColor).
   -------------------------------------------------------------------------- */
const Ico = {
  logo: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  score: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="6" y1="20" x2="6" y2="13" /><line x1="12" y1="20" x2="12" y2="8" /><line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  ),
  backtest: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  portfolio: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12a9 9 0 1 1-9-9v9z" /><path d="M12 3a9 9 0 0 1 9 9h-9z" opacity="0.55" />
    </svg>
  ),
  sun: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
    </svg>
  ),
};

// Aperçu marché (illustration produit) — valeurs représentatives BRVM
const PREVIEW = [
  { sigle: 'SGBC', cours: '37 995', var: 1.2 },
  { sigle: 'SNTS', cours: '30 200', var: -0.4 },
  { sigle: 'ORAC', cours: '17 000', var: 0.8 },
  { sigle: 'BOAC', cours: '8 400', var: 2.1 },
];

const FEATURES = [
  { key: 'screener', icon: Ico.score, title: 'Screener quantitatif',
    desc: "Un score sur 10 par valeur, croisant fondamentaux (PER, rendement) et technique (RSI, tendance).",
    route: '/screener', label: 'Ouvrir le screener' },
  { key: 'backtest', icon: Ico.backtest, title: 'Backtest de stratégies',
    desc: "Éprouvez vos stratégies (value, momentum, rente) sur l'historique réel de la cote.",
    route: '/simulator', label: 'Lancer un backtest' },
  { key: 'portfolio', icon: Ico.portfolio, title: 'Suivi de portefeuille',
    desc: "Coût moyen pondéré, plus-values latentes et alerte de concentration sectorielle.",
    route: '/portfolio', label: 'Suivre mon portefeuille' },
];

export default function Landing({ user, toggleTheme, isDarkMode, setIsSignUp, setShowAuthModal }) {
  const navigate = useNavigate();
  const openAuth = (signup) => { setIsSignUp(signup); setShowAuthModal(true); };
  const primary = () => (user ? navigate('/dashboard') : openAuth(true));
  const goFeature = (route) => (user ? navigate(route) : openAuth(true));

  const btnSolid = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px',
    background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 10,
    fontWeight: 700, fontSize: '0.98rem', cursor: 'pointer',
  };
  const btnGhost = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px',
    background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)',
    borderRadius: 10, fontWeight: 600, fontSize: '0.98rem', cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

      {/* ============ HEADER ============ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'color-mix(in srgb, var(--bg-base) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ background: 'var(--accent-blue)', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <Ico.logo width={18} height={18} />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Invest<span style={{ color: 'var(--accent-blue)' }}>Pro</span></span>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button onClick={toggleTheme} aria-label="Changer de thème" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center' }}>
              {isDarkMode ? <Ico.sun width={18} height={18} /> : <Ico.moon width={18} height={18} />}
            </button>
            {user ? (
              <button onClick={() => navigate('/dashboard')} style={btnGhost}>Mon tableau de bord</button>
            ) : (
              <>
                <span onClick={() => openAuth(false)} style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Se connecter</span>
                <button onClick={() => openAuth(true)} style={btnSolid}>Créer un compte</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============ HERO (2 colonnes, aligné à gauche) ============ */}
      <main style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: 'clamp(36px, 7vw, 80px) 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center' }}>

          {/* --- Colonne gauche : proposition de valeur --- */}
          <div>
            <div style={{ fontSize: '0.74rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 18 }}>
              Bourse Régionale des Valeurs Mobilières · UEMOA
            </div>
            <h1 style={{ fontSize: 'clamp(2.1rem, 4.6vw, 3.3rem)', lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 20px', fontWeight: 800, textWrap: 'balance' }}>
              Investir sur la BRVM sur des <span style={{ color: 'var(--accent-blue)' }}>données</span>, pas au feeling.
            </h1>
            <p style={{ fontSize: '1.08rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 30px', maxWidth: '52ch' }}>
              Analyse quantitative des 47 valeurs de la cote : score sur 10, signaux de probabilité à 15 jours, backtest de stratégies et suivi de portefeuille — en un seul endroit.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button onClick={primary} style={btnSolid}>{user ? 'Ouvrir le tableau de bord' : 'Commencer'}<Ico.arrow width={17} height={17} /></button>
              <button onClick={() => goFeature('/screener')} style={btnGhost}>Voir le screener</button>
            </div>
            <div style={{ marginTop: 26, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span><strong style={{ color: 'var(--text-main)' }}>47</strong> valeurs suivies</span>
              <span><strong style={{ color: 'var(--text-main)' }}>15 j</strong> horizon de signal</span>
              <span><strong style={{ color: 'var(--text-main)' }}>10 ans</strong> d'historique</span>
            </div>
          </div>

          {/* --- Colonne droite : aperçu produit (ancre le côté "vrai outil") --- */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 22, boxShadow: '0 20px 50px -30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Marché du jour · BRVM</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--up-color)' }} /> en séance
              </span>
            </div>

            {/* Mini-graphique (sparkline) */}
            <svg viewBox="0 0 320 70" width="100%" height="70" preserveAspectRatio="none" style={{ marginBottom: 14 }}>
              <defs>
                <linearGradient id="lgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 55 L40 48 L80 52 L120 38 L160 42 L200 26 L240 30 L280 16 L320 20 L320 70 L0 70 Z" fill="url(#lgFill)" />
              <path d="M0 55 L40 48 L80 52 L120 38 L160 42 L200 26 L240 30 L280 16 L320 20" fill="none" stroke="var(--accent-blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Lignes de valeurs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PREVIEW.map((r) => {
                const up = r.var >= 0;
                const col = up ? 'var(--up-color)' : 'var(--down-color)';
                return (
                  <div key={r.sigle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 8px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.sigle}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{r.cours} F</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem', fontWeight: 700, color: col, background: up ? 'var(--up-bg)' : 'var(--down-bg)', padding: '2px 8px', borderRadius: 6, minWidth: 56, textAlign: 'right' }}>
                        {up ? '+' : ''}{r.var}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bandeau signal */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', borderRadius: 10, background: 'var(--accent-blue-soft)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Signal IA · SGBC</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)' }}>Achat modéré · 8/10</span>
            </div>
          </div>

        </div>

        {/* ============ FONCTIONNALITÉS (sobres, alignées à gauche) ============ */}
        <div style={{ marginTop: 'clamp(48px, 8vw, 88px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.key} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                <f.icon width={20} height={20} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.55, flex: 1 }}>{f.desc}</p>
              <button onClick={() => goFeature(f.route)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}>
                {f.label} <Ico.arrow width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>© 2026 InvestPro — Analyse quantitative de la BRVM.</span>
          <span>Ceci n'est pas un conseil en investissement.</span>
        </div>
      </footer>
    </div>
  );
}
