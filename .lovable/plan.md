
Objectif
- Te donner un workflow “prêt à copier-coller” qui force GitHub Actions à utiliser ton PAT (secret `TARGET_REPO_TOKEN`) et non les identifiants du bot `github-actions[bot]`, afin de corriger définitivement l’erreur 403.

Pourquoi ça persiste chez toi
- Ton message d’erreur prouve que, pendant le `git push`, Git réutilise encore une configuration d’auth du bot (souvent via `http.https://github.com/.extraheader`).
- Tu as déjà `persist-credentials: false` + unset en `--global`, mais parfois le header est enregistré en **local** (dans le repo cloné) et continue de s’appliquer.
- Solution: unset **global + local** + pousser en neutralisant l’extraheader **sur la commande de push**.

Ce que tu vas faire (copier-coller)
1) Ouvre le fichier:
- `.github/workflows/sync-to-vercel-repo.yml`

2) Remplace tout le contenu par ceci (copie-colle tel quel)

```yaml
name: Sync to Vercel Repository

on:
  push:
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Push to target repo
        run: |
          # 1) Enlever toute auth injectée par GitHub Actions (bot) - global + local
          git config --global --unset-all http.https://github.com/.extraheader || true
          git config --local  --unset-all http.https://github.com/.extraheader || true
          git config --unset-all http.https://github.com/.extraheader || true

          # 2) (re-run safe) reset du remote
          git remote remove target || true

          # 3) Remote avec PAT via secret (ne JAMAIS mettre le token en clair)
          git remote add target https://x-access-token:${{ secrets.TARGET_REPO_TOKEN }}@github.com/Basoka-10/moment-maker.git

          # 4) Push en neutralisant l'extraheader juste pour cette commande (anti-régression)
          git -c http.https://github.com/.extraheader= push target HEAD:main --force
```

Validation (à faire après)
1) Commit/push ce fichier dans Repo A.
2) Repo A → Actions → relance le workflow.
3) Résultat attendu: plus aucun “denied to github-actions[bot]”, et le repo B reçoit les commits.

Si ça échoue encore (diagnostic concret, sans blabla)
- Si tu vois encore “github-actions[bot]” dans l’erreur: ça veut dire qu’un autre endroit réinjecte l’auth. Dans ce cas, on ajoutera une sortie de diagnostic (temporaire) qui affiche l’origine de `extraheader` (sans afficher de token).
- Si l’erreur devient “Authentication failed” sans mention du bot: là, cette fois le PAT est bien utilisé, mais il est invalide/révoqué ou n’a pas les bons droits.

Rappel important (token: où le créer)
- Le token se crée dans le compte GitHub qui a accès en écriture au repo cible (Basoka-10), puis il est stocké en secret dans Repo A (Actions secret `TARGET_REPO_TOKEN`).
- Repo B n’a pas besoin de secret.
