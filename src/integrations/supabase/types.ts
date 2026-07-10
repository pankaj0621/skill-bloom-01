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
      audit_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event: string
          id: string
          ip_address: string | null
          metadata: Json
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          kind: string
          room: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          kind: string
          room: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          kind?: string
          room?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
          votes_count: number
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: []
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_chat_settings: {
        Row: {
          disappear_seconds: number | null
          peer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          disappear_seconds?: number | null
          peer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          disappear_seconds?: number | null
          peer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_guidance_requests: {
        Row: {
          created_at: string
          helper_id: string | null
          id: string
          message: string
          response: string | null
          skill_id: string | null
          skill_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helper_id?: string | null
          id?: string
          message: string
          response?: string | null
          skill_id?: string | null
          skill_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          helper_id?: string | null
          id?: string
          message?: string
          response?: string | null
          skill_id?: string | null
          skill_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_guidance_requests_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_messages: {
        Row: {
          body: string
          created_at: string
          deleted_for_everyone: boolean
          deleted_for_user_ids: string[]
          disappear_seconds: number | null
          edited_at: string | null
          expires_at: string | null
          from_user_id: string
          id: string
          media_duration_ms: number | null
          media_kind: string | null
          media_mime: string | null
          media_name: string | null
          media_path: string | null
          media_size: number | null
          media_url: string | null
          read: boolean
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_user_ids?: string[]
          disappear_seconds?: number | null
          edited_at?: string | null
          expires_at?: string | null
          from_user_id: string
          id?: string
          media_duration_ms?: number | null
          media_kind?: string | null
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          media_size?: number | null
          media_url?: string | null
          read?: boolean
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_user_ids?: string[]
          disappear_seconds?: number | null
          edited_at?: string | null
          expires_at?: string | null
          from_user_id?: string
          id?: string
          media_duration_ms?: number | null
          media_kind?: string | null
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          media_size?: number | null
          media_url?: string | null
          read?: boolean
          to_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          college: string | null
          computed_level: string
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          is_suspended: boolean
          last_activity_date: string | null
          last_weekly_reset: string | null
          longest_streak: number
          primary_goal: string | null
          role: string | null
          stream: string | null
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          updated_at: string
          username: string | null
          username_changes: number
          weekly_xp: number
          xp: number
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          computed_level?: string
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id: string
          is_suspended?: boolean
          last_activity_date?: string | null
          last_weekly_reset?: string | null
          longest_streak?: number
          primary_goal?: string | null
          role?: string | null
          stream?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          username_changes?: number
          weekly_xp?: number
          xp?: number
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          computed_level?: string
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          last_activity_date?: string | null
          last_weekly_reset?: string | null
          longest_streak?: number
          primary_goal?: string | null
          role?: string | null
          stream?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          username_changes?: number
          weekly_xp?: number
          xp?: number
          year?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          report_type: string
          reported_content_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          report_type?: string
          reported_content_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          report_type?: string
          reported_content_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_tracks: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_default: boolean
          name: string
          stream: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          stream?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          stream?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          name: string
          order: number
          track_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          name: string
          order?: number
          track_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          name?: string
          order?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "skill_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_custom_skills: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_skills_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "skill_tracks"
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
      user_settings: {
        Row: {
          created_at: string
          id: string
          notify_badges: boolean
          notify_friend_requests: boolean
          notify_level_up: boolean
          notify_messages: boolean
          privacy_show_on_leaderboard: boolean
          privacy_show_profile: boolean
          privacy_show_progress: boolean
          privacy_show_streak: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_badges?: boolean
          notify_friend_requests?: boolean
          notify_level_up?: boolean
          notify_messages?: boolean
          privacy_show_on_leaderboard?: boolean
          privacy_show_profile?: boolean
          privacy_show_progress?: boolean
          privacy_show_streak?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_badges?: boolean
          notify_friend_requests?: boolean
          notify_level_up?: boolean
          notify_messages?: boolean
          privacy_show_on_leaderboard?: boolean
          privacy_show_profile?: boolean
          privacy_show_progress?: boolean
          privacy_show_streak?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_skill_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          skill_id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          skill_id: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          skill_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_progress_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_award_badges: { Args: never; Returns: string[] }
      cleanup_expired_peer_messages: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_record: { Args: { record_user_id: string }; Returns: boolean }
      mark_peer_messages_read: {
        Args: { _from: string; _to: string }
        Returns: number
      }
      mark_peer_messages_seen: { Args: { _ids: string[] }; Returns: number }
      merge_user_accounts: {
        Args: { new_id: string; old_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
