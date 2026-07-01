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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      gi_custom_base_prices: {
        Row: {
          band_code: string
          base_price: number | null
          label_en: string
          sort_order: number
          top_size_code: string | null
        }
        Insert: {
          band_code: string
          base_price?: number | null
          label_en: string
          sort_order: number
          top_size_code?: string | null
        }
        Update: {
          band_code?: string
          base_price?: number | null
          label_en?: string
          sort_order?: number
          top_size_code?: string | null
        }
        Relationships: []
      }
      gi_embroidery_prices: {
        Row: {
          price_per_char: number
          thread: Database["public"]["Enums"]["gi_thread"]
        }
        Insert: {
          price_per_char: number
          thread: Database["public"]["Enums"]["gi_thread"]
        }
        Update: {
          price_per_char?: number
          thread?: Database["public"]["Enums"]["gi_thread"]
        }
        Relationships: []
      }
      gi_hem_prices: {
        Row: {
          kata_only: boolean
          part: Database["public"]["Enums"]["gi_part"]
          price: number
          thickness: Database["public"]["Enums"]["gi_hem_thickness"]
          width_cm: number
        }
        Insert: {
          kata_only: boolean
          part: Database["public"]["Enums"]["gi_part"]
          price: number
          thickness: Database["public"]["Enums"]["gi_hem_thickness"]
          width_cm: number
        }
        Update: {
          kata_only?: boolean
          part?: Database["public"]["Enums"]["gi_part"]
          price?: number
          thickness?: Database["public"]["Enums"]["gi_hem_thickness"]
          width_cm?: number
        }
        Relationships: []
      }
      gi_high_waist_prices: {
        Row: {
          max_cm: number
          min_cm: number
          price: number
        }
        Insert: {
          max_cm: number
          min_cm: number
          price: number
        }
        Update: {
          max_cm?: number
          min_cm?: number
          price?: number
        }
        Relationships: []
      }
      gi_models: {
        Row: {
          available_custom: boolean
          available_standard_normal: boolean
          available_standard_slim: boolean
          class: Database["public"]["Enums"]["gi_class"] | null
          material: string
          name_en: string
          name_ja: string
          slug: string
          sort_order: number
        }
        Insert: {
          available_custom: boolean
          available_standard_normal?: boolean
          available_standard_slim?: boolean
          class?: Database["public"]["Enums"]["gi_class"] | null
          material: string
          name_en: string
          name_ja: string
          slug: string
          sort_order: number
        }
        Update: {
          available_custom?: boolean
          available_standard_normal?: boolean
          available_standard_slim?: boolean
          class?: Database["public"]["Enums"]["gi_class"] | null
          material?: string
          name_en?: string
          name_ja?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      gi_options: {
        Row: {
          code: string
          kata_only: boolean
          name_en: string
          name_ja: string | null
          part: Database["public"]["Enums"]["gi_part"]
          price: number
          restrict_model_slug: string | null
          sort_order: number
        }
        Insert: {
          code: string
          kata_only?: boolean
          name_en: string
          name_ja?: string | null
          part: Database["public"]["Enums"]["gi_part"]
          price: number
          restrict_model_slug?: string | null
          sort_order: number
        }
        Update: {
          code?: string
          kata_only?: boolean
          name_en?: string
          name_ja?: string | null
          part?: Database["public"]["Enums"]["gi_part"]
          price?: number
          restrict_model_slug?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "gi_options_restrict_model_slug_fkey"
            columns: ["restrict_model_slug"]
            isOneToOne: false
            referencedRelation: "gi_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      gi_standard_prices: {
        Row: {
          fit: Database["public"]["Enums"]["gi_size_chart"]
          model_slug: string
          price: number
          size_code: string
        }
        Insert: {
          fit: Database["public"]["Enums"]["gi_size_chart"]
          model_slug: string
          price: number
          size_code: string
        }
        Update: {
          fit?: Database["public"]["Enums"]["gi_size_chart"]
          model_slug?: string
          price?: number
          size_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "gi_standard_prices_fit_size_code_fkey"
            columns: ["fit", "size_code"]
            isOneToOne: false
            referencedRelation: "size_charts"
            referencedColumns: ["chart", "size_code"]
          },
          {
            foreignKeyName: "gi_standard_prices_model_slug_fkey"
            columns: ["model_slug"]
            isOneToOne: false
            referencedRelation: "gi_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      labels: {
        Row: {
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          id: number
          name: string
          sort_order: number
        }
        Update: {
          id?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      obi_embroidery_prices: {
        Row: {
          price_per_char: number
          thread: Database["public"]["Enums"]["gi_thread"]
          width_cm: number
        }
        Insert: {
          price_per_char: number
          thread: Database["public"]["Enums"]["gi_thread"]
          width_cm: number
        }
        Update: {
          price_per_char?: number
          thread?: Database["public"]["Enums"]["gi_thread"]
          width_cm?: number
        }
        Relationships: []
      }
      obi_prices: {
        Row: {
          color: Database["public"]["Enums"]["obi_color"]
          material: Database["public"]["Enums"]["obi_material"]
          price: number | null
          size_code: number
          width_cm: number
        }
        Insert: {
          color: Database["public"]["Enums"]["obi_color"]
          material: Database["public"]["Enums"]["obi_material"]
          price?: number | null
          size_code: number
          width_cm: number
        }
        Update: {
          color?: Database["public"]["Enums"]["obi_color"]
          material?: Database["public"]["Enums"]["obi_material"]
          price?: number | null
          size_code?: number
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "obi_prices_size_code_fkey"
            columns: ["size_code"]
            isOneToOne: false
            referencedRelation: "obi_sizes"
            referencedColumns: ["size_code"]
          },
        ]
      }
      obi_sizes: {
        Row: {
          length_cm: number
          size_code: number
        }
        Insert: {
          length_cm: number
          size_code: number
        }
        Update: {
          length_cm?: number
          size_code?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["order_item_kind"]
          line_total_jpy: number
          order_id: string
          quantity: number
          title: string
          unit_price_jpy: number
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["order_item_kind"]
          line_total_jpy: number
          order_id: string
          quantity?: number
          title: string
          unit_price_jpy: number
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["order_item_kind"]
          line_total_jpy?: number
          order_id?: string
          quantity?: number
          title?: string
          unit_price_jpy?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_note: string | null
          customer_phone: string | null
          display_currency: Database["public"]["Enums"]["currency"]
          fx_rate_usd_jpy: number | null
          id: string
          order_number: number
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          production_status: Database["public"]["Enums"]["order_production_status"]
          shipping_address: Json
          shipping_status: Database["public"]["Enums"]["order_shipping_status"]
          total_jpy: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_note?: string | null
          customer_phone?: string | null
          display_currency?: Database["public"]["Enums"]["currency"]
          fx_rate_usd_jpy?: number | null
          id?: string
          order_number?: never
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          production_status?: Database["public"]["Enums"]["order_production_status"]
          shipping_address: Json
          shipping_status?: Database["public"]["Enums"]["order_shipping_status"]
          total_jpy: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string | null
          display_currency?: Database["public"]["Enums"]["currency"]
          fx_rate_usd_jpy?: number | null
          id?: string
          order_number?: never
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          production_status?: Database["public"]["Enums"]["order_production_status"]
          shipping_address?: Json
          shipping_status?: Database["public"]["Enums"]["order_shipping_status"]
          total_jpy?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          description: Json | null
          id: number
          name: Json
          options: Json | null
          price: number
          product_type: string | null
          slug: string
          stock: number
          subcategory: Database["public"]["Enums"]["product_subcategory"]
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          description?: Json | null
          id: number
          name: Json
          options?: Json | null
          price: number
          product_type?: string | null
          slug: string
          stock?: number
          subcategory: Database["public"]["Enums"]["product_subcategory"]
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          description?: Json | null
          id?: number
          name?: Json
          options?: Json | null
          price?: number
          product_type?: string | null
          slug?: string
          stock?: number
          subcategory?: Database["public"]["Enums"]["product_subcategory"]
        }
        Relationships: []
      }
      size_charts: {
        Row: {
          a: number
          b: number
          c: number
          chart: Database["public"]["Enums"]["gi_size_chart"]
          d: number
          e: number
          f: number
          g: number
          h: number
          i: number
          j: number
          size_code: string
          sort_order: number
        }
        Insert: {
          a: number
          b: number
          c: number
          chart: Database["public"]["Enums"]["gi_size_chart"]
          d: number
          e: number
          f: number
          g: number
          h: number
          i: number
          j: number
          size_code: string
          sort_order: number
        }
        Update: {
          a?: number
          b?: number
          c?: number
          chart?: Database["public"]["Enums"]["gi_size_chart"]
          d?: number
          e?: number
          f?: number
          g?: number
          h?: number
          i?: number
          j?: number
          size_code?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      currency: "JPY" | "USD"
      gi_class: "kata" | "kumite"
      gi_hem_thickness: "normal" | "thick" | "ultra"
      gi_part: "jacket" | "pants" | "both"
      gi_size_chart: "normal" | "slim"
      gi_thread: "standard" | "metallic"
      obi_color:
        | "black"
        | "blue"
        | "red"
        | "white"
        | "green"
        | "yellow"
        | "purple"
        | "orange"
        | "brown"
      obi_material: "nami" | "shushi" | "yohachi" | "silk"
      order_item_kind: "simple" | "gi_standard" | "gi_custom" | "obi"
      order_payment_status: "pending" | "paid" | "cancelled"
      order_production_status: "pending" | "in_production" | "ready"
      order_shipping_status: "pending" | "shipped" | "delivered"
      product_category: "equipment" | "accessories"
      product_subcategory:
        | "competition-equipment"
        | "referee-equipment"
        | "training-equipment"
        | "apparel"
        | "goods"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      currency: ["JPY", "USD"],
      gi_class: ["kata", "kumite"],
      gi_hem_thickness: ["normal", "thick", "ultra"],
      gi_part: ["jacket", "pants", "both"],
      gi_size_chart: ["normal", "slim"],
      gi_thread: ["standard", "metallic"],
      obi_color: [
        "black",
        "blue",
        "red",
        "white",
        "green",
        "yellow",
        "purple",
        "orange",
        "brown",
      ],
      obi_material: ["nami", "shushi", "yohachi", "silk"],
      order_item_kind: ["simple", "gi_standard", "gi_custom", "obi"],
      order_payment_status: ["pending", "paid", "cancelled"],
      order_production_status: ["pending", "in_production", "ready"],
      order_shipping_status: ["pending", "shipped", "delivered"],
      product_category: ["equipment", "accessories"],
      product_subcategory: [
        "competition-equipment",
        "referee-equipment",
        "training-equipment",
        "apparel",
        "goods",
      ],
    },
  },
} as const
