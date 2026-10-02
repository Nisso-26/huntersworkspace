# Ajouter trois contrats de signature et corriger les contenus ciblés

## Mise en œuvre
- Ajouter les trois types au sélecteur et au générateur de documents, avec les champs et textes contractuels fournis sans accents.
- Ajouter les blocs juridiques communs, le préremplissage dossier/bien/chantier et les calculs de TVA, qualification et barèmes existants.
- Transmettre au préremplissage le bien lié au dossier et son chantier le plus récent depuis l’écran d’envoi en signature.
- Remplacer uniquement les passages demandés dans le mandat, l’offre, la convention et le bon de commande.
- Étendre `parseBudget` aux tranches, bornes et valeurs abrégées, puis redéployer `receive-site-lead`.

## Vérification
- Contrôler les huit types de documents au typecheck.
- Tester les nouveaux cas de parsing du budget et vérifier le déploiement de la fonction.

## Détails techniques
- Les nouveaux contrats n’imprimeront ni la carte T ni la mention Hoguet.
- Les placeholders resteront visibles lorsque les données du dossier sont absentes.
- Aucun changement ne sera apporté au contrat mandataire ni aux autres flux.
