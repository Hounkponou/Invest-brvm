"""
scripts/upsert_predictions.py
=============================
Écriture ROBUSTE et IDEMPOTENTE des prédictions quotidiennes dans Supabase.

Ce module isole toute la logique d'écriture (auparavant noyée dans core/predict.py)
et la durcit pour un usage automatisé en CI (GitHub Actions) :

  - UPSERT par LOT (batch) sur la clé métier (date_prediction, symbole)
    -> ré-exécuter le job deux fois ne crée pas de doublons.
  - RETRIES avec backoff exponentiel -> un timeout réseau ponctuel n'échoue pas le job.
  - VALIDATION de schéma avant envoi -> on ne pousse jamais une ligne malformée.
  - Dérivation du SCORE SUR 10 et du SIGNAL à partir de la probabilité (calibrée).
  - Logging clair de ce qui a été écrit.

Table cible : log_predictions
Colonnes utilisées :
    date_prediction (date, PK1), symbole (text, PK2), prix_initial (float),
    probabilite_modele (float 0..1), score_sur_10 (int), signal_emis (text),
    date_cible (date), horizon_jours (int), modele_version (text)

  -> `score_sur_10` / `horizon_jours` / `modele_version` sont optionnels : si les
     colonnes n'existent pas encore dans ta table, ajoute-les (voir SQL en bas de
     fichier) ou passe include_optional=False.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta

# On réutilise le client déjà initialisé dans le projet
from core.config import supabase_client, HORIZON_JOURS

TABLE = "log_predictions"
CONFLICT_KEYS = "date_prediction,symbole"
BATCH_SIZE = 200
MAX_RETRIES = 4


# ---------------------------------------------------------------------------
# Dérivations métier : probabilité -> score/10 & signal
# ---------------------------------------------------------------------------
def proba_to_score_10(proba: float) -> int:
    """Convertit une probabilité calibrée [0,1] en score entier sur 10.

    Simple, lisible pour l'utilisateur : 0.73 -> 7. On borne dans [0,10].
    """
    return int(max(0, min(10, round(proba * 10))))


def proba_to_signal(proba: float) -> str:
    """Traduit la probabilité en signal métier (mêmes seuils que l'app)."""
    if proba >= 0.70:
        return "Achat Fort"
    if proba >= 0.55:
        return "Achat Modéré"
    return "Conserver"


# ---------------------------------------------------------------------------
# Construction & validation des enregistrements
# ---------------------------------------------------------------------------
@dataclass
class BuildResult:
    records: list[dict] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


def build_records(
    today_df,
    proba_col: str = "probabilite",
    include_optional: bool = True,
    model_version: str = "xgb-enhanced-v1",
) -> BuildResult:
    """Transforme le DataFrame d'inférence en lignes prêtes pour l'upsert.

    `today_df` doit contenir : date, symbole, close, et une colonne de probabilité.
    Toute ligne incomplète est ignorée (et signalée), jamais poussée à moitié.
    """
    result = BuildResult()

    for _, row in today_df.iterrows():
        symbole = row.get("symbole")
        close = row.get("close")
        proba = row.get(proba_col)
        date_pred = row.get("date")

        # Symbole normalisé (on rejette None, NaN pandas, et chaînes vides/espaces).
        # Astuce : un NaN est le seul objet != à lui-même -> détecte NaN sans pandas.
        if symbole is None or symbole != symbole:
            symbole = ""
        else:
            symbole = str(symbole).strip()

        # --- Validation stricte : on n'envoie que des lignes saines ---------
        if not symbole or close is None or proba is None or date_pred is None:
            result.skipped.append(symbole or "<vide>")
            continue
        try:
            proba = float(proba)
            close = float(close)
        except (TypeError, ValueError):
            result.skipped.append(str(symbole))
            continue
        if not (0.0 <= proba <= 1.0) or close <= 0:
            result.skipped.append(str(symbole))
            continue

        # Normalisation de la date (accepte str, datetime ou Timestamp pandas)
        if hasattr(date_pred, "strftime"):
            d = date_pred
        else:
            d = datetime.fromisoformat(str(date_pred)[:10])
        date_str = d.strftime("%Y-%m-%d")
        target_str = (d + timedelta(days=HORIZON_JOURS)).strftime("%Y-%m-%d")

        record = {
            "date_prediction": date_str,
            "symbole": str(symbole),
            "prix_initial": round(close, 2),
            "probabilite_modele": round(proba, 4),
            "signal_emis": proba_to_signal(proba),
            "date_cible": target_str,
        }
        if include_optional:
            record.update(
                {
                    "score_sur_10": proba_to_score_10(proba),
                    "horizon_jours": HORIZON_JOURS,
                    "modele_version": model_version,
                }
            )
        result.records.append(record)

    return result


# ---------------------------------------------------------------------------
# Upsert robuste (batch + retry/backoff)
# ---------------------------------------------------------------------------
def _chunks(seq: list, size: int):
    for i in range(0, len(seq), size):
        yield seq[i: i + size]


def _is_schema_error(exc) -> bool:
    """Vrai si l'erreur vient d'une colonne absente / du schéma (donc PERMANENTE).

    Inutile de retenter ce type d'erreur : la table doit être migrée. On la
    distingue des erreurs TRANSITOIRES (timeout réseau, pic de charge) qui, elles,
    méritent un backoff.
    """
    s = str(exc).lower()
    return (
        "pgrst204" in s
        or "could not find" in s
        or "schema cache" in s
        or ("column" in s and ("does not exist" in s or "not find" in s))
        # Contrainte d'unicité absente pour l'ON CONFLICT (upsert) : DB à migrer.
        or "42p10" in s
        or "no unique or exclusion constraint" in s
    )


def upsert_records(records: list[dict]) -> int:
    """Envoie les enregistrements par lots, avec retries et backoff exponentiel.

    Retourne le nombre de lignes effectivement écrites/mises à jour.
    Lève la dernière exception si un lot échoue après MAX_RETRIES tentatives.
    """
    if not records:
        print("[UPSERT] Aucune ligne à écrire.")
        return 0

    written = 0
    for batch_no, batch in enumerate(_chunks(records, BATCH_SIZE), start=1):
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                supabase_client.table(TABLE).upsert(
                    batch, on_conflict=CONFLICT_KEYS
                ).execute()
                written += len(batch)
                print(f"[UPSERT] Lot {batch_no} OK ({len(batch)} lignes).")
                break
            except Exception as exc:  # noqa: BLE001 - on veut vraiment tout attraper ici
                # Erreur de schéma (colonne absente) = permanente -> échec immédiat,
                # on ne gaspille pas 30s de backoff pour rien.
                if _is_schema_error(exc):
                    print(f"[UPSERT] Lot {batch_no} : erreur de schéma non transitoire ({exc}).")
                    raise
                wait = 2 ** attempt  # 2s, 4s, 8s, 16s
                print(
                    f"[UPSERT] Lot {batch_no} échec tentative {attempt}/{MAX_RETRIES} "
                    f"({exc}). Nouvelle tentative dans {wait}s."
                )
                if attempt == MAX_RETRIES:
                    print(f"[UPSERT] Abandon du lot {batch_no} après {MAX_RETRIES} essais.")
                    raise
                time.sleep(wait)

    print(f"[UPSERT] Terminé : {written}/{len(records)} lignes écrites.")
    return written


def push_predictions(today_df, proba_col: str = "probabilite", **kwargs) -> int:
    """Point d'entrée haut niveau : construit, valide, puis upserte.

    À appeler depuis predict.py (ou depuis main.py) après l'inférence :

        from scripts.upsert_predictions import push_predictions
        push_predictions(today_data, proba_col="probabilite")
    """
    build = build_records(today_df, proba_col=proba_col, **kwargs)
    if build.skipped:
        print(f"[UPSERT] {len(build.skipped)} ligne(s) ignorée(s) (données invalides): "
              f"{', '.join(build.skipped[:10])}{'...' if len(build.skipped) > 10 else ''}")

    try:
        return upsert_records(build.records)
    except Exception as exc:  # noqa: BLE001
        # REPLI GRACIEUX : si des colonnes OPTIONNELLES manquent dans la table
        # (score_sur_10 / horizon_jours / modele_version), on réécrit SANS elles
        # pour que le job réussisse quand même. Les colonnes de base suffisent à
        # l'application. Pour CONSERVER ces colonnes, lancer _SQL_MIGRATION (ci-dessous).
        if _is_schema_error(exc) and kwargs.get("include_optional", True):
            print("[UPSERT] Colonnes optionnelles absentes de la table -> nouvel essai sans elles.")
            print("[UPSERT] Astuce : exécutez _SQL_MIGRATION dans Supabase pour garder "
                  "score_sur_10 / horizon_jours / modele_version.")
            kwargs["include_optional"] = False
            build = build_records(today_df, proba_col=proba_col, **kwargs)
            return upsert_records(build.records)
        raise


# ---------------------------------------------------------------------------
# SQL de référence (à exécuter une fois dans Supabase si besoin des colonnes+)
# ---------------------------------------------------------------------------
_SQL_MIGRATION = """
-- Colonnes optionnelles pour enrichir la table log_predictions :
alter table log_predictions add column if not exists score_sur_10   int;
alter table log_predictions add column if not exists horizon_jours  int;
alter table log_predictions add column if not exists modele_version text;

-- Contrainte d'unicité pour que l'upsert on_conflict fonctionne :
create unique index if not exists log_predictions_date_symbole_uidx
    on log_predictions (date_prediction, symbole);
"""


if __name__ == "__main__":
    # Petit auto-test hors-ligne : construit des enregistrements factices et
    # vérifie les dérivations métier sans toucher à Supabase.
    import pandas as pd

    demo = pd.DataFrame(
        {
            "date": ["2026-07-03", "2026-07-03", "2026-07-03"],
            "symbole": ["SGBC", " ", "ORAC"],  # 2e ligne volontairement invalide
            "close": [12500, 0, 3400],
            "probabilite": [0.82, 0.5, 0.61],
        }
    )
    res = build_records(demo)
    print("Records valides :", res.records)
    print("Ignorés :", res.skipped)
    print("SQL de migration disponible dans _SQL_MIGRATION.")
