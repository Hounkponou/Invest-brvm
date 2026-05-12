# 📈 Projet ETL BRVM (Web Scraping & Automatisation Cloud)

Ce pipeline (Extract, Transform, Load) récupère les données de la Bourse Régionale des Valeurs Mobilières (BRVM), les nettoie, et les stocke dans Supabase en temps réel.

## 🚀 Architecture
- **Extraction** : Scraping HTTP via `requests` & `pandas`.
- **Transformation** : Nettoyage regex, gestion des types, formatage ISO.
- **Chargement** : Upsert PostgreSQL hébergé sur Supabase.
- **Automatisation** : Cron Jobs exécutés sur GitHub Actions.

## ⚙️ Déploiement
1. Configurer les variables `SUPABASE_URL` et `SUPABASE_KEY` (avec la clé `service_role`) dans `.env` (local) et dans GitHub Secrets (Cloud).
2. Pousser le code vers GitHub.
3. Le workflow `.github/workflows/scraper.yml` prendra automatiquement le relais.