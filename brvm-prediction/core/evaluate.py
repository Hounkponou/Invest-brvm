"""
core/evaluate.py
================
« Challenge » : confronte les prédictions arrivées à échéance aux cours réels,
puis met à jour la table log_predictions (prix réel, écart, réussite).

Corrections d'audit (par rapport à la version d'origine) :
  1. PRIX DE RÉFÉRENCE : on prend désormais la DERNIÈRE séance cotée <= date_cible
     (le cours effectif AU TERME). L'ancienne version faisait `.values[0]`, qui
     renvoyait le cours le PLUS ANCIEN du titre -> le backtest affiché dans l'app
     était donc calculé sur un mauvais prix.
  2. ÉCHÉANCES NON COTÉES : on juge toutes les prédictions dont l'échéance est
     ATTEINTE (`date_cible <= aujourd'hui`) et pas encore évaluées, au lieu d'un
     `== aujourd'hui` strict qui ignorait à jamais les échéances tombant un
     week-end ou un jour férié BRVM.
  3. SEUIL DE RÉUSSITE : lu depuis la config (TARGET_RETURN) au lieu d'un 3.5
     codé en dur -> plus de risque de divergence entre l'entraînement et l'éval.
"""

from datetime import datetime

import pandas as pd

from core.config import supabase_client, TARGET_RETURN


def run_evaluation(df_cours_du_jour):
    print("[EVALUATE] Challenge des prédictions arrivées à terme...")
    aujourd_hui = datetime.today().strftime("%Y-%m-%d")
    seuil_pct = TARGET_RETURN * 100.0  # 0.035 -> 3.5 (%)

    # Toutes les prédictions échues (date_cible <= aujourd'hui) et non encore jugées.
    response = (
        supabase_client.table("log_predictions")
        .select("*")
        .lte("date_cible", aujourd_hui)
        .is_("prix_reel_a_terme", "null")
        .execute()
    )
    predictions_a_juger = response.data or []

    if not predictions_a_juger:
        print("[EVALUATE] Aucune prédiction à vérifier aujourd'hui.")
        return

    # On s'assure que la colonne date est bien de type datetime pour les comparaisons.
    df = df_cours_du_jour.copy()
    df["date"] = pd.to_datetime(df["date"])

    updated = 0
    for pred in predictions_a_juger:
        symbole = pred["symbole"]
        try:
            prix_init = float(pred["prix_initial"])
        except (TypeError, ValueError):
            continue
        if prix_init <= 0:
            continue

        date_cible = pd.to_datetime(str(pred["date_cible"])[:10])

        # Cours du titre jusqu'à l'échéance INCLUSE -> on retient la dernière
        # séance réellement cotée <= date_cible (cours effectif au terme).
        hist = df[(df["symbole"] == symbole) & (df["date"] <= date_cible)].sort_values("date")
        if hist.empty:
            # Aucun historique jusqu'à l'échéance : on ne juge pas (on réessaiera).
            continue

        prix_reel = float(hist["close"].iloc[-1])
        ecart_pct = ((prix_reel - prix_init) / prix_init) * 100.0

        supabase_client.table("log_predictions").update(
            {
                "prix_reel_a_terme": prix_reel,
                "ecart_prix": round(prix_reel - prix_init, 0),
                "ecart_pourcentage": round(ecart_pct, 2),
                "statut_reussite": bool(ecart_pct >= seuil_pct),
            }
        ).eq("id", pred["id"]).execute()
        updated += 1

    print(f"[EVALUATE] {updated}/{len(predictions_a_juger)} prédictions mises à jour avec la réalité.")
