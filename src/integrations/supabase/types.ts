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
      customers: {
        Row: {
          created_at: string
          email: string
          id: number
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name?: string
          phone?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          auth_user_id: string | null
          created_at: string | null
          driver_id: number
          heading: number | null
          id: number
          latitude: number
          longitude: number
          order_id: number | null
          speed: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          driver_id: number
          heading?: number | null
          id?: number
          latitude: number
          longitude: number
          order_id?: number | null
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          driver_id?: number
          heading?: number | null
          id?: number
          latitude?: number
          longitude?: number
          order_id?: number | null
          speed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          id: number
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          id?: number
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          id?: number
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          created_at: string
          customer_id: number
          customer_phone: string
          delivered_at: string | null
          driver_id: number | null
          id: number
          notes: string | null
          quantity: number
          status: string
          total_price: number
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          customer_id: number
          customer_phone: string
          delivered_at?: string | null
          driver_id?: number | null
          id?: number
          notes?: string | null
          quantity: number
          status?: string
          total_price: number
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_id?: number
          customer_phone?: string
          delivered_at?: string | null
          driver_id?: number | null
          id?: number
          notes?: string | null
          quantity?: number
          status?: string
          total_price?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      temp_auth_users: {
        Row: {
          created_at: string | null
          email: string
          name: string | null
          password: string | null
          phone: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          name?: string | null
          password?: string | null
          phone?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          name?: string | null
          password?: string | null
          phone?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      test_credentials: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string
          password: string
          phone: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          name: string
          password: string
          phone: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          password?: string
          phone?: string
          user_type?: string
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
      خبزك: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_auth_user_for_existing: {
        Args: {
          user_email: string
          user_name: string
          user_password: string
          user_phone: string
          user_type: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_driver_id_from_auth: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "driver" | "customer"
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
      app_role: ["admin", "driver", "customer"],
    },
  },
} as const
