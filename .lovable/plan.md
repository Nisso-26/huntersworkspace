Trois modules majeurs à livrer en séquence. Chacun nécessite migrations DB + UI + logique métier. Je propose de les implémenter dans cet ordre pour respecter les dépendances (validations → conformité → pack mensuel).

## Module 1 — Workflow de validation directeur

**Base de données** (nouvelle migration)
- Table `validations_dossiers` : `dossier_id`, `statut` ('en_attente'|'valide'|'refuse'|'infos_demandees'), `decideur_id`, `motif`, `created_at`, `updated_at`
- RLS : super_admin lecture/écriture globale, mandataire lecture sur ses dossiers
- GRANTs authenticated + service_role
- Trigger : à l'insert d'un dossier avec `validation_directeur_requise=true`, créer ligne `validations_dossiers` statut `en_attente`
- Realtime activé sur la table
- Fonction `notify_mandataire_validation` (insère alerte côté mandataire)

**Côté Directeur**
- Hook `use-validations-dossiers.ts` (liste + mutations valider/refuser/demander_infos)
- Nouveau composant `src/components/ValidationsEnAttente.tsx` (carte fiche client + score + critères + boutons + dialog motif)
- Intégration dans `src/pages/Dashboard.tsx` section conditionnelle si `super_admin`
- Badge rouge compteur sur item Dashboard dans `src/components/AppSidebar.tsx`

**Côté Mandataire**
- Toast realtime via Supabase channel sur `validations_dossiers` (filtre mandataire_id du dossier)
- Si statut = `valide` → débloque devis (la condition `validation_directeur_requise` est déjà lue côté `DevisGenerator`)
- Si `refuse`/`infos_demandees` → bandeau dans `DossierDetail.tsx` avec motif

**Historique** : chaque décision → INSERT dans `activites` (auteur_id, type='validation', commentaire formaté)

## Module 2 — Conformité légale mandataires

**Base de données**
- Table `conformite_mandataires` : `mandataire_id`, `annee`, `heures_formation_annee` (numeric default 0), `justificatifs` (jsonb array), `statut_formation` (text), `attestation_debut` (date), `attestation_fin` (date), `statut_attestation` (text), `suspendu` (bool)
- Index unique (mandataire_id, annee)
- RLS : mandataire lit/édite ses heures+upload, super_admin tout
- Bucket storage `conformite-justificatifs` (privé)
- Trigger : recalcule `statut_formation` selon heures_formation_annee vs 14h
- Edge function planifiée `check-conformite` (alertes J-30 / J-60 / suspension 31/01) — implémentée mais cron à activer manuellement par l'utilisateur si souhaité

**UI**
- Hook `use-conformite.ts`
- Composant `src/components/mandataires/ConformiteTab.tsx` (formation ALUR + attestation + historique)
- Intégration `src/pages/Mandataires.tsx` : ajouter Tabs dans le `MandataireDetailDialog` ("Profil" | "Conformité")
- Dashboard Directeur : nouveau composant `ConformiteResume.tsx` (tableau 5 mandataires) inséré dans Dashboard pour super_admin

## Module 3 — Pack 149 € HT + facturation auto

**Modification UI**
- `src/components/parametres/ModeleEconomique.tsx` : default 149, mention « Exigible dès le 1er mois suivant la signature — sans franchise », ligne TTC 178,80 €

**Base de données**
- Mise à jour default `company_settings.tarif_abonnement_defaut` → 149
- Ajout colonne `profiles.suspendu` (bool default false) si absente
- Ajout colonne `factures.relance_etape` (smallint) pour suivre J+15/J+30/J+45
- Edge function planifiée `generate-monthly-packs` (existe déjà — à mettre à jour pour 149 + workflow non-paiement)
- Edge function `check-impayes-pack` (J+15 mise en demeure, J+30 suspendu=true, J+45 alerte résiliation)

**Fiche mandataire**
- Section « Pack mensuel » dans `ConformiteTab` ou onglet dédié : 12 derniers packs, solde dû en rouge, bouton « Marquer comme payé » pour admin
- Affiche flag `suspendu`

## Détails techniques

- Toutes les tables `public` : `CREATE TABLE → GRANT → ENABLE RLS → POLICY`
- Realtime : `ALTER PUBLICATION supabase_realtime ADD TABLE validations_dossiers`
- Edge functions : Deno + corsHeaders, validation Zod inputs, planning cron documenté pour l'utilisateur
- Notifications via table `alertes` existante + toast Sonner
- Couleurs Hunters #1A4D2E / #F5A800, semantic tokens uniquement, Montserrat

## Confirmation demandée

Vu l'ampleur (3 modules, ~6 migrations, ~10 nouveaux fichiers, 2-3 edge functions), je propose de **livrer module par module** avec validation entre chaque, plutôt que tout d'un coup. Confirmez-vous l'ordre 1→2→3 et le découpage, ou préférez-vous que je livre les 3 modules en une seule passe ?
