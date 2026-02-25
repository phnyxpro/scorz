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
          competition_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
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
      competitions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
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
      sub_events: {
        Row: {
          created_at: string
          end_time: string | null
          event_date: string | null
          id: string
          level_id: string
          location: string | null
          name: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          level_id: string
          location?: string | null
          name: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          level_id?: string
          location?: string | null
          name?: string
          start_time?: string | null
          status?: string
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
