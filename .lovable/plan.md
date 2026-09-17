# Refonte du périmètre du Portail Partenaire

## Résultat attendu

Le portail adaptera automatiquement les informations visibles et les libellés de décision au métier du partenaire. Les CGP et courtiers pourront joindre une contre-proposition selon les règles demandées, sans modifier l’expiration, la révocation, le code de confirmation ni les statuts d’escalade existants.

## Mise en œuvre

1. **Centraliser les profils métier**
   - Remplacer les deux familles actuelles par les profils `cgp`, `courtier`, `avocat`, `notaire`, `juriste` et `expert_comptable`.
   - Appliquer les détections dans l’ordre le plus spécifique, avec `courtier` comme profil par défaut.
   - Centraliser pour chaque profil son périmètre, ses libellés de validation/invalidation et sa nature de validation afin que l’écran public et l’espace mandataire restent cohérents.
   - Hypothèse : bien que la demande annonce cinq profils, la liste en définit six ; les six seront pris en charge, avec un périmètre juridique-fiscal commun pour avocat, notaire, juriste et expert-comptable.

2. **Ajouter le périmètre juridique-fiscal restreint**
   - Ajouter `structure_juridique_fiscale` aux sections et libellés du portail et du PDF scopé.
   - N’y exposer que les champs familiaux, juridiques et fiscaux indiqués, ainsi que `strategie` et `type_accompagnement`.
   - Mettre à jour la fonction sécurisée qui construit le contenu public pour produire cette section et la compter parmi les sections incluses/exclues.

3. **Enregistrer et valider les contre-propositions**
   - Ajouter `proposition` nullable aux décisions partenaires.
   - Étendre la fonction de démarrage d’une décision pour enregistrer la proposition et imposer côté serveur les mêmes règles que l’interface : CGP sur invalidation, courtier sur invalidation, et courtier sur validation si budget ou capacité d’emprunt manquent.
   - Inclure les informations minimales nécessaires dans le contenu public pour déterminer cette règle sans exposer de nouvelles données sensibles.
   - Conserver strictement la confirmation à quatre caractères, la révocation automatique et les changements de sous-statut existants.

4. **Adapter l’écran public**
   - Afficher les libellés propres à chaque métier à la place de « Quitus / Invalidation ».
   - Afficher le champ CGP uniquement lors d’une invalidation, obligatoire dès 10 caractères.
   - Afficher le champ courtier avec le texte d’aide demandé ; minimum 50 caractères lorsque requis, visible mais facultatif sur une validation déjà chiffrée.
   - Reprendre la proposition dans l’étape de confirmation.

5. **Afficher et adopter côté mandataire**
   - Afficher toute proposition reçue avec son métier d’origine.
   - Pour une proposition CGP uniquement, ajouter « Adopter cette proposition » : archiver d’abord la stratégie courante dans `documents_generes`, puis remplacer la stratégie du dossier et confirmer par notification à l’écran.
   - Pour un courtier, conserver un affichage informatif sans bouton d’adoption.
   - Ajouter dans l’email d’invalidation la mention qu’une proposition est jointe lorsqu’elle existe, via le mécanisme d’envoi sécurisé déjà utilisé par l’application.

6. **Vérifier en conditions réelles**
   - Contrôler le périmètre et les libellés CGP, puis soumettre une invalidation avec proposition, l’adopter et vérifier l’archive et la nouvelle stratégie en base.
   - Contrôler un accès avocat : uniquement la structure juridique-fiscale et le projet, sans revenus ni épargne, avec « Validation juridique ».
   - Contrôler un accès courtier sur un dossier sans budget ou capacité renseignée : proposition obligatoire même lors de la validation.
   - Vérifier l’affichage sur ordinateur et mobile, les erreurs navigateur, puis lancer les contrôles TypeScript/tests ciblés.

## Détails techniques

- Migration additive uniquement : nouvelle colonne nullable et remplacement compatible des fonctions publiques existantes.
- Les contrôles métier seront effectués côté base en plus de l’interface publique, afin qu’ils ne puissent pas être contournés.
- Les règles d’accès existantes restent inchangées ; aucune nouvelle table n’est créée.
