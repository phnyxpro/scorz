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
      activity_log: {
        Row: {
          actor_id: string | null
          competition_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          sub_event_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          competition_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          sub_event_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          competition_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          sub_event_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "audience_votes_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "public_contestants"
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
      chat_read_cursors: {
        Row: {
          competition_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_cursors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
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
      competition_credits: {
        Row: {
          competition_id: string | null
          created_at: string
          id: string
          purchased_at: string
          stripe_session_id: string | null
          tier_product_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          id?: string
          purchased_at?: string
          stripe_session_id?: string | null
          tier_product_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          id?: string
          purchased_at?: string
          stripe_session_id?: string | null
          tier_product_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_credits_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_infractions: {
        Row: {
          category: string
          competition_id: string
          created_at: string
          description: string | null
          id: string
          penalty_points: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          competition_id: string
          created_at?: string
          description?: string | null
          id?: string
          penalty_points?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          competition_id?: string
          created_at?: string
          description?: string | null
          id?: string
          penalty_points?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_infractions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
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
          active_scoring_level_id: string | null
          active_scoring_sub_event_id: string | null
          banner_url: string | null
          branding_accent_color: string | null
          branding_font: string | null
          branding_logo_url: string | null
          branding_primary_color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          rubric_content: string | null
          rubric_document_url: string | null
          rubric_scale_labels: Json
          rules_content: string | null
          rules_document_url: string | null
          rules_url: string | null
          scoring_method: string
          show_peoples_choice_to_contestants: boolean
          slug: string
          social_links: Json
          start_date: string | null
          status: string
          updated_at: string
          voting_enabled: boolean
          white_label: boolean
        }
        Insert: {
          active_scoring_level_id?: string | null
          active_scoring_sub_event_id?: string | null
          banner_url?: string | null
          branding_accent_color?: string | null
          branding_font?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          rubric_content?: string | null
          rubric_document_url?: string | null
          rubric_scale_labels?: Json
          rules_content?: string | null
          rules_document_url?: string | null
          rules_url?: string | null
          scoring_method?: string
          show_peoples_choice_to_contestants?: boolean
          slug: string
          social_links?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_enabled?: boolean
          white_label?: boolean
        }
        Update: {
          active_scoring_level_id?: string | null
          active_scoring_sub_event_id?: string | null
          banner_url?: string | null
          branding_accent_color?: string | null
          branding_font?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          rubric_content?: string | null
          rubric_document_url?: string | null
          rubric_scale_labels?: Json
          rules_content?: string | null
          rules_document_url?: string | null
          rules_url?: string | null
          scoring_method?: string
          show_peoples_choice_to_contestants?: boolean
          slug?: string
          social_links?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          voting_enabled?: boolean
          white_label?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "competitions_active_scoring_level_id_fkey"
            columns: ["active_scoring_level_id"]
            isOneToOne: false
            referencedRelation: "competition_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_active_scoring_sub_event_id_fkey"
            columns: ["active_scoring_sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
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
      event_messages: {
        Row: {
          competition_id: string
          content: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          competition_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          competition_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "event_messages"
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
            foreignKeyName: "judge_scores_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "public_contestants"
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
      performance_durations: {
        Row: {
          contestant_registration_id: string
          created_at: string
          duration_seconds: number
          id: string
          sub_event_id: string
          tabulator_id: string
          updated_at: string
        }
        Insert: {
          contestant_registration_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          sub_event_id: string
          tabulator_id: string
          updated_at?: string
        }
        Update: {
          contestant_registration_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          sub_event_id?: string
          tabulator_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_durations_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "contestant_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_durations_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "public_contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_durations_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
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
            foreignKeyName: "performance_slots_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "public_contestants"
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
      performance_timer_events: {
        Row: {
          contestant_registration_id: string
          created_at: string
          elapsed_seconds: number | null
          event_type: string
          id: string
          sub_event_id: string
          tabulator_id: string
        }
        Insert: {
          contestant_registration_id: string
          created_at?: string
          elapsed_seconds?: number | null
          event_type?: string
          id?: string
          sub_event_id: string
          tabulator_id: string
        }
        Update: {
          contestant_registration_id?: string
          created_at?: string
          elapsed_seconds?: number | null
          event_type?: string
          id?: string
          sub_event_id?: string
          tabulator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_timer_events_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "contestant_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_timer_events_contestant_registration_id_fkey"
            columns: ["contestant_registration_id"]
            isOneToOne: false
            referencedRelation: "public_contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_timer_events_sub_event_id_fkey"
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
          welcome_email_sent: boolean
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
          welcome_email_sent?: boolean
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
          welcome_email_sent?: boolean
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
          guidelines: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          weight_percent: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          description_1?: string
          description_2?: string
          description_3?: string
          description_4?: string
          description_5?: string
          guidelines?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          weight_percent?: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          description_1?: string
          description_2?: string
          description_3?: string
          description_4?: string
          description_5?: string
          guidelines?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          weight_percent?: number
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
      staff_invitation_sub_events: {
        Row: {
          created_at: string
          id: string
          staff_invitation_id: string
          sub_event_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          staff_invitation_id: string
          sub_event_id: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_invitation_id?: string
          sub_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitation_sub_events_staff_invitation_id_fkey"
            columns: ["staff_invitation_id"]
            isOneToOne: false
            referencedRelation: "staff_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitation_sub_events_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          competition_id: string
          created_at: string
          email: string
          id: string
          invited_at: string | null
          invited_by: string
          is_chief: boolean
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          competition_id: string
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          invited_by: string
          is_chief?: boolean
          name?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          competition_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string
          is_chief?: boolean
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sub_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_event_assignments: {
        Row: {
          created_at: string
          id: string
          is_chief: boolean
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_chief?: boolean
          role: Database["public"]["Enums"]["app_role"]
          sub_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_chief?: boolean
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
          comments_visible: boolean
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
          timer_visible: boolean
          updated_at: string
          voting_enabled: boolean
        }
        Insert: {
          banner_url?: string | null
          comments_visible?: boolean
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
          timer_visible?: boolean
          updated_at?: string
          voting_enabled?: boolean
        }
        Update: {
          banner_url?: string | null
          comments_visible?: boolean
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
          timer_visible?: boolean
          updated_at?: string
          voting_enabled?: boolean
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
      public_contestants: {
        Row: {
          age_category: string | null
          bio: string | null
          competition_id: string | null
          full_name: string | null
          id: string | null
          location: string | null
          performance_video_url: string | null
          profile_photo_url: string | null
          social_handles: Json | null
          sort_order: number | null
          status: string | null
          sub_event_id: string | null
          user_id: string | null
        }
        Insert: {
          age_category?: string | null
          bio?: string | null
          competition_id?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          performance_video_url?: string | null
          profile_photo_url?: string | null
          social_handles?: Json | null
          sort_order?: number | null
          status?: string | null
          sub_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          age_category?: string | null
          bio?: string | null
          competition_id?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          performance_video_url?: string | null
          profile_photo_url?: string | null
          social_handles?: Json | null
          sort_order?: number | null
          status?: string | null
          sub_event_id?: string | null
          user_id?: string | null
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
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_user_account: { Args: { _user_id: string }; Returns: undefined }
      get_assigned_competitions: {
        Args: { _user_id: string }
        Returns: {
          assignment_role: Database["public"]["Enums"]["app_role"]
          competition_banner_url: string
          competition_id: string
          competition_name: string
          competition_slug: string
          competition_status: string
          is_chief: boolean
          level_id: string
          level_name: string
          sub_event_id: string
          sub_event_name: string
        }[]
      }
      get_vote_counts: {
        Args: { _sub_event_id: string }
        Returns: {
          contestant_registration_id: string
          vote_count: number
        }[]
      }
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
      is_chief_for_sub_event: {
        Args: { _sub_event_id: string; _user_id: string }
        Returns: boolean
      }
      is_competition_staff: {
        Args: { _competition_id: string; _user_id: string }
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
