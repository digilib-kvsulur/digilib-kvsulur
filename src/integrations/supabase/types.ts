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
      badge_awards: {
        Row: {
          award_type: string
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          award_type?: string
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          award_type?: string
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          color: string | null
          created_at: string
          criteria_type: string | null
          criteria_value: number | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          points: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          points?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      book_audit_logs: {
        Row: {
          accession_number: string | null
          audited_at: string
          book_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          verified_by: string | null
        }
        Insert: {
          accession_number?: string | null
          audited_at?: string
          book_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          verified_by?: string | null
        }
        Update: {
          accession_number?: string | null
          audited_at?: string
          book_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_audit_logs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_audit_logs_verified_profile_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_issues: {
        Row: {
          accession_number: string | null
          book_id: string
          created_at: string
          due_date: string
          id: string
          issue_date: string
          renewal_count: number
          return_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          accession_number?: string | null
          book_id: string
          created_at?: string
          due_date: string
          id?: string
          issue_date?: string
          renewal_count?: number
          return_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          accession_number?: string | null
          book_id?: string
          created_at?: string
          due_date?: string
          id?: string
          issue_date?: string
          renewal_count?: number
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
          {
            foreignKeyName: "book_issues_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_renewals: {
        Row: {
          admin_note: string | null
          book_issue_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_days: number
          status: string
          student_note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          book_issue_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_days?: number
          status?: string
          student_note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          book_issue_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_days?: number
          status?: string
          student_note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_renewals_book_issue_id_fkey"
            columns: ["book_issue_id"]
            isOneToOne: false
            referencedRelation: "book_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_renewals_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_requests: {
        Row: {
          admin_notes: string | null
          book_id: string | null
          created_at: string
          id: string
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
          created_at?: string
          id?: string
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
          created_at?: string
          id?: string
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
      book_reservations: {
        Row: {
          book_id: string
          created_at: string
          fulfilled_at: string | null
          id: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reviews_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_wishlist: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_wishlist_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          accession_number: string | null
          author: string
          available_copies: number
          category: string | null
          class_level: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          first_added_at: string | null
          id: string
          isbn: string | null
          language: string | null
          subject: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          accession_number?: string | null
          author: string
          available_copies?: number
          category?: string | null
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          first_added_at?: string | null
          id?: string
          isbn?: string | null
          language?: string | null
          subject?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          accession_number?: string | null
          author?: string
          available_copies?: number
          category?: string | null
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          first_added_at?: string | null
          id?: string
          isbn?: string | null
          language?: string | null
          subject?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          is_claimed: boolean
          is_completed: boolean
          points_earned: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          points_earned?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          points_earned?: number
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
          class_level: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string
          id: string
          is_active: boolean
          reward_points: number
          target_value: number
          title: string
          type: string
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description: string
          id?: string
          is_active?: boolean
          reward_points?: number
          target_value?: number
          title: string
          type?: string
        }
        Update: {
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          id?: string
          is_active?: boolean
          reward_points?: number
          target_value?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      class_book_recommendations: {
        Row: {
          book_id: string
          class_level: string
          created_at: string
          id: string
          notes: string | null
          teacher_id: string | null
        }
        Insert: {
          book_id: string
          class_level: string
          created_at?: string
          id?: string
          notes?: string | null
          teacher_id?: string | null
        }
        Update: {
          book_id?: string
          class_level?: string
          created_at?: string
          id?: string
          notes?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_book_recommendations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      class_reading_lists: {
        Row: {
          books: Json
          class_level: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          books?: Json
          class_level: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          books?: Json
          class_level?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "library_events"
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
      levels: {
        Row: {
          color: string
          created_at: string
          description: string
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
          description?: string
          icon_name?: string
          id?: string
          level_number: number
          max_points?: number | null
          min_points?: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
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
      library_events: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          is_published: boolean
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          is_published?: boolean
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          is_published?: boolean
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_login_date: string | null
          longest_streak: number
          total_login_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          total_login_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          total_login_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_reading_goals: {
        Row: {
          created_at: string
          id: string
          month_year: string
          target_books: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          target_books?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          target_books?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sent_by: string
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sent_by: string
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sent_by?: string
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admission_number: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_approved: boolean
          last_name: string | null
          phone: string | null
          points: number
          role: string
          roll_number: string | null
          student_class: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_approved?: boolean
          last_name?: string | null
          phone?: string | null
          points?: number
          role?: string
          roll_number?: string | null
          student_class?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean
          last_name?: string | null
          phone?: string | null
          points?: number
          role?: string
          roll_number?: string | null
          student_class?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json | null
          completed_at: string
          id: string
          points_earned: number
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string
          id?: string
          points_earned?: number
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string
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
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          id: string
          is_active: boolean
          points_reward: number
          questions: Json
          subject: string
          time_limit: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          points_reward?: number
          questions?: Json
          subject?: string
          time_limit?: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
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
          completed_date?: string
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
      study_materials: {
        Row: {
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          student_class: string | null
          subject: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          student_class?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          student_class?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      find_user_by_identifier: {
        Args: { identifier: string }
        Returns: {
          email: string
          id: string
          is_approved: boolean
        }[]
      }
      get_active_quizzes_count: { Args: never; Returns: number }
      get_active_users_count: { Args: never; Returns: number }
      get_books_issued_count: { Args: never; Returns: number }
      get_leaderboard_data: {
        Args: { class_filter?: string }
        Returns: {
          first_name: string
          id: string
          points: number
          student_class: string
        }[]
      }
      get_profile_role: { Args: { _user_id: string }; Returns: string }
      get_total_books_count: { Args: never; Returns: number }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _uid: string }; Returns: boolean }
      record_login_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
          total_login_days: number
        }[]
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
