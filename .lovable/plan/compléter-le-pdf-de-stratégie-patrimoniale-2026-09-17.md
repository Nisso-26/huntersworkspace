# Compléter le PDF de stratégie patrimoniale

## Objectif
Enrichir uniquement le PDF de stratégie et son bouton d’export, sans modifier les autres parcours.

## Modifications prévues
- Remplacer la clause par défaut par le texte juridique validé, tout en conservant une clause personnalisée lorsqu’elle existe.
- Ajouter immédiatement après une mention systématique sur la validation par des professionnels partenaires.
- Ajouter avant ces deux encadrés une section conditionnelle « Risques et points de vigilance », alimentée par `strategie.points_attention`.
- Ajouter après le plan d’action une section « Critères de recherche du bien » avec la ville, les zones souhaitées, le type de bien, le budget et les contraintes géographiques disponibles sur le dossier.
- Transmettre le dossier depuis le bouton d’export de la stratégie afin que le PDF lise ces critères à leur source.

## Détails techniques
- Les nouvelles sections utiliseront les styles PDF existants : titre de section, listes ou lignes lisibles, encadrés ivoire, pagination via `ensureSpace`.
- Les champs absents ne créeront ni ligne vide ni section vide.
- L’ordre final sera : Plan d’action → Critères de recherche → Risques et vigilance → clause juridique → validation partenaires.
- Seuls `src/lib/export-strategie-pdf.ts` et le point d’appel dans `src/components/StrategieIA.tsx` seront modifiés.

## Vérification
- Contrôle TypeScript ciblé.
- Export réel depuis un dossier existant avec stratégie et critères renseignés.
- Inspection visuelle de toutes les pages du PDF pour vérifier l’ordre, la pagination, les coupures et la lisibilité des quatre ajouts.
