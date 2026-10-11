import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

// Ligne DB `user_portfolios` -> objet position du front (camelCase).
const mapRow = (item) => ({
  id: item.id,
  sigle: item.sigle,
  nom: item.nom,
  shares: Number(item.shares),
  buyPrice: Number(item.buy_price),
  total: Number(item.total),
});

/**
 * usePortfolio — portefeuille cloud de l'utilisateur (lecture + ajout manuel +
 * vente partielle FIFO), et l'état de la modale de vente. Isole toute la logique
 * sensible (écritures `user_portfolios`) hors d'App.jsx.
 *
 * @param {object|null} user       Utilisateur connecté (déclenche le chargement).
 * @param {object[]}    marketData Snapshot marché, pour résoudre le nom d'un titre ajouté.
 * @returns le portefeuille, les champs du formulaire d'ajout, l'état de la modale
 *   de vente et les actions associées. `setSavedPortfolio` est exposé pour le flux
 *   « adopter le portefeuille simulé ».
 */
export default function usePortfolio(user, marketData) {
  const [savedPortfolio, setSavedPortfolio] = useState([]);
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualShares, setManualShares] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  const [sellModal, setSellModal] = useState({ isOpen: false, sigle: '', maxShares: 0 });
  const [sellQuantity, setSellQuantity] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  useEffect(() => {
    if (!user) { setSavedPortfolio([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id);
      if (data && !cancelled) setSavedPortfolio(data.map(mapRow));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    const cleanSymbol = manualSymbol.trim().toUpperCase();
    if (!cleanSymbol || !manualShares || !manualPrice) return;

    const stockInfo = marketData.find((s) => s.symbole === cleanSymbol);
    if (!stockInfo) {
      alert(`L'action "${cleanSymbol}" est introuvable. Veuillez vérifier le sigle (ex: SGBC).`);
      return;
    }

    const newEntry = { user_id: user.id, sigle: cleanSymbol, nom: stockInfo.nom, shares: Number(manualShares), buy_price: Number(manualPrice), total: Number(manualShares) * Number(manualPrice) };
    const { data, error } = await supabase.from('user_portfolios').insert([newEntry]).select();
    if (!error && data) {
      setSavedPortfolio((prev) => [...prev, mapRow(data[0])]);
      setManualSymbol(''); setManualShares(''); setManualPrice('');
    }
  };

  const openSellModal = (sigle, maxShares) => {
    setSellModal({ isOpen: true, sigle, maxShares });
    setSellQuantity('');
  };

  const confirmPartialSell = async () => {
    const qtyToSell = Number(sellQuantity);
    if (qtyToSell <= 0 || qtyToSell > sellModal.maxShares) { alert('Quantité invalide.'); return; }
    setIsSelling(true);
    let remainingToSell = qtyToSell;
    const lots = savedPortfolio.filter((p) => p.sigle === sellModal.sigle).sort((a, b) => a.id.localeCompare(b.id));
    const toDelete = []; const toUpdate = [];

    for (const lot of lots) {
      if (remainingToSell <= 0) break;
      if (lot.shares <= remainingToSell) {
        toDelete.push(lot.id); remainingToSell -= lot.shares;
      } else {
        toUpdate.push({ id: lot.id, shares: lot.shares - remainingToSell, buyPrice: lot.buyPrice });
        remainingToSell = 0;
      }
    }

    if (toDelete.length > 0) await supabase.from('user_portfolios').delete().in('id', toDelete);
    for (const update of toUpdate) {
      await supabase.from('user_portfolios').update({ shares: update.shares, total: update.shares * update.buyPrice }).eq('id', update.id);
    }

    const { data } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id);
    if (data) setSavedPortfolio(data.map(mapRow));
    setIsSelling(false); setSellModal({ isOpen: false, sigle: '', maxShares: 0 }); setSellQuantity('');
  };

  return {
    savedPortfolio, setSavedPortfolio,
    manualSymbol, setManualSymbol,
    manualShares, setManualShares,
    manualPrice, setManualPrice,
    handleManualAdd,
    sellModal, setSellModal,
    sellQuantity, setSellQuantity,
    isSelling,
    openSellModal, confirmPartialSell,
  };
}
