
Objectif
- Revenir à un paiement qui “passe” (comme avant) tout en gardant l’ajout automatique des crédits dès que FedaPay confirme le paiement.
- Corriger la cause la plus probable de l’annulation côté FedaPay : notre intégration Checkout.js n’utilise pas exactement la forme recommandée par la doc (notamment `custom_id`), ce qui peut provoquer un échec “après saisie” du numéro.

Constat (à partir de votre retour + de la doc FedaPay)
- Vous payez sur **alheurejuste.fun**.
- L’échec arrive **après saisie** (donc le widget fonctionne, mais la transaction est annulée à l’étape de validation).
- La doc Checkout.js récente indique :
  - l’ajout de données personnalisées se fait via **`transaction.custom_metadata`** (et pas `custom_id`)
  - le callback `onComplete` est plutôt sous la forme **(reason, transaction)**, avec des constantes type `CHECKOUT_COMPLETED` / `DIALOG_DISMISSED` (pas forcément nos `CHECKOUT_COMPLETE` / `CHECKOUT_CANCELED`).
- Aujourd’hui, côté front, on envoie `transaction.custom_id = order.id` (champ très probablement non supporté dans Checkout.js), ce qui peut casser / invalider la création de transaction côté FedaPay.

Solution proposée (haut niveau)
1) Remplacer l’usage de `custom_id` par `custom_metadata` (standard Checkout.js).
2) Utiliser la méthode d’intégration Checkout.js la plus “officielle” : bouton (même caché) + attributs `data-transaction-*` et `data-customer-*` (au lieu d’essayer de tout passer dans l’objet JS au moment de `init`).
3) Adapter le webhook pour récupérer l’order_id depuis `transaction.custom_metadata.order_id` (et fallback si absent).
4) Ajouter du logging “diagnostic” (sans exposer de secrets) pour qu’on sache exactement ce que FedaPay renvoie quand ça échoue.

Détails d’implémentation (ce qui va changer)

A. Frontend — paiement FedaPay (src/components/CreditPurchaseDrawer.tsx)
- Objectif : ne plus passer `custom_id`, mais passer `custom_metadata.order_id`.
- Implémentation recommandée :
  1. Créer un bouton FedaPay “cible” (peut être invisible) avec un `ref`.
  2. Lui injecter dynamiquement des attributs HTML :
     - `data-transaction-amount="..."`
     - `data-transaction-description="Achat pack X crédits"`
     - `data-transaction-custom_metadata-order_id="UUID_COMMANDE"`
     - `data-customer-email="..."`
     - `data-customer-lastname="..."`
     - (optionnel mais utile) `data-customer-phone_number-country="TG"` + un champ phone si vous souhaitez le fournir
  3. Appeler `FedaPay.init('#idDuBouton', { public_key: 'pk_live_...', onComplete })` une seule fois (au montage du composant).
  4. Au clic “Payer maintenant” :
     - créer l’order `pending` dans `credit_orders` comme actuellement
     - mettre à jour les attributs du bouton caché (order_id, amount, etc.)
     - déclencher `.click()` sur ce bouton (ou `widget.open()` si on choisit la variante “event-based”, mais sans `custom_id`)

- Mise à jour de `onComplete` :
  - support des deux cas :
    - “paiement complété” (raison = CHECKOUT_COMPLETED/COMPLETED)
    - “dialog fermé / annulé” (DIALOG_DISMISSED)
  - afficher un message plus précis à l’utilisateur
  - ne pas dépendre du toast pour l’ajout de crédits : l’ajout reste 100% côté backend via webhook.

B. Webhook backend (supabase/functions/fedapay-webhook/index.ts)
- Objectif : retrouver l’order liée à la transaction de façon fiable.
- Nouvelle stratégie de liaison :
  1) Essayer de lire `transaction.custom_metadata.order_id` (ou variantes : `orderId`, `order_id`).
  2) Si absent (fallback robustesse) :
     - chercher la dernière commande `pending` correspondant à :
       - `amount == transaction.amount`
       - `user_email == transaction.customer.email` (si présent dans payload)
       - créée “récemment” (ex: 30 minutes)
     - en cas de multiples matchs, prendre la plus récente.
- Ensuite :
  - Si event success (`transaction.approved/completed/successful`) :
    - créditer `profiles.credits += order.credits`
    - marquer la commande `validated`
    - mettre dans `notes` un résumé : `FedaPay tx: <id> status: <status>`
  - Si event cancel (`transaction.canceled/declined/refunded`) :
    - marquer la commande `rejected`
    - mettre dans `notes` `last_error_code` si présent

C. Typages FedaPay (src/types/fedapay.d.ts)
- Mettre à jour les types pour refléter :
  - `transaction.custom_metadata?: Record<string, string | number | boolean>`
  - signature `onComplete?: (reason: any, transaction: any) => void` (au minimum, permissif)
  - constantes de reason : `CHECKOUT_COMPLETED` et `DIALOG_DISMISSED` (et conserver les anciennes si elles existent, en “optionnel”)

D. Vérifications côté FedaPay (sans code)
- Confirmer que **alheurejuste.fun** est bien autorisé pour Checkout.js dans FedaPay (Applications → Domain name to authorize).
- Vérifier dans les logs FedaPay si un `last_error_code` apparaît quand ça s’annule après saisie. Une fois le correctif `custom_metadata` déployé, ces logs deviennent beaucoup plus exploitables.

Plan de test (après implémentation)
1) Faire un paiement test (petit montant et aussi 2000) sur alheurejuste.fun.
2) Vérifier dans l’admin :
   - une ligne `credit_orders` passe de `pending` → `validated` automatiquement (sans action admin)
   - les crédits du profil augmentent
3) Si la transaction est annulée :
   - vérifier que `credit_orders` passe à `rejected` + `notes` contient un code utile
   - vérifier les logs du webhook (backend) pour voir si l’event “canceled/declined” arrive bien et contient un `last_error_code`

Risques / cas limites
- Si FedaPay ne renvoie pas `customer.email` dans le webhook, le fallback “match par email” ne suffira pas : on utilisera alors uniquement `custom_metadata.order_id` (d’où l’importance de le mettre correctement).
- Si certains opérateurs exigent des champs supplémentaires (prénom/nom/téléphone), on pourra ajouter un champ téléphone dans l’UI et passer `data-customer-phone_number-*`.

Livrables (fichiers impactés)
- src/components/CreditPurchaseDrawer.tsx (refactor intégration Checkout.js + custom_metadata)
- src/types/fedapay.d.ts (types alignés doc)
- supabase/functions/fedapay-webhook/index.ts (récupération order_id via custom_metadata + fallback)

Décision rapide à valider (fonctionnel)
- Voulez-vous remettre le pack “2 crédits” à 200 FCFA (comme avant) une fois que le paiement refonctionne, ou on garde 500/2000/5000 ?
