# Refonte de la vue d’ensemble du dossier

## Résultat attendu

Transformer la page dossier en une vue de pilotage plus claire, conforme à la charte HUNTERS V2.0, sans supprimer les fonctions ni les données existantes.

## Mise en page

- Recomposer l’en-tête autour du nom client, du numéro de dossier, du statut et des métadonnées utiles.
- Aligner les actions Exporter, Rapport de conseil et Enregistrer à droite ; conserver Supprimer comme action secondaire discrète.
- Passer la zone principale sur une composition bureau à deux colonnes : contenu du dossier à gauche, rail contextuel à droite.
- Sur mobile, placer le rail après le contenu et permettre de replier la liste des autres dossiers.
- Afficher le conseiller référent depuis le mandataire assigné au dossier, avec un repli neutre « HUNTERS Immobilier ».

## Progression du dossier

- Conserver la logique actuelle, les contrôles automatiques et les checklists détaillées.
- Ajouter une lecture synthétique en quatre macro-étapes :
  1. **Conseil** : qualification, contractualisation, analyse patrimoniale, présentation client.
  2. **Chasse** : chasse active.
  3. **Visites** : offre et négociation.
  4. **Signature** : AMO, décoration et closing selon les services souscrits.
- Représenter ces étapes par des losanges reliés, avec l’état et la sous-étape la plus avancée.
- Ajouter un bouton « Voir le détail » ouvrant les étapes disponibles et leurs checklists, sans retirer les interactions existantes.

## Synthèse du profil client

- Ajouter quatre cartes au début de l’onglet Informations : Situation, Capacité financière, Profil investisseur, Niveau et tarification.
- Utiliser uniquement les champs déjà présents dans la fiche dossier ; afficher un tiret lorsque l’information manque.
- Pour le niveau, appliquer strictement les seuils existants : Standard sous 3, Complexe de 3 à 5, Expert à partir de 6.
- N’afficher que le résultat et le tarif conseil recommandé ; ne montrer ni score brut, ni note sur 100, ni sous-score.
- Masquer initialement le formulaire détaillé derrière « Ouvrir le formulaire complet », tout en conservant son édition et son enregistrement actuels.

## Rail contextuel

- Lister les autres dossiers déjà accessibles par l’utilisateur via la source existante, avec client, numéro et statut.
- Permettre la navigation directe vers un autre dossier.
- Ajouter les trois prochaines échéances futures du dossier, triées par date, avec date, titre et type.
- Afficher le conseiller référent au bas du rail.

## Charte et conformité

- Reprendre les codes visuels du Portail Partenaire : surfaces sobres, filets fins, hiérarchie Marcellus/Jost et boutons du système existant.
- Utiliser uniquement les couleurs sémantiques du projet.
- Sur fond clair, employer `text-hunters-or`, relié à `--hunters-or-renforce` (#A87C25).
- Réserver `--hunters-or` (#C8962F) aux éléments décoratifs sur fond vert ou sombre.
- Corriger dans les composants touchés les valeurs de couleur codées en dur au profit des jetons existants.

## Vérification

- Vérifier la vue avec un dossier réel comportant une fiche renseignée et plusieurs événements.
- Contrôler sur ordinateur et mobile : en-tête, actions, frise macro, détail des étapes, quatre cartes, formulaire complet, navigation entre dossiers, échéances et conseiller référent.
- Vérifier visuellement qu’aucun texte doré sur fond clair n’utilise l’or laiton.
- Capturer les états principaux et contrôler l’absence d’erreurs visibles.

## Limites

- Aucun changement de base de données, de règles d’accès ou de logique métier hors présentation.
- Aucun changement dans les générateurs de documents, le portail partenaire, l’onboarding ou la stratégie.
