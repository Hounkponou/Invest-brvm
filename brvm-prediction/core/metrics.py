"""
core/metrics.py
===============
Enregistrement de chaque exécution du pipeline dans la table `pipeline_runs`
(observabilité : historique des runs, durées, succès/échec, détails).

Robuste par conception : un souci d'écriture de métriques ne doit JAMAIS faire
échouer le pipeline lui-même -> toute erreur ici est avalée avec un simple log.
"""

from datetime import datetime, timezone

from core.config import supabase_client

TABLE = "pipeline_runs"


def record_run(task: str, status: str, detail: dict | None = None, duration_s: float | None = None):
    """Insère une ligne de run. `status` ∈ {'success','failed'}."""
    row = {
        "task": task,
        "status": status,
        "duration_s": round(float(duration_s), 1) if duration_s is not None else None,
        "detail": detail or {},
        "run_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        supabase_client.table(TABLE).insert(row).execute()
        print(f"[METRICS] run enregistré : {task} / {status} "
              f"({row['duration_s']}s)")
    except Exception as exc:  # noqa: BLE001 - jamais bloquant
        print(f"[METRICS] enregistrement ignoré ({exc}).")
