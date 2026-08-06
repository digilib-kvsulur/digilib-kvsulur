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
      book_club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "book_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_club_messages: {
        Row: {
          club_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_club_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "book_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_clubs: {
        Row: {
          book_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_clubs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_condemnations: {
        Row: {
          accession_number: string | null
          batch_id: string | null
          book_condition: string | null
          book_id: string | null
          book_title: string
          condemned_at: string
          condemned_by: string | null
          copies: number
          cost: number
          created_at: string
          date_became_unserviceable: string | null
          depreciation_amount: number
          discount_amount: number
          discount_pct: number
          fund_source: string | null
          id: string
          net_value: number
          notes: string | null
          rate: number
          reason: string
          year_of_purchase: number | null
        }
        Insert: {
          accession_number?: string | null
          batch_id?: string | null
          book_condition?: string | null
          book_id?: string | null
          book_title?: string
          condemned_at?: string
          condemned_by?: string | null
          copies?: number
          cost?: number
          created_at?: string
          date_became_unserviceable?: string | null
          depreciation_amount?: number
          discount_amount?: number
          discount_pct?: number
          fund_source?: string | null
          id?: string
          net_value?: number
          notes?: string | null
          rate?: number
          reason?: string
          year_of_purchase?: number | null
        }
        Update: {
          accession_number?: string | null
          batch_id?: string | null
          book_condition?: string | null
          book_id?: string | null
          book_title?: string
          condemned_at?: string
          condemned_by?: string | null
          copies?: number
          cost?: number
          created_at?: string
          date_became_unserviceable?: string | null
          depreciation_amount?: number
          discount_amount?: number
          discount_pct?: number
          fund_source?: string | null
          id?: string
          net_value?: number
          notes?: string | null
          rate?: number
          reason?: string
          year_of_purchase?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "book_condemnations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "condemnation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_condemnations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
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
      book_suggestions: {
        Row: {
          admin_note: string | null
          author: string | null
          created_at: string
          id: string
          reason: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          author?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          author?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
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
          accession_numbers: string[]
          author: string
          available_copies: number
          category: string | null
          class_level: string | null
          condemned_copies: number
          cover_url: string | null
          created_at: string
          cupboard_number: string | null
          description: string | null
          first_added_at: string | null
          id: string
          isbn: string | null
          issue_count: number
          language: string | null
          shelf_number: string | null
          subject: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          accession_number?: string | null
          accession_numbers?: string[]
          author: string
          available_copies?: number
          category?: string | null
          class_level?: string | null
          condemned_copies?: number
          cover_url?: string | null
          created_at?: string
          cupboard_number?: string | null
          description?: string | null
          first_added_at?: string | null
          id?: string
          isbn?: string | null
          issue_count?: number
          language?: string | null
          shelf_number?: string | null
          subject?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          accession_number?: string | null
          accession_numbers?: string[]
          author?: string
          available_copies?: number
          category?: string | null
          class_level?: string | null
          condemned_copies?: number
          cover_url?: string | null
          created_at?: string
          cupboard_number?: string | null
          description?: string | null
          first_added_at?: string | null
          id?: string
          isbn?: string | null
          issue_count?: number
          language?: string | null
          shelf_number?: string | null
          subject?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      cbse_curriculum: {
        Row: {
          category: string
          chapter_number: number | null
          chapter_title: string
          class_number: string
          created_at: string
          description: string | null
          file_url: string
          id: string
          subject: string
        }
        Insert: {
          category?: string
          chapter_number?: number | null
          chapter_title?: string
          class_number?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          subject?: string
        }
        Update: {
          category?: string
          chapter_number?: number | null
          chapter_title?: string
          class_number?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          subject?: string
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
      condemnation_batches: {
        Row: {
          batch_number: string
          created_at: string
          created_by: string | null
          fund_source: string
          id: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          created_by?: string | null
          fund_source?: string
          id?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          created_by?: string | null
          fund_source?: string
          id?: string
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
      event_submissions: {
        Row: {
          created_at: string
          day_number: number
          event_id: string
          file_type: string | null
          file_url: string | null
          id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          event_id: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          event_id?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "library_events"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_settings: {
        Row: {
          grace_period_days: number
          id: number
          rate_per_day: number
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
        }
        Insert: {
          grace_period_days?: number
          id?: number
          rate_per_day?: number
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Update: {
          grace_period_days?: number
          id?: number
          rate_per_day?: number
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Relationships: []
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
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
        }
        Relationships: []
      }
      issued_certificates: {
        Row: {
          description: string | null
          event_id: string | null
          id: string
          issued_at: string
          issued_by: string | null
          template_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          description?: string | null
          event_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          template_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          description?: string | null
          event_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          template_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issued_certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "library_events"
            referencedColumns: ["id"]
          },
        ]
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
          allow_submissions: boolean
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          image_orientation: string | null
          image_url: string | null
          is_published: boolean
          location: string | null
          max_submission_days: number
          registration_deadline: string | null
          schedule_files: string | null
          submission_deadline: string | null
          submission_types: string[]
          title: string
          updated_at: string
        }
        Insert: {
          allow_submissions?: boolean
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_submission_days?: number
          registration_deadline?: string | null
          schedule_files?: string | null
          submission_deadline?: string | null
          submission_types?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          allow_submissions?: boolean
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_submission_days?: number
          registration_deadline?: string | null
          schedule_files?: string | null
          submission_deadline?: string | null
          submission_types?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_fines: {
        Row: {
          book_issue_id: string | null
          book_title: string | null
          created_at: string
          days_overdue: number
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_ref: string | null
          rate_per_day: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_issue_id?: string | null
          book_title?: string | null
          created_at?: string
          days_overdue?: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          rate_per_day?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_issue_id?: string | null
          book_title?: string | null
          created_at?: string
          days_overdue?: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          rate_per_day?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_fines_book_issue_id_fkey"
            columns: ["book_issue_id"]
            isOneToOne: false
            referencedRelation: "book_issues"
            referencedColumns: ["id"]
          },
        ]
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
      lost_book_reports: {
        Row: {
          accession_number: string | null
          admin_note: string | null
          book_issue_id: string | null
          book_title: string
          id: string
          replacement_cost: number
          reported_at: string
          settled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          accession_number?: string | null
          admin_note?: string | null
          book_issue_id?: string | null
          book_title: string
          id?: string
          replacement_cost?: number
          reported_at?: string
          settled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          accession_number?: string | null
          admin_note?: string | null
          book_issue_id?: string | null
          book_title?: string
          id?: string
          replacement_cost?: number
          reported_at?: string
          settled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_book_reports_book_issue_id_fkey"
            columns: ["book_issue_id"]
            isOneToOne: false
            referencedRelation: "book_issues"
            referencedColumns: ["id"]
          },
        ]
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
      ncert_books: {
        Row: {
          book_name: string
          chapter_number: number | null
          chapter_title: string
          class_number: string
          created_at: string
          file_url: string
          id: string
          subject: string
        }
        Insert: {
          book_name?: string
          chapter_number?: number | null
          chapter_title?: string
          class_number: string
          created_at?: string
          file_url?: string
          id?: string
          subject: string
        }
        Update: {
          book_name?: string
          chapter_number?: number | null
          chapter_title?: string
          class_number?: string
          created_at?: string
          file_url?: string
          id?: string
          subject?: string
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
          action_link: string | null
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          message: string
          sent_by: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          action_link?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message: string
          sent_by?: string | null
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          action_link?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string
          sent_by?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      periodical_issues: {
        Row: {
          created_at: string
          id: string
          issue_date: string
          issue_number: string | null
          notes: string | null
          on_shelf: boolean
          periodical_id: string
          volume: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date: string
          issue_number?: string | null
          notes?: string | null
          on_shelf?: boolean
          periodical_id: string
          volume?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string
          issue_number?: string | null
          notes?: string | null
          on_shelf?: boolean
          periodical_id?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodical_issues_periodical_id_fkey"
            columns: ["periodical_id"]
            isOneToOne: false
            referencedRelation: "periodicals"
            referencedColumns: ["id"]
          },
        ]
      }
      periodicals: {
        Row: {
          created_at: string
          frequency: string | null
          id: string
          is_active: boolean
          publisher: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean
          publisher?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean
          publisher?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          post_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          post_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          post_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
          is_pinned: boolean
          media_type: string | null
          media_url: string | null
          pinned_at: string | null
          post_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          post_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          post_type?: string
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
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_approved: boolean
          last_name: string | null
          needs_profile_update: boolean
          phone: string | null
          points: number
          role: string
          roll_number: string | null
          streak_last_claimed: string | null
          student_class: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_approved?: boolean
          last_name?: string | null
          needs_profile_update?: boolean
          phone?: string | null
          points?: number
          role?: string
          roll_number?: string | null
          streak_last_claimed?: string | null
          student_class?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          admission_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean
          last_name?: string | null
          needs_profile_update?: boolean
          phone?: string | null
          points?: number
          role?: string
          roll_number?: string | null
          streak_last_claimed?: string | null
          student_class?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription_object: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_object: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription_object?: Json
          updated_at?: string
          user_id?: string
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
      reading_goals: {
        Row: {
          created_at: string
          id: string
          month: string
          target_books: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          target_books?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          target_books?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          book_author: string
          book_id: string | null
          book_title: string
          completed_date: string
          created_at: string
          id: string
          notes: string | null
          points_earned: number
          rating: number | null
          status: string
          user_id: string
        }
        Insert: {
          book_author: string
          book_id?: string | null
          book_title: string
          completed_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          rating?: number | null
          status?: string
          user_id: string
        }
        Update: {
          book_author?: string
          book_id?: string | null
          book_title?: string
          completed_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          rating?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
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
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          material_id: string | null
          material_title: string | null
          notes: string | null
          points_earned: number
          session_type: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          material_id?: string | null
          material_title?: string | null
          notes?: string | null
          points_earned?: number
          session_type?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          material_id?: string | null
          material_title?: string | null
          notes?: string | null
          points_earned?: number
          session_type?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_staff: boolean
          message: string
          sender_id: string | null
          sender_name: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message: string
          sender_id?: string | null
          sender_name?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          admission_number: string | null
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          email: string | null
          full_name: string
          id: string
          priority: string
          resolved_at: string | null
          role: string | null
          status: string
          student_class: string | null
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          admission_number?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          email?: string | null
          full_name: string
          id?: string
          priority?: string
          resolved_at?: string | null
          role?: string | null
          status?: string
          student_class?: string | null
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          admission_number?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          email?: string | null
          full_name?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          role?: string | null
          status?: string
          student_class?: string | null
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json | null
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
      approve_book_request: {
        Args: {
          p_admin_notes?: string
          p_due_date?: string
          p_request_id: string
        }
        Returns: string
      }
      approve_reading_entry: { Args: { p_reading_id: string }; Returns: number }
      check_and_award_badges: { Args: { p_user_id: string }; Returns: number }
      claim_streak_points: { Args: never; Returns: number }
      complete_study_session: {
        Args: {
          p_duration_seconds: number
          p_material_id: string
          p_material_title: string
          p_notes: string
          p_session_id: string
        }
        Returns: number
      }
      condemn_book: {
        Args: {
          p_book_id: string
          p_condition?: string
          p_copies: number
          p_notes?: string
          p_reason: string
        }
        Returns: string
      }
      condemn_book_v2: {
        Args: {
          p_accession_number: string
          p_batch_id: string
          p_book_id: string
          p_cost: number
          p_fund: string
          p_reason: string
          p_title: string
          p_year: number
        }
        Returns: string
      }
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
      get_available_accessions: {
        Args: { p_book_id: string }
        Returns: string[]
      }
      get_book_borrow_counts: {
        Args: never
        Returns: {
          book_id: string
          borrow_count: number
        }[]
      }
      get_books_issued_count: { Args: never; Returns: number }
      get_class_league: {
        Args: never
        Returns: {
          student_class: string
          student_count: number
          total_points: number
        }[]
      }
      get_distinct_book_filters: { Args: never; Returns: Json }
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
      get_public_posts_by_user: {
        Args: { _id: string; _limit?: number }
        Returns: {
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          title: string
        }[]
      }
      get_public_profile_full: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          bio: string
          first_name: string
          followers_count: number
          following_count: number
          friends_count: number
          id: string
          last_name: string
          points: number
          posts_count: number
          role: string
          student_class: string
          username: string
        }[]
      }
      get_public_profile_stats: {
        Args: { _id: string }
        Returns: {
          books_read: number
          current_streak: number
          longest_streak: number
          quizzes: number
        }[]
      }
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          points: number
          role: string
          student_class: string
          username: string
        }[]
      }
      get_reading_goal_progress: {
        Args: { p_month: string; p_user_id: string }
        Returns: {
          books_read: number
          target_books: number
        }[]
      }
      get_school_leaderboard_stats: {
        Args: never
        Returns: {
          average_points: number
          total_points: number
          total_students: number
        }[]
      }
      get_teacher_class_students: {
        Args: { p_class: string }
        Returns: {
          admission_number: string
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          points: number
          student_class: string
          username: string
        }[]
      }
      get_total_books_count: { Args: never; Returns: number }
      get_user_activity_stats: {
        Args: { _user_id: string }
        Returns: {
          books_issued: number
          comments_count: number
          friends_count: number
          posts_count: number
          reviews_count: number
        }[]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _uid: string }; Returns: boolean }
      issue_book_to_user: {
        Args: { p_book_id: string; p_issue_date?: string; p_user_id: string }
        Returns: string
      }
      link_my_support_tickets: { Args: never; Returns: number }
      lookup_member_by_admission: {
        Args: { p_admission: string }
        Returns: {
          full_name: string
          role: string
          student_class: string
        }[]
      }
      lookup_ticket_status: {
        Args: { p_admission: string; p_ticket_number: string }
        Returns: {
          admin_response: string
          category: string
          created_at: string
          id: string
          priority: string
          resolved_at: string
          status: string
          subject: string
          ticket_number: string
        }[]
      }
      notify_user: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      record_login_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
          total_login_days: number
        }[]
      }
      scrap_reading_entry: { Args: { p_reading_id: string }; Returns: number }
      search_public_profiles: {
        Args: { _exclude: string; _q: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
          points: number
          role: string
          student_class: string
          username: string
        }[]
      }
      send_due_soon_reminders: { Args: { p_days?: number }; Returns: number }
      submit_public_support_ticket: {
        Args: {
          p_admission: string
          p_category: string
          p_description: string
          p_email: string
          p_full_name: string
          p_priority: string
          p_role: string
          p_student_class: string
          p_subject: string
        }
        Returns: {
          id: string
          ticket_number: string
        }[]
      }
      sync_missing_auth_profiles: { Args: never; Returns: number }
      sync_overdue_fines: { Args: never; Returns: number }
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
