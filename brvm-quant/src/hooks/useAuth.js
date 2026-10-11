import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

/**
 * useAuth — session Supabase + état du formulaire de connexion/inscription.
 * Centralise toute la logique d'authentification hors d'App.jsx.
 *
 * @returns session (`user`, `sessionLoading`), état de la modale d'auth
 *   (`showAuthModal`, `isSignUp`, champs email/mot de passe) et les actions
 *   `handleAuth` / `handleLogout`.
 */
export default function useAuth() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    let error;
    if (isSignUp) {
      const res = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = res.error;
      if (!error) { alert('Inscription réussie !'); setShowAuthModal(false); }
    } else {
      const res = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = res.error;
      if (!error) setShowAuthModal(false);
    }
    setAuthLoading(false);
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return {
    user, sessionLoading,
    showAuthModal, setShowAuthModal,
    isSignUp, setIsSignUp,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authLoading,
    handleAuth, handleLogout,
  };
}
