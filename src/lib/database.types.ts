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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          object_id: string | null
          object_label: string | null
          object_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id?: string | null
          object_label?: string | null
          object_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id?: string | null
          object_label?: string | null
          object_type?: string
        }
        Relationships: []
      }
      answer_options: {
        Row: {
          display_order: number
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          display_order: number
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          display_order?: number
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          description: string
          icon: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      exam_parts: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exam_question_sets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          part: number
          question_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          part: number
          question_ids: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          part?: number
          question_ids?: string[]
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          parts_selected: number[]
          results_json: Json
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          parts_selected: number[]
          results_json?: Json
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          parts_selected?: number[]
          results_json?: Json
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          admin_id: string
          class_level: number | null
          created_at: string
          error_message: string | null
          file_path: string | null
          file_size_bytes: number
          filename: string
          id: string
          questions_generated: number | null
          status: string
        }
        Insert: {
          admin_id: string
          class_level?: number | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes: number
          filename: string
          id?: string
          questions_generated?: number | null
          status?: string
        }
        Update: {
          admin_id?: string
          class_level?: number | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number
          filename?: string
          id?: string
          questions_generated?: number | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          last_session_date: string | null
          leaderboard_opt_out: boolean
          longest_streak: number
          role: string
          total_xp: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id: string
          last_session_date?: string | null
          leaderboard_opt_out?: boolean
          longest_streak?: number
          role?: string
          total_xp?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          last_session_date?: string | null
          leaderboard_opt_out?: boolean
          longest_streak?: number
          role?: string
          total_xp?: number
        }
        Relationships: []
      }
      question_subjects: {
        Row: {
          question_id: string
          subject_id: string
        }
        Insert: {
          question_id: string
          subject_id: string
        }
        Update: {
          question_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_subjects_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          class_level: number | null
          created_at: string | null
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean
          question_text: string
          sample_answer: string | null
          topic_id: string | null
          type: string
        }
        Insert: {
          class_level?: number | null
          created_at?: string | null
          difficulty: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          question_text: string
          sample_answer?: string | null
          topic_id?: string | null
          type?: string
        }
        Update: {
          class_level?: number | null
          created_at?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          question_text?: string
          sample_answer?: string | null
          topic_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_draft: {
        Row: {
          class_level: number | null
          correct_index: number
          created_at: string
          difficulty: string | null
          expires_at: string
          explanation: string | null
          id: string
          job_id: string
          options: Json
          question_text: string
          status: string
          subject_code: string | null
        }
        Insert: {
          class_level?: number | null
          correct_index: number
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          explanation?: string | null
          id?: string
          job_id: string
          options: Json
          question_text: string
          status?: string
          subject_code?: string | null
        }
        Update: {
          class_level?: number | null
          correct_index?: number
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          explanation?: string | null
          id?: string
          job_id?: string
          options?: Json
          question_text?: string
          status?: string
          subject_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_draft_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
          session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string
          id: string
          score: number
          subject_id: string | null
          total: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          id?: string
          score: number
          subject_id?: string | null
          total: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          id?: string
          score?: number
          subject_id?: string | null
          total?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          color: string
          created_at: string | null
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          color: string
          created_at?: string | null
          description?: string | null
          icon_name: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          is_retroactive: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          is_retroactive?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          is_retroactive?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
