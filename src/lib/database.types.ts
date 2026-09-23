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
      absolut_fix_progress: {
        Row: {
          done_at: string
          question_id: string
        }
        Insert: {
          done_at?: string
          question_id: string
        }
        Update: {
          done_at?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absolut_fix_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      assessment_lookup_attempts: {
        Row: {
          attempt_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
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
      blitz_rounds: {
        Row: {
          calendar_day: string
          coins_earned: number
          completed_at: string
          correct_count: number
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          calendar_day: string
          coins_earned: number
          completed_at?: string
          correct_count: number
          id?: string
          user_id: string
          xp_earned: number
        }
        Update: {
          calendar_day?: string
          coins_earned?: number
          completed_at?: string
          correct_count?: number
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      blitz_starts: {
        Row: {
          consumed: boolean
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          id?: string
          token?: string
          user_id: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          id?: string
          token?: string
          user_id?: string
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
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          part: number
          question_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          part: number
          question_ids: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
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
          assessment_id: string | null
          created_at: string
          ended_at: string | null
          excluded_from_grading: boolean
          id: string
          participant_name: string | null
          parts_selected: number[]
          results_json: Json
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          ended_at?: string | null
          excluded_from_grading?: boolean
          id?: string
          participant_name?: string | null
          parts_selected: number[]
          results_json?: Json
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          ended_at?: string | null
          excluded_from_grading?: boolean
          id?: string
          participant_name?: string | null
          parts_selected?: number[]
          results_json?: Json
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "graded_assessments"
            referencedColumns: ["id"]
          },
        ]
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
          subject_code: string | null
          topic_id: string | null
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
          subject_code?: string | null
          topic_id?: string | null
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
          subject_code?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      graded_assessments: {
        Row: {
          access_code: string
          closes_at: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          exam_set_id: string
          grading_scale: Json
          id: string
          max_attempts: number
          opens_at: string
          part: number
          question_ids_snapshot: string[] | null
          results_released_at: string | null
          shuffle: boolean
          status: string
          title: string
        }
        Insert: {
          access_code: string
          closes_at: string
          created_at?: string
          created_by?: string | null
          duration_minutes: number
          exam_set_id: string
          grading_scale: Json
          id?: string
          max_attempts?: number
          opens_at: string
          part: number
          question_ids_snapshot?: string[] | null
          results_released_at?: string | null
          shuffle?: boolean
          status?: string
          title: string
        }
        Update: {
          access_code?: string
          closes_at?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          exam_set_id?: string
          grading_scale?: Json
          id?: string
          max_attempts?: number
          opens_at?: string
          part?: number
          question_ids_snapshot?: string[] | null
          results_released_at?: string | null
          shuffle?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "graded_assessments_exam_set_id_fkey"
            columns: ["exam_set_id"]
            isOneToOne: false
            referencedRelation: "exam_question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      length_fix_progress: {
        Row: {
          done_at: string
          question_id: string
        }
        Insert: {
          done_at?: string
          question_id: string
        }
        Update: {
          done_at?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "length_fix_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_fix_progress: {
        Row: {
          done_at: string
          question_id: string
        }
        Insert: {
          done_at?: string
          question_id: string
        }
        Update: {
          done_at?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_fix_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coin_balance: number
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          last_session_date: string | null
          leaderboard_opt_out: boolean
          longest_streak: number
          pseudonym: string | null
          role: string
          show_real_name: boolean
          starter_coins: number | null
          starter_coins_seen: boolean
          total_xp: number
        }
        Insert: {
          coin_balance?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id: string
          last_session_date?: string | null
          leaderboard_opt_out?: boolean
          longest_streak?: number
          pseudonym?: string | null
          role?: string
          show_real_name?: boolean
          starter_coins?: number | null
          starter_coins_seen?: boolean
          total_xp?: number
        }
        Update: {
          coin_balance?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          last_session_date?: string | null
          leaderboard_opt_out?: boolean
          longest_streak?: number
          pseudonym?: string | null
          role?: string
          show_real_name?: boolean
          starter_coins?: number | null
          starter_coins_seen?: boolean
          total_xp?: number
        }
        Relationships: []
      }
      quality_fix_progress: {
        Row: {
          done_at: string
          note: string | null
          question_id: string
          run_key: string
        }
        Insert: {
          done_at?: string
          note?: string | null
          question_id: string
          run_key: string
        }
        Update: {
          done_at?: string
          note?: string | null
          question_id?: string
          run_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_fix_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
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
          quality_report: Json | null
          question_text: string
          status: string
          subject_code: string | null
          topic_id: string | null
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
          quality_report?: Json | null
          question_text: string
          status?: string
          subject_code?: string | null
          topic_id?: string | null
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
          quality_report?: Json | null
          question_text?: string
          status?: string
          subject_code?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_draft_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_draft_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      rewrite_progress: {
        Row: {
          done_at: string
          question_id: string
        }
        Insert: {
          done_at?: string
          question_id: string
        }
        Update: {
          done_at?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewrite_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      sq_player: {
        Row: {
          class_code: string
          created_at: string
          id: string
          nickname: string
          pin: string
          state: Json
          updated_at: string
        }
        Insert: {
          class_code: string
          created_at?: string
          id?: string
          nickname: string
          pin: string
          state?: Json
          updated_at?: string
        }
        Update: {
          class_code?: string
          created_at?: string
          id?: string
          nickname?: string
          pin?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sq_weekly: {
        Row: {
          case_id: string
          class_code: string
          created_at: string
          details: Json | null
          id: string
          max_score: number
          nickname: string
          score: number
          week: string
        }
        Insert: {
          case_id: string
          class_code: string
          created_at?: string
          details?: Json | null
          id?: string
          max_score: number
          nickname: string
          score: number
          week: string
        }
        Update: {
          case_id?: string
          class_code?: string
          created_at?: string
          details?: Json | null
          id?: string
          max_score?: number
          nickname?: string
          score?: number
          week?: string
        }
        Relationships: []
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
      user_shop_items: {
        Row: {
          id: string
          item_id: string
          price_paid: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          price_paid: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          price_paid?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shop_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_files: {
        Row: {
          created_at: string
          filename: string
          id: string
          item_id: string
          mime: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          item_id: string
          mime?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          item_id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wk_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_items: {
        Row: {
          created_at: string
          id: string
          script_name: string | null
          script_purged: boolean
          script_text: string | null
          settings: Json
          share_token: string | null
          shared_at: string | null
          title: string
          tool: string
          user_id: string
          yaml: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          script_name?: string | null
          script_purged?: boolean
          script_text?: string | null
          settings?: Json
          share_token?: string | null
          shared_at?: string | null
          title: string
          tool: string
          user_id: string
          yaml?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          script_name?: string | null
          script_purged?: boolean
          script_text?: string | null
          settings?: Json
          share_token?: string | null
          shared_at?: string | null
          title?: string
          tool?: string
          user_id?: string
          yaml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wk_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_tips: {
        Row: {
          antwort: string
          created_at: string
          frage: string
          id: string
          sort: number
          tool: string
          updated_at: string
        }
        Insert: {
          antwort: string
          created_at?: string
          frage: string
          id?: string
          sort?: number
          tool: string
          updated_at?: string
        }
        Update: {
          antwort?: string
          created_at?: string
          frage?: string
          id?: string
          sort?: number
          tool?: string
          updated_at?: string
        }
        Relationships: []
      }
      wk_users: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          kuerzel: string
          kuerzel_key: string | null
          last_login: string | null
          name: string | null
          pw_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          kuerzel: string
          kuerzel_key?: string | null
          last_login?: string | null
          name?: string | null
          pw_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          kuerzel?: string
          kuerzel_key?: string | null
          last_login?: string | null
          name?: string | null
          pw_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_pseudonym: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      purchase_shop_item: { Args: { p_item_id: string }; Returns: number }
      sq_leaderboard: {
        Args: { p_class: string; p_week: string }
        Returns: {
          max_score: number
          nickname: string
          played_at: string
          score: number
        }[]
      }
      sq_load: {
        Args: { p_class: string; p_nick: string; p_pin: string }
        Returns: Json
      }
      sq_login: {
        Args: { p_class: string; p_nick: string; p_pin: string }
        Returns: Json
      }
      sq_norm: { Args: { maxlen: number; txt: string }; Returns: string }
      sq_save: {
        Args: { p_class: string; p_nick: string; p_pin: string; p_state: Json }
        Returns: Json
      }
      sq_weekly_submit: {
        Args: {
          p_case: string
          p_class: string
          p_details: Json
          p_max: number
          p_nick: string
          p_pin: string
          p_score: number
          p_week: string
        }
        Returns: Json
      }
      wk_purge_alte_skripte: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
