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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audience_votes: {
        Row: {
          contestant_registration_id: string
          created_at: string
          id: string
          sub_event_id: string
          ticket_number: string | null
          voter_email: string
          voter_name: string
          voter_phone: string | null
        }
        Insert: {
          contestant_registration_id: string
          created_at?: string
          id?: string
          sub_event_id: string
          ticket_number?: string | null
          voter_email: string
          voter_name: string
          voter_phone?: string | null
        }
        Update: {
          contestant_registration_id?: string
          created_at?: string
          id?: string
          sub_event_id?: string
          ticket_number?: string | null
          voter_email?: string
          voter_name?: string
          voter_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_votes_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "contestant_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_votes_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      chief_judge_certifications: {
        Row: {
          chief_judge_id: string
          chief_judge_signature: string | null
          created_at: string
          id: string
          is_certified: boolean
          penalty_adjustments: Json
          signed_at: string | null
          sub_event_id: string
          tie_break_criterion_id: string | null
          tie_break_notes: string | null
          updated_at: string
        }
        Insert: {
          chief_judge_id: string
          chief_judge_signature?: string | null
          created_at?: string
          id?: string
          is_certified?: boolean
          penalty_adjustments?: Json
          signed_at?: string | null
          sub_event_id: string
          tie_break_criterion_id?: string | null
          tie_break_notes?: string | null
          updated_at?: string
        }
        Update: {
          chief_judge_id?: string
          chief_judge_signature?: string | null
          created_at?: string
          id?: string
          is_certified?: boolean
          penalty_adjustments?: Json
          signed_at?: string | null
          sub_event_id?: string
          tie_break_criterion_id?: string | null
          tie_break_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chief_judge_certifications_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: true
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chief_judge_certifications_tie_break_criterion_id_fkey"
            columns: ["tie_break_criterion_id"]
            isOneToOne: false
            referencedRelation: "rubric_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_levels: {
        Row: {
          banner_url: string | null
          competition_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          competition_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_levels_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_sponsors: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          logo_url: string
          name: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          logo_url: string
          name: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_updates: {
        Row: {
          competition_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          competition_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          competition_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_updates_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          rules_url: string | null
          social_links: Json
          start_date: string | null
          status: string
          updated_at: string
          voting_enabled: boolean
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          rules_url?: string | null
          social_links?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_enabled?: boolean
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          rules_url?: string | null
          social_links?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_enabled?: boolean
        }
        Relationships: []
      }
      contestant_registrations: {
        Row: {
          age_category: string
          bio: string | null
          competition_id: string
          contestant_signature: string | null
          contestant_signed_at: string | null
          created_at: string
          email: string
          full_name: string
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_signature: string | null
          guardian_signed_at: string | null
          id: string
          location: string | null
          performance_video_url: string | null
          phone: string | null
          profile_photo_url: string | null
          rules_acknowledged: boolean
          rules_acknowledged_at: string | null
          social_handles: Json | null
          sort_order: number
          status: string
          sub_event_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_category?: string
          bio?: string | null
          competition_id: string
          contestant_signature?: string | null
          contestant_signed_at?: string | null
          created_at?: string
          email: string
          full_name: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_signature?: string | null
          guardian_signed_at?: string | null
          id?: string
          location?: string | null
          performance_video_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          rules_acknowledged?: boolean
          rules_acknowledged_at?: string | null
          social_handles?: Json | null
          sort_order?: number
          status?: string
          sub_event_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_category?: string
          bio?: string | null
          competition_id?: string
          contestant_signature?: string | null
          contestant_signed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_signature?: string | null
          guardian_signed_at?: string | null
          id?: string
          location?: string | null
          performance_video_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          rules_acknowledged?: boolean
          rules_acknowledged_at?: string | null
          social_handles?: Json | null
          sort_order?: number
          status?: string
          sub_event_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contestant_registrations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestant_registrations_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          checked_in_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_checked_in: boolean
          phone: string | null
          sub_event_id: string
          ticket_number: string
          ticket_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_checked_in?: boolean
          phone?: string | null
          sub_event_id: string
          ticket_number: string
          ticket_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_checked_in?: boolean
          phone?: string | null
          sub_event_id?: string
          ticket_number?: string
          ticket_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_scores: {
        Row: {
          comments: string | null
          contestant_registration_id: string
          created_at: string
          criterion_scores: Json
          final_score: number
          id: string
          is_certified: boolean
          judge_id: string
          judge_signature: string | null
          performance_duration_seconds: number | null
          raw_total: number
          signed_at: string | null
          sub_event_id: string
          time_penalty: number
          updated_at: string
        }
        Insert: {
          comments?: string | null
          contestant_registration_id: string
          created_at?: string
          criterion_scores?: Json
          final_score?: number
          id?: string
          is_certified?: boolean
          judge_id: string
          judge_signature?: string | null
          performance_duration_seconds?: number | null
          raw_total?: number
          signed_at?: string | null
          sub_event_id: string
          time_penalty?: number
          updated_at?: string
        }
        Update: {
          comments?: string | null
          contestant_registration_id?: string
          created_at?: string
          criterion_scores?: Json
          final_score?: number
          id?: string
          is_certified?: boolean
          judge_id?: string
          judge_signature?: string | null
          performance_duration_seconds?: number | null
          raw_total?: number
          signed_at?: string | null
          sub_event_id?: string
          time_penalty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "contestant_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_scores_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_rules: {
        Row: {
          competition_id: string
          created_at: string
          from_seconds: number
          grace_period_seconds: number
          id: string
          penalty_points: number
          sort_order: number
          time_limit_seconds: number
          to_seconds: number | null
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          from_seconds: number
          grace_period_seconds?: number
          id?: string
          penalty_points: number
          sort_order?: number
          time_limit_seconds?: number
          to_seconds?: number | null
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          from_seconds?: number
          grace_period_seconds?: number
          id?: string
          penalty_points?: number
          sort_order?: number
          time_limit_seconds?: number
          to_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_rules_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_slots: {
        Row: {
          contestant_registration_id: string | null
          created_at: string
          end_time: string
          id: string
          is_booked: boolean
          slot_index: number
          start_time: string
          sub_event_id: string
          updated_at: string
        }
        Insert: {
          contestant_registration_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_booked?: boolean
          slot_index?: number
          start_time: string
          sub_event_id: string
          updated_at?: string
        }
        Update: {
          contestant_registration_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_booked?: boolean
          slot_index?: number
          start_time?: string
          sub_event_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_slots_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "contestant_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_slots_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rubric_criteria: {
        Row: {
          competition_id: string
          created_at: string
          description_1: string
          description_2: string
          description_3: string
          description_4: string
          description_5: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          description_1?: string
          description_2?: string
          description_3?: string
          description_4?: string
          description_5?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          description_1?: string
          description_2?: string
          description_3?: string
          description_4?: string
          description_5?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_event_assignments: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sub_event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_event_assignments_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_events: {
        Row: {
          banner_url: string | null
          created_at: string
          end_time: string | null
          event_date: string | null
          id: string
          level_id: string
          location: string | null
          max_tickets: number | null
          name: string
          start_time: string | null
          status: string
          ticket_price: number | null
          ticketing_type: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          level_id: string
          location?: string | null
          max_tickets?: number | null
          name: string
          start_time?: string | null
          status?: string
          ticket_price?: number | null
          ticketing_type?: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          level_id?: string
          location?: string | null
          max_tickets?: number | null
          name?: string
          start_time?: string | null
          status?: string
          ticket_price?: number | null
          ticketing_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "competition_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      tabulator_certifications: {
        Row: {
          created_at: string
          digital_vs_physical_match: boolean
          discrepancy_notes: string | null
          id: string
          is_certified: boolean
          signed_at: string | null
          sub_event_id: string
          tabulator_id: string
          tabulator_signature: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          digital_vs_physical_match?: boolean
          discrepancy_notes?: string | null
          id?: string
          is_certified?: boolean
          signed_at?: string | null
          sub_event_id: string
          tabulator_id: string
          tabulator_signature?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          digital_vs_physical_match?: boolean
          discrepancy_notes?: string | null
          id?: string
          is_certified?: boolean
          signed_at?: string | null
          sub_event_id?: string
          tabulator_id?: string
          tabulator_signature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabulator_certifications_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: true
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
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
      witness_certifications: {
        Row: {
          created_at: string
          id: string
          is_certified: boolean
          observations: string | null
          signed_at: string | null
          sub_event_id: string
          updated_at: string
          witness_id: string
          witness_signature: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_certified?: boolean
          observations?: string | null
          signed_at?: string | null
          sub_event_id: string
          updated_at?: string
          witness_id: string
          witness_signature?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_certified?: boolean
          observations?: string | null
          signed_at?: string | null
          sub_event_id?: string
          updated_at?: string
          witness_id?: string
          witness_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "witness_certifications_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: true
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      app_role:
        | "admin"
        | "organizer"
        | "chief_judge"
        | "judge"
        | "tabulator"
        | "witness"
        | "contestant"
        | "audience"
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
      app_role: [
        "admin",
        "organizer",
        "chief_judge",
        "judge",
        "tabulator",
        "witness",
        "contestant",
        "audience",
      ],
    },
  },
} as const
