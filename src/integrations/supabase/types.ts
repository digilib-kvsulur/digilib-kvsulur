export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
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
      profiles: {
        Row: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_identifier: {
        Args: { identifier: string }
        Returns: {
          user_id: string
          email: string
          username: string
          phone: string
          is_approved: boolean
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
      get_total_books_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_class_rank: {
        Args: { user_class: string; user_points: number }
        Returns: number
      }
      update_challenge_progress: {
        Args: {
          p_user_id: string
          p_challenge_type: string
          p_increment?: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
