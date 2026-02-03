
Objectif
- Corriger l’erreur 403 “Permission … denied to github-actions[bot]” dans le workflow de synchronisation Repo A → Repo B.
- Répondre à ta question : le token se “crée” sur le compte GitHub (Basoka-10), puis on le stocke en secret dans Repo A.

Constat (cause la plus probable)
- Ton YAML utilise bien l’URL avec `${{ secrets.TARGET_REPO_TOKEN }}`.
- Mais `actions/checkout@v4` configure par défaut des identifiants Git via le `GITHUB_TOKEN` (github-actions[bot]) en ajoutant un header Git (`http.https://github.com/.extraheader`).
- Du coup, au moment du `git push`, Git réutilise ces identifiants “github-actions[bot]” au lieu du PAT dans l’URL, et GitHub refuse l’accès au Repo B ⇒ 403.

Réponse à ta question (important)
- Le PAT (token Classic `ghp_...`) se génère dans le compte GitHub propriétaire (ici Basoka-10) : Settings → Developer settings → Personal access tokens.
- Ensuite, tu colles ce token dans Repo A (le repo source) comme Secret Actions : `TARGET_REPO_TOKEN`.
- Repo B n’a pas besoin de contenir le token dans ses secrets (c’est Repo A qui pousse vers Repo B).

Changements prévus (workflow)
1) Empêcher actions/checkout d’injecter les credentials “github-actions[bot]”
- Modifier l’étape checkout pour ajouter :
  - `persist-credentials: false`
- Effet : Git n’utilise plus automatiquement le GITHUB_TOKEN pour toutes les URLs GitHub, et ton `git push` utilisera le PAT.

2) (Option de sécurité supplémentaire) Nettoyer explicitement l’extraheader avant le push
- Dans l’étape “Push to target repo”, ajouter avant `git remote add` :
  - `git config --global --unset-all http.https://github.com/.extraheader || true`
- Effet : même si un header a été défini, on le retire pour forcer l’auth via PAT.

3) Rendre la commande idempotente
- Pour éviter l’erreur si le remote “target” existe déjà lors d’un re-run :
  - `git remote remove target || true`
  - puis `git remote add target ...`

Extrait cible (à appliquer dans .github/workflows/sync-to-vercel-repo.yml)
- Checkout :
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
      persist-credentials: false
- Push :
  - git config --global --unset-all http.https://github.com/.extraheader || true
  - git remote remove target || true
  - git remote add target https://x-access-token:${{ secrets.TARGET_REPO_TOKEN }}@github.com/Basoka-10/moment-maker.git
  - git push target main:main --force

Validation (à tester end-to-end)
1) Repo A → Actions → relancer le workflow.
2) Vérifier que les logs ne mentionnent plus “denied to github-actions[bot]”.
3) Vérifier qu’un nouveau commit apparaît bien dans Repo B.
4) Vérifier que Vercel déclenche bien le déploiement.

Plan B si ça échoue encore (diagnostic rapide)
- Vérifier que le secret `TARGET_REPO_TOKEN` existe bien dans Repo A (Actions secrets) et qu’il a été mis à jour avec le dernier token généré.
- Vérifier que le token a bien le scope `repo`.
- Vérifier que Repo B n’a pas été transféré/renommé (l’URL doit être exacte).

Idées de suites (optionnel)
- Tester la sync end-to-end après chaque changement (Repo A → Repo B → Vercel).
- Remplacer le `--force` par un push “normal” si tu veux éviter d’écraser l’historique de Repo B.
- Ajouter une étape qui affiche `git remote -v` et `git status` (sans exposer le token) pour faciliter le debug.
- Ajouter une protection “si le workflow vient d’un PR, ne pas sync” (pour éviter des push inattendus).
