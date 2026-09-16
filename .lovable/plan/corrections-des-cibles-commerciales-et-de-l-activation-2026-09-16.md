# Corrections des cibles commerciales et de l’activation

## Résultat attendu
- Retirer entièrement les objectifs commerciaux de la validation contractuelle du parcours d’activation.
- Présenter les indicateurs trimestriels comme des cibles recommandées, sans modifier leur calcul ni leur affichage fonctionnel.
- Éliminer les montants de CA trimestriel codés en dur dans l’interface et les modèles générés par l’application.
- Alléger visuellement le rappel sur le tarif plein du conseil patrimonial.

## Mise en œuvre
1. Supprimer `accept_objectifs`, sa case et le bloc « Objectifs contractuels » du parcours d’activation ; conserver uniquement les trois validations encore requises pour activer le compte.
2. Reformuler le widget mandataire et le tableau réseau avec « cible trimestrielle recommandée » et des formulations non contraignantes.
3. Remplacer la valeur fixe de CA utilisée dans les variables de documents par la valeur N1/N2 issue des paramètres de l’entreprise, selon le niveau du mandataire ; conserver les données déjà calculées dynamiquement par le tableau de bord.
4. Transformer le rappel rouge du widget mandataire en bandeau ivoire discret, avec liseré fin et petite icône d’alerte.
5. Vérifier le tableau de bord mandataire sur ordinateur et mobile, puis contrôler que les trois cases restantes déverrouillent toujours « Activer mon compte ».

## Détails techniques
- Aucun changement aux calculs, données historiques ou colonnes de la base.
- Le document DOCX externe n’est pas régénéré.
- Les noms techniques existants des données restent inchangés ; seuls les textes visibles et les sources de valeurs affichées sont corrigés.
