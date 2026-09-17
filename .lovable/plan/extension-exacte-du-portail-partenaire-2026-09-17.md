# Extension exacte du Portail Partenaire

## Objectif
Aligner le portail existant sur les profils et noms de données demandés, sans modifier la stratégie patrimoniale ni son export.

## Modifications
1. **Profils métier**
   - Centraliser CGP, courtier par défaut, avocat, notaire, juriste et expert-comptable.
   - Appliquer exactement les périmètres, libellés, `famille` large (`montage` ou `financement`) et capacité de proposition demandés.
2. **Données**
   - Ajouter `decisions_partenaire.proposition_alternative` et `dossiers.montage_financier_propose`, tous deux facultatifs.
   - Reprendre les éventuelles valeurs de l’ancien champ `proposition` dans le nouveau champ, puis basculer les fonctions du portail sur le nouveau nom sans supprimer l’ancien champ.
   - Adapter le contenu du portail public, les validations serveur et le quitus figé aux nouvelles règles.
3. **Portail public**
   - Afficher les libellés propres au métier.
   - Exiger la proposition CGP sur invalidation dès 10 caractères.
   - Exiger la proposition courtier dès 50 caractères sur invalidation, et sur validation uniquement lorsque budget et capacité d’emprunt sont tous deux absents.
4. **Espace dossier**
   - Afficher séparément la contre-proposition.
   - Adoption CGP : archiver la stratégie courante sous `strategie_patrimoniale`, puis remplacer la stratégie.
   - Adoption courtier : écrire le texte dans `montage_financier_propose`.
   - Garder toute adoption manuelle et facultative.
5. **Notification**
   - Employer exactement la mention demandée lorsqu’une contre-proposition accompagne une invalidation.

## Validation
- Vérifier les six jeux de libellés et périmètres.
- Tester réellement une invalidation CGP, son affichage, son adoption et l’archive.
- Tester réellement un quitus courtier sur dossier sans budget ni capacité : blocage sous 50 caractères puis validation.
- Contrôler les données enregistrées, les notifications et TypeScript, puis supprimer les données temporaires.
