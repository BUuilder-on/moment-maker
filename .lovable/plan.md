

# Plan : Synchronisation automatique entre deux dépôts GitHub

## Contexte

Tu as actuellement :
- **Repo A** : Connecté à Lovable (reçoit les commits quand tu publies)
- **Repo B** : Connecté à Vercel (déclenche les déploiements)

L'objectif est de faire en sorte que chaque fois que du code arrive sur le Repo A, il soit automatiquement copié vers le Repo B.

---

## Étapes à suivre (à faire manuellement sur GitHub)

### Étape 1 : Créer un Personal Access Token (PAT)

1. Va sur **GitHub.com** → clique sur ton avatar → **Settings**
2. Dans le menu de gauche, descends jusqu'à **Developer settings**
3. Clique sur **Personal access tokens** → **Tokens (classic)**
4. Clique sur **Generate new token (classic)**
5. Donne un nom comme `sync-repos`
6. Coche les permissions :
   - `repo` (accès complet aux repositories)
7. Clique sur **Generate token**
8. **COPIE LE TOKEN** immédiatement (tu ne pourras plus le voir après)

---

### Étape 2 : Ajouter le token comme secret dans le Repo A

1. Va sur le **Repo A** (celui connecté à Lovable)
2. Clique sur **Settings** → **Secrets and variables** → **Actions**
3. Clique sur **New repository secret**
4. Nom : `TARGET_REPO_TOKEN`
5. Valeur : colle le token que tu as copié
6. Clique sur **Add secret**

---

### Étape 3 : Créer le fichier GitHub Action

Dans le **Repo A**, crée le fichier `.github/workflows/sync-to-vercel-repo.yml` avec ce contenu :

```yaml
name: Sync to Vercel Repository

on:
  push:
    branches:
      - main  # ou 'master' selon ta branche principale

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Push to target repo
        run: |
          git remote add target https://x-access-token:${{ secrets.TARGET_REPO_TOKEN }}@github.com/TON_USERNAME/NOM_DU_REPO_B.git
          git push target main:main --force
```

**Important** : Remplace dans le fichier :
- `TON_USERNAME` → le nom d'utilisateur GitHub du compte où est le Repo B
- `NOM_DU_REPO_B` → le nom exact du repository B
- `main` → par `master` si c'est le nom de ta branche principale

---

### Étape 4 : Tester la synchronisation

1. Fais un petit changement dans Lovable
2. Clique sur **Publish**
3. Va sur le **Repo A** → onglet **Actions**
4. Tu devrais voir le workflow s'exécuter
5. Une fois terminé, vérifie que le code est arrivé sur le **Repo B**
6. Vercel devrait automatiquement déployer

---

## Résumé visuel du flux

```text
┌─────────────┐      push       ┌──────────────┐
│   Lovable   │ ──────────────▶ │   Repo A     │
└─────────────┘                 │  (GitHub)    │
                                └──────┬───────┘
                                       │
                                       │ GitHub Action
                                       │ (sync automatique)
                                       ▼
                                ┌──────────────┐      auto-deploy    ┌──────────────┐
                                │   Repo B     │ ──────────────────▶ │    Vercel    │
                                │  (GitHub)    │                     │              │
                                └──────────────┘                     └──────────────┘
```

---

## Notes importantes

- Le `--force` dans la commande git écrase le contenu du Repo B avec celui du Repo A
- Si tu fais des modifications directement sur le Repo B, elles seront perdues à la prochaine sync
- Le workflow se déclenche uniquement sur les push vers la branche `main`

---

## Section technique

| Élément | Détail |
|---------|--------|
| Fichier à créer | `.github/workflows/sync-to-vercel-repo.yml` |
| Secret requis | `TARGET_REPO_TOKEN` (Personal Access Token) |
| Permissions token | `repo` (full control) |
| Déclencheur | Push sur branche main |

