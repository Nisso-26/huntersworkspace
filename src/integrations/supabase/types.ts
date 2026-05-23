export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      achats_deco: {
        Row: {
          chantier_id: string
          created_at: string
          date_commande: string | null
          date_livraison_estimee: string | null
          date_livraison_reelle: string | null
          designation: string
          fournisseur: string | null
          id: string
          lien_produit: string | null
          montant: number | null
          piece: string | null
          prix_unitaire: number | null
          quantite: number | null
          reference_produit: string | null
          statut_livraison: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          date_commande?: string | null
          date_livraison_estimee?: string | null
          date_livraison_reelle?: string | null
          designation: string
          fournisseur?: string | null
          id?: string
          lien_produit?: string | null
          montant?: number | null
          piece?: string | null
          prix_unitaire?: number | null
          quantite?: number | null
          reference_produit?: string | null
          statut_livraison?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          date_commande?: string | null
          date_livraison_estimee?: string | null
          date_livraison_reelle?: string | null
          designation?: string
          fournisseur?: string | null
          id?: string
          lien_produit?: string | null
          montant?: number | null
          piece?: string | null
          prix_unitaire?: number | null
          quantite?: number | null
          reference_produit?: string | null
          statut_livraison?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achats_deco_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      activites: {
        Row: {
          auteur_id: string
          commentaire: string
          created_at: string
          dossier_id: string
          id: string
          type: string
        }
        Insert: {
          auteur_id: string
          commentaire: string
          created_at?: string
          dossier_id: string
          id?: string
          type?: string
        }
        Update: {
          auteur_id?: string
          commentaire?: string
          created_at?: string
          dossier_id?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      alertes: {
        Row: {
          created_at: string
          detail: string | null
          dossier_id: string | null
          id: string
          is_read: boolean
          target_date: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          dossier_id?: string | null
          id?: string
          is_read?: boolean
          target_date?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          dossier_id?: string | null
          id?: string
          is_read?: boolean
          target_date?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertes_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      biens: {
        Row: {
          adresse: string | null
          budget_travaux: number | null
          code_postal: string | null
          created_at: string
          dossier_id: string | null
          frais_notaire: number | null
          id: string
          loyer_mensuel_cible: number | null
          mandataire_id: string | null
          notes: string | null
          prix_acquisition: number | null
          reference: string
          regime_fiscal: string | null
          statut: string
          surface: number | null
          type: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          budget_travaux?: number | null
          code_postal?: string | null
          created_at?: string
          dossier_id?: string | null
          frais_notaire?: number | null
          id?: string
          loyer_mensuel_cible?: number | null
          mandataire_id?: string | null
          notes?: string | null
          prix_acquisition?: number | null
          reference: string
          regime_fiscal?: string | null
          statut?: string
          surface?: number | null
          type?: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          budget_travaux?: number | null
          code_postal?: string | null
          created_at?: string
          dossier_id?: string | null
          frais_notaire?: number | null
          id?: string
          loyer_mensuel_cible?: number | null
          mandataire_id?: string | null
          notes?: string | null
          prix_acquisition?: number | null
          reference?: string
          regime_fiscal?: string | null
          statut?: string
          surface?: number | null
          type?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers: {
        Row: {
          bien_id: string | null
          budget_alloue: number | null
          created_at: string
          date_debut_prevue: string | null
          date_debut_reelle: string | null
          date_fin_prevue: string | null
          date_fin_reelle: string | null
          id: string
          mandataire_id: string | null
          notes: string | null
          reference: string
          statut: string
          updated_at: string
        }
        Insert: {
          bien_id?: string | null
          budget_alloue?: number | null
          created_at?: string
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          id?: string
          mandataire_id?: string | null
          notes?: string | null
          reference: string
          statut?: string
          updated_at?: string
        }
        Update: {
          bien_id?: string | null
          budget_alloue?: number | null
          created_at?: string
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          id?: string
          mandataire_id?: string | null
          notes?: string | null
          reference?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
        ]
      }
      client_comments: {
        Row: {
          content: string
          created_at: string
          dossier_id: string
          id: string
          token_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dossier_id: string
          id?: string
          token_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dossier_id?: string
          id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_comments_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_comments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "client_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tokens: {
        Row: {
          client_email: string | null
          client_name: string
          created_at: string
          created_by: string
          dossier_id: string
          expires_at: string
          id: string
          is_active: boolean
          last_relance_at: string | null
          last_viewed_at: string | null
          token: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          created_at?: string
          created_by: string
          dossier_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_relance_at?: string | null
          last_viewed_at?: string | null
          token?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          dossier_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_relance_at?: string | null
          last_viewed_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          created_at: string
          dossier_id: string | null
          id: string
          mandataire_id: string
          montant: number
          statut: string
          taux: number
          type: string
        }
        Insert: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          mandataire_id: string
          montant?: number
          statut?: string
          taux?: number
          type?: string
        }
        Update: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          mandataire_id?: string
          montant?: number
          statut?: string
          taux?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          adresse_siege: string | null
          assureur_police: string | null
          assureur_rcp: string | null
          bic: string | null
          capital_social: string | null
          carte_t_expiration: string | null
          carte_t_numero: string | null
          carte_t_organisme: string | null
          clause_mediation: string | null
          clause_retractation: string | null
          clause_rgpd: string | null
          couleur_primaire: string | null
          couleur_secondaire: string | null
          created_at: string | null
          delai_suspension_jours: number | null
          email_alertes_dirigeant: string | null
          email_contact: string | null
          entete_document: string | null
          forme_juridique: string | null
          frequence_rapport: string | null
          iban: string | null
          id: string
          logo_url: string | null
          mentions_legales: string | null
          numero_tva_intra: string | null
          periode_essai_jours: number | null
          pied_page_document: string | null
          raison_sociale: string | null
          rcs: string | null
          siret: string | null
          site_web: string | null
          tarif_abonnement_defaut: number | null
          taux_commission_siege: number | null
          telephone: string | null
          tva_taux_defaut: number | null
          updated_at: string | null
        }
        Insert: {
          adresse_siege?: string | null
          assureur_police?: string | null
          assureur_rcp?: string | null
          bic?: string | null
          capital_social?: string | null
          carte_t_expiration?: string | null
          carte_t_numero?: string | null
          carte_t_organisme?: string | null
          clause_mediation?: string | null
          clause_retractation?: string | null
          clause_rgpd?: string | null
          couleur_primaire?: string | null
          couleur_secondaire?: string | null
          created_at?: string | null
          delai_suspension_jours?: number | null
          email_alertes_dirigeant?: string | null
          email_contact?: string | null
          entete_document?: string | null
          forme_juridique?: string | null
          frequence_rapport?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          mentions_legales?: string | null
          numero_tva_intra?: string | null
          periode_essai_jours?: number | null
          pied_page_document?: string | null
          raison_sociale?: string | null
          rcs?: string | null
          siret?: string | null
          site_web?: string | null
          tarif_abonnement_defaut?: number | null
          taux_commission_siege?: number | null
          telephone?: string | null
          tva_taux_defaut?: number | null
          updated_at?: string | null
        }
        Update: {
          adresse_siege?: string | null
          assureur_police?: string | null
          assureur_rcp?: string | null
          bic?: string | null
          capital_social?: string | null
          carte_t_expiration?: string | null
          carte_t_numero?: string | null
          carte_t_organisme?: string | null
          clause_mediation?: string | null
          clause_retractation?: string | null
          clause_rgpd?: string | null
          couleur_primaire?: string | null
          couleur_secondaire?: string | null
          created_at?: string | null
          delai_suspension_jours?: number | null
          email_alertes_dirigeant?: string | null
          email_contact?: string | null
          entete_document?: string | null
          forme_juridique?: string | null
          frequence_rapport?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          mentions_legales?: string | null
          numero_tva_intra?: string | null
          periode_essai_jours?: number | null
          pied_page_document?: string | null
          raison_sociale?: string | null
          rcs?: string | null
          siret?: string | null
          site_web?: string | null
          tarif_abonnement_defaut?: number | null
          taux_commission_siege?: number | null
          telephone?: string | null
          tva_taux_defaut?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          dossier_id: string | null
          id: string
          last_message_at: string | null
          mandataire_id: string
          sujet: string
        }
        Insert: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          last_message_at?: string | null
          mandataire_id: string
          sujet?: string
        }
        Update: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          last_message_at?: string | null
          mandataire_id?: string
          sujet?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          dossier_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_generes: {
        Row: {
          conseiller_id: string | null
          created_at: string
          date_generation: string
          dossier_id: string
          id: string
          numero_dossier: string | null
          type: string
        }
        Insert: {
          conseiller_id?: string | null
          created_at?: string
          date_generation?: string
          dossier_id: string
          id?: string
          numero_dossier?: string | null
          type?: string
        }
        Update: {
          conseiller_id?: string | null
          created_at?: string
          date_generation?: string
          dossier_id?: string
          id?: string
          numero_dossier?: string | null
          type?: string
        }
        Relationships: []
      }
      documents_generiques: {
        Row: {
          contenu: Json | null
          created_at: string
          date_envoi: string | null
          date_generation: string
          dossier_id: string
          email_destinataire: string | null
          genere_par: string | null
          id: string
          modele_id: string | null
          numero_dossier: string | null
          statut: string
          titre: string | null
          type_export: string
        }
        Insert: {
          contenu?: Json | null
          created_at?: string
          date_envoi?: string | null
          date_generation?: string
          dossier_id: string
          email_destinataire?: string | null
          genere_par?: string | null
          id?: string
          modele_id?: string | null
          numero_dossier?: string | null
          statut?: string
          titre?: string | null
          type_export: string
        }
        Update: {
          contenu?: Json | null
          created_at?: string
          date_envoi?: string | null
          date_generation?: string
          dossier_id?: string
          email_destinataire?: string | null
          genere_par?: string | null
          id?: string
          modele_id?: string | null
          numero_dossier?: string | null
          statut?: string
          titre?: string | null
          type_export?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_generiques_modele_id_fkey"
            columns: ["modele_id"]
            isOneToOne: false
            referencedRelation: "modeles_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      dossiers: {
        Row: {
          ages_enfants: string | null
          anciennete_emploi: string | null
          appetence_risque: string | null
          apport_disponible: number | null
          assujetti_ifi: boolean | null
          autres_actifs: string | null
          autres_revenus: number | null
          aversion_gestion: string | null
          banque_principale: string | null
          biens_locatifs_existants: Json | null
          budget: number | null
          capacite_emprunt_estimee: number | null
          capacite_epargne_mensuelle: number | null
          charges_mensuelles_fixes: number | null
          client_name: string
          contraintes_geographiques: string | null
          contraintes_particulieres: string | null
          created_at: string
          credits_en_cours: Json | null
          date_naissance: string | null
          deficits_fonciers_existants: number | null
          deja_rencontre_banque: boolean | null
          delai_concretisation: string | null
          dispositifs_fiscaux_en_cours: string | null
          duree_credit_souhaitee: number | null
          email: string | null
          epargne_disponible: number | null
          epargne_financiere: Json | null
          etape: number | null
          grille_controle: Json | null
          grille_modifications: Json | null
          grille_statut: string | null
          grille_validee_at: string | null
          grille_validee_par: string | null
          honoraires: number | null
          horizon_investissement: string | null
          id: string
          impot_revenu_paye: number | null
          mandataire_id: string | null
          nationalite: string | null
          nombre_enfants: number | null
          notes: string | null
          numero_dossier: string | null
          objectif_fiscal: string | null
          objectif_principal: string | null
          passif_total: number | null
          phone: string | null
          preference_taux: string | null
          profession: string | null
          regime_matrimonial: string | null
          residence_principale: string | null
          residence_principale_crd: number | null
          residence_principale_valeur: number | null
          revenus_conjoint: number | null
          revenus_fiscaux_reference: number | null
          revenus_locatifs_existants: number | null
          revenus_nets_mensuels: number | null
          secteur_activite: string | null
          services_souscrits: Json | null
          situation_familiale: string | null
          source_recommandation: string | null
          status: string
          statut_professionnel: string | null
          strategie: string | null
          taux_endettement_actuel: number | null
          tmi: number | null
          type_accompagnement: string | null
          type_bien_souhaite: string | null
          type_location_souhaite: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          ages_enfants?: string | null
          anciennete_emploi?: string | null
          appetence_risque?: string | null
          apport_disponible?: number | null
          assujetti_ifi?: boolean | null
          autres_actifs?: string | null
          autres_revenus?: number | null
          aversion_gestion?: string | null
          banque_principale?: string | null
          biens_locatifs_existants?: Json | null
          budget?: number | null
          capacite_emprunt_estimee?: number | null
          capacite_epargne_mensuelle?: number | null
          charges_mensuelles_fixes?: number | null
          client_name: string
          contraintes_geographiques?: string | null
          contraintes_particulieres?: string | null
          created_at?: string
          credits_en_cours?: Json | null
          date_naissance?: string | null
          deficits_fonciers_existants?: number | null
          deja_rencontre_banque?: boolean | null
          delai_concretisation?: string | null
          dispositifs_fiscaux_en_cours?: string | null
          duree_credit_souhaitee?: number | null
          email?: string | null
          epargne_disponible?: number | null
          epargne_financiere?: Json | null
          etape?: number | null
          grille_controle?: Json | null
          grille_modifications?: Json | null
          grille_statut?: string | null
          grille_validee_at?: string | null
          grille_validee_par?: string | null
          honoraires?: number | null
          horizon_investissement?: string | null
          id?: string
          impot_revenu_paye?: number | null
          mandataire_id?: string | null
          nationalite?: string | null
          nombre_enfants?: number | null
          notes?: string | null
          numero_dossier?: string | null
          objectif_fiscal?: string | null
          objectif_principal?: string | null
          passif_total?: number | null
          phone?: string | null
          preference_taux?: string | null
          profession?: string | null
          regime_matrimonial?: string | null
          residence_principale?: string | null
          residence_principale_crd?: number | null
          residence_principale_valeur?: number | null
          revenus_conjoint?: number | null
          revenus_fiscaux_reference?: number | null
          revenus_locatifs_existants?: number | null
          revenus_nets_mensuels?: number | null
          secteur_activite?: string | null
          services_souscrits?: Json | null
          situation_familiale?: string | null
          source_recommandation?: string | null
          status?: string
          statut_professionnel?: string | null
          strategie?: string | null
          taux_endettement_actuel?: number | null
          tmi?: number | null
          type_accompagnement?: string | null
          type_bien_souhaite?: string | null
          type_location_souhaite?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          ages_enfants?: string | null
          anciennete_emploi?: string | null
          appetence_risque?: string | null
          apport_disponible?: number | null
          assujetti_ifi?: boolean | null
          autres_actifs?: string | null
          autres_revenus?: number | null
          aversion_gestion?: string | null
          banque_principale?: string | null
          biens_locatifs_existants?: Json | null
          budget?: number | null
          capacite_emprunt_estimee?: number | null
          capacite_epargne_mensuelle?: number | null
          charges_mensuelles_fixes?: number | null
          client_name?: string
          contraintes_geographiques?: string | null
          contraintes_particulieres?: string | null
          created_at?: string
          credits_en_cours?: Json | null
          date_naissance?: string | null
          deficits_fonciers_existants?: number | null
          deja_rencontre_banque?: boolean | null
          delai_concretisation?: string | null
          dispositifs_fiscaux_en_cours?: string | null
          duree_credit_souhaitee?: number | null
          email?: string | null
          epargne_disponible?: number | null
          epargne_financiere?: Json | null
          etape?: number | null
          grille_controle?: Json | null
          grille_modifications?: Json | null
          grille_statut?: string | null
          grille_validee_at?: string | null
          grille_validee_par?: string | null
          honoraires?: number | null
          horizon_investissement?: string | null
          id?: string
          impot_revenu_paye?: number | null
          mandataire_id?: string | null
          nationalite?: string | null
          nombre_enfants?: number | null
          notes?: string | null
          numero_dossier?: string | null
          objectif_fiscal?: string | null
          objectif_principal?: string | null
          passif_total?: number | null
          phone?: string | null
          preference_taux?: string | null
          profession?: string | null
          regime_matrimonial?: string | null
          residence_principale?: string | null
          residence_principale_crd?: number | null
          residence_principale_valeur?: number | null
          revenus_conjoint?: number | null
          revenus_fiscaux_reference?: number | null
          revenus_locatifs_existants?: number | null
          revenus_nets_mensuels?: number | null
          secteur_activite?: string | null
          services_souscrits?: Json | null
          situation_familiale?: string | null
          source_recommandation?: string | null
          status?: string
          statut_professionnel?: string | null
          strategie?: string | null
          taux_endettement_actuel?: number | null
          tmi?: number | null
          type_accompagnement?: string | null
          type_bien_souhaite?: string | null
          type_location_souhaite?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      evenements: {
        Row: {
          created_at: string | null
          date_debut: string
          date_fin: string
          dossier_id: string | null
          id: string
          is_reseau: boolean | null
          lieu: string | null
          mandataire_id: string
          notes: string | null
          rappel: string | null
          titre: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_debut: string
          date_fin: string
          dossier_id?: string | null
          id?: string
          is_reseau?: boolean | null
          lieu?: string | null
          mandataire_id: string
          notes?: string | null
          rappel?: string | null
          titre: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_debut?: string
          date_fin?: string
          dossier_id?: string | null
          id?: string
          is_reseau?: boolean | null
          lieu?: string | null
          mandataire_id?: string
          notes?: string | null
          rappel?: string | null
          titre?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evenements_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      factures: {
        Row: {
          client_name: string | null
          created_at: string
          date_echeance: string | null
          date_emission: string
          date_paiement: string | null
          dossier_client_name: string | null
          dossier_id: string | null
          id: string
          jalon_id: string | null
          lignes: Json | null
          mandataire_id: string | null
          mode_facturation: string | null
          montant: number
          montant_ttc: number | null
          numero_facture: string | null
          reference: string | null
          remise_montant: number | null
          remise_pct: number | null
          statut: string
          tva_taux: number | null
          type: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          dossier_client_name?: string | null
          dossier_id?: string | null
          id?: string
          jalon_id?: string | null
          lignes?: Json | null
          mandataire_id?: string | null
          mode_facturation?: string | null
          montant?: number
          montant_ttc?: number | null
          numero_facture?: string | null
          reference?: string | null
          remise_montant?: number | null
          remise_pct?: number | null
          statut?: string
          tva_taux?: number | null
          type?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          dossier_client_name?: string | null
          dossier_id?: string | null
          id?: string
          jalon_id?: string | null
          lignes?: Json | null
          mandataire_id?: string | null
          mode_facturation?: string | null
          montant?: number
          montant_ttc?: number | null
          numero_facture?: string | null
          reference?: string | null
          remise_montant?: number | null
          remise_pct?: number | null
          statut?: string
          tva_taux?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_statuts: {
        Row: {
          ancien_statut: string | null
          date_changement: string
          dossier_id: string
          id: string
          modifie_par: string | null
          nouveau_statut: string
        }
        Insert: {
          ancien_statut?: string | null
          date_changement?: string
          dossier_id: string
          id?: string
          modifie_par?: string | null
          nouveau_statut: string
        }
        Update: {
          ancien_statut?: string | null
          date_changement?: string
          dossier_id?: string
          id?: string
          modifie_par?: string | null
          nouveau_statut?: string
        }
        Relationships: []
      }
      honoraires_tranches: {
        Row: {
          created_at: string | null
          id: string
          montant_minimum: number | null
          ordre: number
          prix_max: number | null
          prix_min: number
          taux: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          montant_minimum?: number | null
          ordre?: number
          prix_max?: number | null
          prix_min?: number
          taux?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          montant_minimum?: number | null
          ordre?: number
          prix_max?: number | null
          prix_min?: number
          taux?: number
        }
        Relationships: []
      }
      jalons_facturation: {
        Row: {
          created_at: string
          dossier_id: string
          facture_id: string | null
          id: string
          libelle: string
          ordre: number
          pourcentage: number
          statut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          facture_id?: string | null
          id?: string
          libelle: string
          ordre?: number
          pourcentage?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          facture_id?: string | null
          id?: string
          libelle?: string
          ordre?: number
          pourcentage?: number
          statut?: string
          updated_at?: string
        }
        Relationships: []
      }
      lots_travaux: {
        Row: {
          artisan: string | null
          avancement: number | null
          chantier_id: string
          contact_artisan: string | null
          created_at: string
          date_prevue: string | null
          designation: string
          id: string
          montant_devis: number | null
          montant_engage: number | null
          montant_facture: number | null
          statut: string
        }
        Insert: {
          artisan?: string | null
          avancement?: number | null
          chantier_id: string
          contact_artisan?: string | null
          created_at?: string
          date_prevue?: string | null
          designation: string
          id?: string
          montant_devis?: number | null
          montant_engage?: number | null
          montant_facture?: number | null
          statut?: string
        }
        Update: {
          artisan?: string | null
          avancement?: number | null
          chantier_id?: string
          contact_artisan?: string | null
          created_at?: string
          date_prevue?: string | null
          designation?: string
          id?: string
          montant_devis?: number | null
          montant_engage?: number | null
          montant_facture?: number | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_travaux_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_documents: {
        Row: {
          actif: boolean
          categorie: string
          contenu_template: Json
          created_at: string
          id: string
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie: string
          contenu_template?: Json
          created_at?: string
          id?: string
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          contenu_template?: Json
          created_at?: string
          id?: string
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      partenaire_dossiers: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          partenaire_id: string
          role_dans_dossier: string | null
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          partenaire_id: string
          role_dans_dossier?: string | null
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          partenaire_id?: string
          role_dans_dossier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partenaire_dossiers_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partenaire_dossiers_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaires: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nom: string
          notes: string | null
          societe: string | null
          specialite: string
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          societe?: string | null
          specialite?: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          societe?: string | null
          specialite?: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      photos_chantier: {
        Row: {
          chantier_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          legende: string | null
          lot_id: string | null
          piece: string | null
          tag: string | null
          uploaded_by: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          legende?: string | null
          lot_id?: string | null
          piece?: string | null
          tag?: string | null
          uploaded_by?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          legende?: string | null
          lot_id?: string | null
          piece?: string | null
          tag?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_chantier_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots_travaux"
            referencedColumns: ["id"]
          },
        ]
      }
      photos_visite: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          legende: string | null
          visite_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          legende?: string | null
          visite_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          legende?: string | null
          visite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_visite_visite_id_fkey"
            columns: ["visite_id"]
            isOneToOne: false
            referencedRelation: "visites_chantier"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_entree: string | null
          email: string | null
          full_name: string | null
          iban: string | null
          id: string
          niveau: string | null
          pack_montant: number | null
          pack_status: string | null
          parrain_id: string | null
          status: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_entree?: string | null
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id: string
          niveau?: string | null
          pack_montant?: number | null
          pack_status?: string | null
          parrain_id?: string | null
          status?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_entree?: string | null
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          niveau?: string | null
          pack_montant?: number | null
          pack_status?: string | null
          parrain_id?: string | null
          status?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          budget_estime: number | null
          created_at: string
          dossier_id: string | null
          email: string | null
          id: string
          mandataire_id: string | null
          motif_perte: string | null
          nom: string
          notes: string | null
          objectif: string | null
          source: string | null
          statut: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          budget_estime?: number | null
          created_at?: string
          dossier_id?: string | null
          email?: string | null
          id?: string
          mandataire_id?: string | null
          motif_perte?: string | null
          nom: string
          notes?: string | null
          objectif?: string | null
          source?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          budget_estime?: number | null
          created_at?: string
          dossier_id?: string | null
          email?: string | null
          id?: string
          mandataire_id?: string | null
          motif_perte?: string | null
          nom?: string
          notes?: string | null
          objectif?: string | null
          source?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          section: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          section: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          section?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      signature_requests: {
        Row: {
          created_at: string
          created_by: string
          document_name: string
          document_type: string
          dossier_id: string
          id: string
          signed_at: string | null
          signed_document_path: string | null
          signer_email: string
          signer_name: string
          status: string
          updated_at: string
          yousign_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_name: string
          document_type?: string
          dossier_id: string
          id?: string
          signed_at?: string | null
          signed_document_path?: string | null
          signer_email: string
          signer_name: string
          status?: string
          updated_at?: string
          yousign_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_name?: string
          document_type?: string
          dossier_id?: string
          id?: string
          signed_at?: string | null
          signed_document_path?: string | null
          signer_email?: string
          signer_name?: string
          status?: string
          updated_at?: string
          yousign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifs_services: {
        Row: {
          created_at: string
          id: string
          label: string
          ordre: number
          service_key: string
          tarif_base: number
          tva_taux: number
          unite: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          ordre?: number
          service_key: string
          tarif_base?: number
          tva_taux?: number
          unite?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          ordre?: number
          service_key?: string
          tarif_base?: number
          tva_taux?: number
          unite?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visites_chantier: {
        Row: {
          chantier_id: string
          created_at: string
          created_by: string
          date_visite: string
          id: string
          observations: string | null
          personnes_presentes: string | null
          points_vigilance: string | null
          prochaines_actions: Json | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          created_by: string
          date_visite?: string
          id?: string
          observations?: string | null
          personnes_presentes?: string | null
          points_vigilance?: string | null
          prochaines_actions?: Json | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          created_by?: string
          date_visite?: string
          id?: string
          observations?: string | null
          personnes_presentes?: string | null
          points_vigilance?: string | null
          prochaines_actions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "visites_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dossier_has_active_token: {
        Args: { _dossier_id: string }
        Returns: boolean
      }
      get_dossier_for_portal: { Args: { _dossier_id: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "mandataire" | "decoratrice" | "analyste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "mandataire", "decoratrice", "analyste"],
    },
  },
} as const
