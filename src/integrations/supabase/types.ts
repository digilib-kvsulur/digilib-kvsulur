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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      book_issues: {
        Row: {
          book_id: string
          created_at: string | null
          due_date: string
          id: string
          issue_date: string
          return_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          due_date: string
          id?: string
          issue_date?: string
          return_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          issue_date?: string
          return_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_issues_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_requests: {
        Row: {
          admin_notes: string | null
          book_id: string | null
          created_at: string | null
          id: string
          requested_at: string
          requested_author: string | null
          requested_description: string | null
          requested_isbn: string | null
          requested_title: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          book_id?: string | null
          created_at?: string | null
          id?: string
          requested_at?: string
          requested_author?: string | null
          requested_description?: string | null
          requested_isbn?: string | null
          requested_title?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          book_id?: string | null
          created_at?: string | null
          id?: string
          requested_at?: string
          requested_author?: string | null
          requested_description?: string | null
          requested_isbn?: string | null
          requested_title?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          available_copies: number | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          isbn: string | null
          title: string
          total_copies: number | null
        }
        Insert: {
          author: string
          available_copies?: number | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          isbn?: string | null
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string
          available_copies?: number | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          isbn?: string | null
          title?: string
          total_copies?: number | null
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          points_earned: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          points_earned?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          points_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string | null
          created_by: string
          deadline: string | null
          description: string
          id: string
          is_active: boolean | null
          reward_points: number
          target_value: number
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          deadline?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          reward_points: number
          target_value: number
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          deadline?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          reward_points?: number
          target_value?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon_name: string
          id: string
          level_number: number
          max_points: number | null
          min_points: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          level_number: number
          max_points?: number | null
          min_points: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          level_number?: number
          max_points?: number | null
          min_points?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admission_number: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_approved: boolean | null
          last_name: string
          phone: string | null
          points: number | null
          role: string
          roll_number: string | null
          student_class: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          is_approved?: boolean | null
          last_name: string
          phone?: string | null
          points?: number | null
          role: string
          roll_number?: string | null
          student_class?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_approved?: boolean | null
          last_name?: string
          phone?: string | null
          points?: number | null
          role?: string
          roll_number?: string | null
          student_class?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          points_earned: number
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          id?: string
          points_earned: number
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          points_earned?: number
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          difficulty: string
          id: string
          is_active: boolean | null
          points_reward: number
          questions: Json
          subject: string
          time_limit: number
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty: string
          id?: string
          is_active?: boolean | null
          points_reward: number
          questions: Json
          subject: string
          time_limit: number
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean | null
          points_reward?: number
          questions?: Json
          subject?: string
          time_limit?: number
          title?: string
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          book_author: string
          book_title: string
          completed_date: string
          created_at: string
          id: string
          notes: string | null
          points_earned: number
          rating: number | null
          user_id: string
        }
        Insert: {
          book_author: string
          book_title: string
          completed_date: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          rating?: number | null
          user_id: string
        }
        Update: {
          book_author?: string
          book_title?: string
          completed_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_classmate: {
        Args: { target_class: string; target_user_id: string }
        Returns: boolean
      }
      find_user_by_identifier: {
        Args: { identifier: string }
        Returns: {
          email: string
          is_approved: boolean
          phone: string
          user_id: string
          username: string
        }[]
      }
      get_active_quizzes_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_active_users_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_books_issued_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_leaderboard_data: {
        Args: { class_filter?: string }
        Returns: {
          first_name: string
          id: string
          points: number
          student_class: string
        }[]
      }
      get_total_books_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_class_rank: {
        Args: { user_class: string; user_points: number }
        Returns: number
      }
      get_user_level: {
        Args: { user_points: number }
        Returns: {
          color: string
          description: string
          icon_name: string
          level_number: number
          max_points: number
          min_points: number
          name: string
          points_to_next: number
          progress_to_next: number
        }[]
      }
      is_user_staff: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_challenge_progress: {
        Args: {
          p_challenge_type: string
          p_increment?: number
          p_user_id: string
        }
        Returns: undefined
      }
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
