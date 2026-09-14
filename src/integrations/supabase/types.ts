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
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          context: Json
          created_at: string
          id: string
          resource_id: string | null
          resource_type: string | null
          result: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          code: string
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_events: {
        Row: {
          action_taken: string | null
          context: Json
          created_at: string
          event_type: string
          id: string
          merchant_id: string | null
          reason: string | null
          risk: Database["public"]["Enums"]["risk_level"]
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          context?: Json
          created_at?: string
          event_type: string
          id?: string
          merchant_id?: string | null
          reason?: string | null
          risk?: Database["public"]["Enums"]["risk_level"]
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          context?: Json
          created_at?: string
          event_type?: string
          id?: string
          merchant_id?: string | null
          reason?: string | null
          risk?: Database["public"]["Enums"]["risk_level"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
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
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          created_at: string
          id: string
          min_xp: number
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_xp: number
          name: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_xp?: number
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      merchant_members: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_reviews: {
        Row: {
          author_name: string
          comment: string | null
          created_at: string
          id: string
          merchant_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_reviews_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          merchant_id: string
          plan: string
          status: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          merchant_id: string
          plan?: string
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          merchant_id?: string
          plan?: string
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          category_id: string | null
          city_id: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          opening_hours: Json
          owner_id: string
          phone: string | null
          photos: string[]
          status: Database["public"]["Enums"]["merchant_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          opening_hours?: Json
          owner_id: string
          phone?: string | null
          photos?: string[]
          status?: Database["public"]["Enums"]["merchant_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json
          owner_id?: string
          phone?: string | null
          photos?: string[]
          status?: Database["public"]["Enums"]["merchant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          merchant_id: string | null
          offer_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          merchant_id?: string | null
          offer_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          merchant_id?: string | null
          offer_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_favorites: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_redemptions: {
        Row: {
          created_at: string
          discount_label: string
          id: string
          merchant_id: string
          offer_id: string
          token_id: string
          user_id: string
          validated_by: string | null
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          discount_label: string
          id?: string
          merchant_id: string
          offer_id: string
          token_id: string
          user_id: string
          validated_by?: string | null
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          discount_label?: string
          id?: string
          merchant_id?: string
          offer_id?: string
          token_id?: string
          user_id?: string
          validated_by?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_redemptions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "redemption_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          discount_label: string
          ends_at: string
          id: string
          limit_count: number
          limit_type: Database["public"]["Enums"]["limit_type"]
          merchant_id: string
          photo_url: string | null
          starts_at: string
          status: Database["public"]["Enums"]["offer_status"]
          terms: string | null
          title: string
          updated_at: string
          views_count: number
          xp_reward: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_label: string
          ends_at: string
          id?: string
          limit_count?: number
          limit_type?: Database["public"]["Enums"]["limit_type"]
          merchant_id: string
          photo_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          title: string
          updated_at?: string
          views_count?: number
          xp_reward?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_label?: string
          ends_at?: string
          id?: string
          limit_count?: number
          limit_type?: Database["public"]["Enums"]["limit_type"]
          merchant_id?: string
          photo_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          title?: string
          updated_at?: string
          views_count?: number
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          redemption_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          redemption_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          redemption_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "offer_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          address_line1: string | null
          birth_date: string | null
          city_id: string | null
          city_name: string | null
          created_at: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          notify_new_offers: boolean
          phone: string | null
          phone_e164: string | null
          postal_code: string | null
          referral_code: string
          referred_by: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string
        }
        Insert: {
          accepted_terms_at?: string | null
          address_line1?: string | null
          birth_date?: string | null
          city_id?: string | null
          city_name?: string | null
          created_at?: string
          display_name?: string
          first_name?: string
          id: string
          last_name?: string
          notify_new_offers?: boolean
          phone?: string | null
          phone_e164?: string | null
          postal_code?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username: string
        }
        Update: {
          accepted_terms_at?: string | null
          address_line1?: string | null
          birth_date?: string | null
          city_id?: string | null
          city_name?: string | null
          created_at?: string
          display_name?: string
          first_name?: string
          id?: string
          last_name?: string
          notify_new_offers?: boolean
          phone?: string | null
          phone_e164?: string | null
          postal_code?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          offer_id: string
          token: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          offer_id: string
          token: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_tokens_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          code: string | null
          consumed_at: string | null
          consumed_by: string | null
          cost_points: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["reward_kind"]
          merchant_id: string | null
          reward_id: string
          reward_name: string
          shipping_info: Json
          status: Database["public"]["Enums"]["reward_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          consumed_at?: string | null
          consumed_by?: string | null
          cost_points: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["reward_kind"]
          merchant_id?: string | null
          reward_id: string
          reward_name: string
          shipping_info?: Json
          status: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          consumed_at?: string | null
          consumed_by?: string | null
          cost_points?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["reward_kind"]
          merchant_id?: string | null
          reward_id?: string
          reward_name?: string
          shipping_info?: Json
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost_points: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["reward_kind"]
          name: string
          stock: number | null
          updated_at: string
        }
        Insert: {
          cost_points: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["reward_kind"]
          name: string
          stock?: number | null
          updated_at?: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["reward_kind"]
          name?: string
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan: string | null
          status: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kind: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      admin_export_clients: {
        Args: never
        Returns: {
          address_line1: string
          city_name: string
          created_at: string
          email: string
          first_name: string
          last_name: string
          lifetime_points: number
          notify_new_offers: boolean
          phone: string
          points_balance: number
          postal_code: string
          status: string
          subscription_status: string
          user_id: string
          username: string
        }[]
      }
      admin_export_merchants: {
        Args: never
        Returns: {
          address: string
          category: string
          city: string
          created_at: string
          merchant_id: string
          merchant_name: string
          merchant_phone: string
          offers_count: number
          owner_email: string
          owner_first_name: string
          owner_last_name: string
          owner_phone: string
          redemptions_count: number
          status: string
          subscription_status: string
        }[]
      }
      admin_log_export: {
        Args: { _kind: string; _rows: number }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
      admin_set_reward_shipped: {
        Args: { _redemption_id: string }
        Returns: Json
      }
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      can_use_offer: {
        Args: { _offer_id: string; _user_id: string }
        Returns: boolean
      }
      create_redemption_token: {
        Args: { _offer_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      gen_short_code: { Args: { _len?: number }; Returns: string }
      get_lifetime_xp: { Args: { _user_id: string }; Returns: number }
      get_xp: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_merchant_member: {
        Args: { _merchant_id: string; _min_owner?: boolean }
        Returns: boolean
      }
      merchant_rating: {
        Args: { _merchant_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      my_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          from_user_id: string
          request_id: string
          username: string
        }[]
      }
      my_friends: {
        Args: never
        Returns: {
          display_name: string
          friend_id: string
          friendship_id: string
          level_name: string
          username: string
          xp: number
        }[]
      }
      my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      normalize_username: { Args: { _username: string }; Returns: string }
      redeem_reward: { Args: { _reward_id: string }; Returns: Json }
      remove_friend: { Args: { _friend_id: string }; Returns: Json }
      request_account_deletion: { Args: never; Returns: Json }
      respond_friend_request: {
        Args: { _accept: boolean; _request_id: string }
        Returns: Json
      }
      search_members: {
        Args: { _query: string }
        Returns: {
          display_name: string
          id: string
          username: string
        }[]
      }
      send_friend_request: { Args: { _username: string }; Returns: Json }
      signup_availability: {
        Args: { _phone: string; _username: string }
        Returns: Json
      }
      subscriptions_enforced: { Args: never; Returns: boolean }
      validate_redemption: { Args: { _token: string }; Returns: Json }
      validate_reward_coupon: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      account_status: "ACTIVE" | "SUSPENDED"
      app_role: "client" | "merchant" | "admin"
      friendship_status: "PENDING" | "ACCEPTED" | "DECLINED"
      limit_type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "UNLIMITED"
      member_role: "OWNER" | "MANAGER" | "STAFF"
      merchant_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"
      offer_status:
        | "DRAFT"
        | "PENDING_REVIEW"
        | "ACTIVE"
        | "PAUSED"
        | "EXPIRED"
        | "REJECTED"
      reward_kind: "COUPON" | "SHIPPED"
      reward_status:
        | "READY"
        | "USED"
        | "PENDING_SHIPMENT"
        | "SHIPPED"
        | "CANCELED"
      risk_level: "LOW" | "MEDIUM" | "HIGH"
      sub_status: "NONE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"
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
    Enums: {
      account_status: ["ACTIVE", "SUSPENDED"],
      app_role: ["client", "merchant", "admin"],
      friendship_status: ["PENDING", "ACCEPTED", "DECLINED"],
      limit_type: ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "UNLIMITED"],
      member_role: ["OWNER", "MANAGER", "STAFF"],
      merchant_status: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      offer_status: [
        "DRAFT",
        "PENDING_REVIEW",
        "ACTIVE",
        "PAUSED",
        "EXPIRED",
        "REJECTED",
      ],
      reward_kind: ["COUPON", "SHIPPED"],
      reward_status: [
        "READY",
        "USED",
        "PENDING_SHIPMENT",
        "SHIPPED",
        "CANCELED",
      ],
      risk_level: ["LOW", "MEDIUM", "HIGH"],
      sub_status: ["NONE", "ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"],
    },
  },
} as const
