// ==========================================
// ALGORITHME QUANT PRO : ATR & VOLATILITÉ
// ==========================================
// Dérive des points de trading (entrée / sortie / stop / volatilité) à partir
// des indicateurs d'un titre. Fonction PURE — réutilisée pour enrichir le
// snapshot marché (voir hooks/useMarketData).
export function calculateTradingPoints(stock) {
  const currentPrice = stock.close || 0;
  const sma = stock.sma_20 || currentPrice;
  const rsi = stock.rsi_14 || 50;

  // Estimation de la volatilité journalière (Proxy ATR)
  const rawVolatility = Math.abs(stock.variation) > 0 ? (Math.abs(stock.variation) / 100) : 0.025;
  const atr = stock.atr_14 || (currentPrice * rawVolatility);

  // 1. Point d'entrée dynamique
  let entry = currentPrice;
  if (rsi > 65) {
    entry = currentPrice - atr; // Suracheté : attente d'un repli de 1x l'ATR
  } else if (currentPrice > sma && currentPrice < sma + (atr * 2)) {
    entry = sma; // Tendance haussière saine : achat sur support SMA 20
  } else {
    entry = currentPrice - (atr * 0.5); // Contexte neutre : léger discount
  }

  // 2. Stop-Loss basé sur la volatilité (1.5x ATR sous l'entrée)
  const stopLoss = entry - (1.5 * atr);

  // 3. Objectif de sortie (Take Profit basé sur un ratio Risk/Reward > 2)
  let exit = entry + (3.0 * atr);
  if (rsi < 35) {
    exit = entry + (4.0 * atr); // Survendu : potentiel de rebond technique accru
  }

  return {
    entry: Math.round(Math.max(entry, 1)),
    exit: Math.round(exit),
    stopLoss: Math.round(Math.max(stopLoss, 1)),
    volatility: Math.round(atr),
  };
}
