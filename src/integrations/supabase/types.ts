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
          id: string
          logo_url: string | null
          mentions_legales: string | null
          periode_essai_jours: number | null
          pied_page_document: string | null
          raison_sociale: string | null
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
          id?: string
          logo_url?: string | null
          mentions_legales?: string | null
          periode_essai_jours?: number | null
          pied_page_document?: string | null
          raison_sociale?: string | null
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
          id?: string
          logo_url?: string | null
          mentions_legales?: string | null
          periode_essai_jours?: number | null
          pied_page_document?: string | null
          raison_sociale?: string | null
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
      dossiers: {
        Row: {
          budget: number | null
          client_name: string
          created_at: string
          email: string | null
          etape: number | null
          honoraires: number | null
          id: string
          mandataire_id: string | null
          notes: string | null
          phone: string | null
          status: string
          strategie: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          budget?: number | null
          client_name: string
          created_at?: string
          email?: string | null
          etape?: number | null
          honoraires?: number | null
          id?: string
          mandataire_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          strategie?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          budget?: number | null
          client_name?: string
          created_at?: string
          email?: string | null
          etape?: number | null
          honoraires?: number | null
          id?: string
          mandataire_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          strategie?: string | null
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
          mandataire_id: string | null
          montant: number
          montant_ttc: number | null
          reference: string | null
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
          mandataire_id?: string | null
          montant?: number
          montant_ttc?: number | null
          reference?: string | null
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
          mandataire_id?: string | null
          montant?: number
          montant_ttc?: number | null
          reference?: string | null
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
      app_role: "super_admin" | "mandataire" | "decoratrice"
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
      app_role: ["super_admin", "mandataire", "decoratrice"],
    },
  },
} as const
