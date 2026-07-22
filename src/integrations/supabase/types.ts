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
      categorias: {
        Row: {
          categoria: string
          created_at: string
          frecuencia_seguimiento: string | null
          id: string
          is_sample: boolean | null
          seguimiento_pago: boolean
          subcategoria: string
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          frecuencia_seguimiento?: string | null
          id?: string
          is_sample?: boolean | null
          seguimiento_pago?: boolean
          subcategoria: string
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          frecuencia_seguimiento?: string | null
          id?: string
          is_sample?: boolean | null
          seguimiento_pago?: boolean
          subcategoria?: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classification_rules: {
        Row: {
          active: boolean
          amount_max: number | null
          amount_min: number | null
          category_id: string
          created_at: string
          cuenta_id: string | null
          id: string
          keyword: string
          match_type: string
          name: string | null
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount_max?: number | null
          amount_min?: number | null
          category_id: string
          created_at?: string
          cuenta_id?: string | null
          id?: string
          keyword: string
          match_type?: string
          name?: string | null
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount_max?: number | null
          amount_min?: number | null
          category_id?: string
          created_at?: string
          cuenta_id?: string | null
          id?: string
          keyword?: string
          match_type?: string
          name?: string | null
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_rules_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      criptomonedas: {
        Row: {
          cantidad: number
          created_at: string
          divisa_compra: string
          fecha_compra: string
          id: string
          nombre: string
          notas: string | null
          precio_compra: number
          simbolo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          divisa_compra?: string
          fecha_compra: string
          id?: string
          nombre: string
          notas?: string | null
          precio_compra?: number
          simbolo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          divisa_compra?: string
          fecha_compra?: string
          id?: string
          nombre?: string
          notas?: string | null
          precio_compra?: number
          simbolo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cuentas: {
        Row: {
          created_at: string
          divisa: string
          fecha_inicio: string | null
          id: string
          is_sample: boolean | null
          modalidad: string | null
          nombre: string
          rendimiento_bruto: number | null
          rendimiento_mensual: number | null
          rendimiento_neto: number | null
          saldo_inicial: number
          tipo: string
          tipo_inversion: string | null
          ultimo_pago: string | null
          updated_at: string
          user_id: string
          valor_mercado: number | null
          vendida: boolean
        }
        Insert: {
          created_at?: string
          divisa?: string
          fecha_inicio?: string | null
          id?: string
          is_sample?: boolean | null
          modalidad?: string | null
          nombre: string
          rendimiento_bruto?: number | null
          rendimiento_mensual?: number | null
          rendimiento_neto?: number | null
          saldo_inicial?: number
          tipo: string
          tipo_inversion?: string | null
          ultimo_pago?: string | null
          updated_at?: string
          user_id: string
          valor_mercado?: number | null
          vendida?: boolean
        }
        Update: {
          created_at?: string
          divisa?: string
          fecha_inicio?: string | null
          id?: string
          is_sample?: boolean | null
          modalidad?: string | null
          nombre?: string
          rendimiento_bruto?: number | null
          rendimiento_mensual?: number | null
          rendimiento_neto?: number | null
          saldo_inicial?: number
          tipo?: string
          tipo_inversion?: string | null
          ultimo_pago?: string | null
          updated_at?: string
          user_id?: string
          valor_mercado?: number | null
          vendida?: boolean
        }
        Relationships: []
      }
      financial_health_history: {
        Row: {
          activos_total: number | null
          ahorro_ratio: number | null
          ahorro_score: number
          balance_mensual: number | null
          created_at: string
          diversificacion_score: number
          endeudamiento_ratio: number | null
          endeudamiento_score: number
          fecha: string
          id: string
          liquidez_ratio: number | null
          liquidez_score: number
          pasivos_total: number | null
          rendimiento_inversiones: number | null
          rendimiento_inversiones_score: number
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activos_total?: number | null
          ahorro_ratio?: number | null
          ahorro_score: number
          balance_mensual?: number | null
          created_at?: string
          diversificacion_score: number
          endeudamiento_ratio?: number | null
          endeudamiento_score: number
          fecha: string
          id?: string
          liquidez_ratio?: number | null
          liquidez_score: number
          pasivos_total?: number | null
          rendimiento_inversiones?: number | null
          rendimiento_inversiones_score: number
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activos_total?: number | null
          ahorro_ratio?: number | null
          ahorro_score?: number
          balance_mensual?: number | null
          created_at?: string
          diversificacion_score?: number
          endeudamiento_ratio?: number | null
          endeudamiento_score?: number
          fecha?: string
          id?: string
          liquidez_ratio?: number | null
          liquidez_score?: number
          pasivos_total?: number | null
          rendimiento_inversiones?: number | null
          rendimiento_inversiones_score?: number
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inversiones: {
        Row: {
          created_at: string
          fecha_inicio: string
          id: string
          modalidad: string
          moneda: string
          monto_invertido: number
          nombre: string
          rendimiento_bruto: number | null
          rendimiento_neto: number | null
          tipo: string
          ultimo_pago: string | null
          updated_at: string
          user_id: string
          valor_actual: number
        }
        Insert: {
          created_at?: string
          fecha_inicio: string
          id?: string
          modalidad: string
          moneda?: string
          monto_invertido?: number
          nombre: string
          rendimiento_bruto?: number | null
          rendimiento_neto?: number | null
          tipo: string
          ultimo_pago?: string | null
          updated_at?: string
          user_id: string
          valor_actual?: number
        }
        Update: {
          created_at?: string
          fecha_inicio?: string
          id?: string
          modalidad?: string
          moneda?: string
          monto_invertido?: number
          nombre?: string
          rendimiento_bruto?: number | null
          rendimiento_neto?: number | null
          tipo?: string
          ultimo_pago?: string | null
          updated_at?: string
          user_id?: string
          valor_actual?: number
        }
        Relationships: []
      }
      keepalive_pings: {
        Row: {
          id: string
          pinged_at: string
        }
        Insert: {
          id?: string
          pinged_at?: string
        }
        Update: {
          id?: string
          pinged_at?: string
        }
        Relationships: []
      }
      payment_skips: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          month: number
          razon: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          month: number
          razon?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          month?: number
          razon?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_skips_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellidos: string
          created_at: string
          divisa_preferida: string
          edad: number | null
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apellidos: string
          created_at?: string
          divisa_preferida?: string
          edad?: number | null
          id?: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apellidos?: string
          created_at?: string
          divisa_preferida?: string
          edad?: number | null
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_services: {
        Row: {
          active: boolean
          aliases: string[]
          canon_key: string | null
          created_at: string
          frecuencia: string
          id: string
          numero_pagos: number
          original_comments: string[]
          proximo_pago: string
          service_name: string
          tipo_servicio: string
          ultimo_pago_fecha: string
          ultimo_pago_monto: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          canon_key?: string | null
          created_at?: string
          frecuencia: string
          id?: string
          numero_pagos?: number
          original_comments?: string[]
          proximo_pago: string
          service_name: string
          tipo_servicio: string
          ultimo_pago_fecha: string
          ultimo_pago_monto: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          aliases?: string[]
          canon_key?: string | null
          created_at?: string
          frecuencia?: string
          id?: string
          numero_pagos?: number
          original_comments?: string[]
          proximo_pago?: string
          service_name?: string
          tipo_servicio?: string
          ultimo_pago_fecha?: string
          ultimo_pago_monto?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transacciones: {
        Row: {
          comentario: string
          created_at: string
          csv_id: string | null
          cuenta_id: string
          divisa: string
          fecha: string
          gasto: number
          id: string
          ingreso: number
          subcategoria_id: string
          tarjetahabiente: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string
          csv_id?: string | null
          cuenta_id: string
          divisa?: string
          fecha: string
          gasto?: number
          id?: string
          ingreso?: number
          subcategoria_id: string
          tarjetahabiente?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string
          csv_id?: string | null
          cuenta_id?: string
          divisa?: string
          fecha?: string
          gasto?: number
          id?: string
          ingreso?: number
          subcategoria_id?: string
          tarjetahabiente?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_pendings: {
        Row: {
          concepto: string
          created_at: string
          divisa: string
          estado: Database["public"]["Enums"]["pending_estado"]
          fecha_cobro: string | null
          fecha_esperada: string | null
          id: string
          monto_cobrado: number
          monto_esperado: number
          notas: string | null
          tipo: Database["public"]["Enums"]["pending_tipo"]
          transaccion_cobro_id: string | null
          transaccion_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concepto: string
          created_at?: string
          divisa?: string
          estado?: Database["public"]["Enums"]["pending_estado"]
          fecha_cobro?: string | null
          fecha_esperada?: string | null
          id?: string
          monto_cobrado?: number
          monto_esperado: number
          notas?: string | null
          tipo: Database["public"]["Enums"]["pending_tipo"]
          transaccion_cobro_id?: string | null
          transaccion_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concepto?: string
          created_at?: string
          divisa?: string
          estado?: Database["public"]["Enums"]["pending_estado"]
          fecha_cobro?: string | null
          fecha_esperada?: string | null
          id?: string
          monto_cobrado?: number
          monto_esperado?: number
          notas?: string | null
          tipo?: Database["public"]["Enums"]["pending_tipo"]
          transaccion_cobro_id?: string | null
          transaccion_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_pendings_transaccion_cobro_id_fkey"
            columns: ["transaccion_cobro_id"]
            isOneToOne: false
            referencedRelation: "transacciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_pendings_transaccion_id_fkey"
            columns: ["transaccion_id"]
            isOneToOne: false
            referencedRelation: "transacciones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      clear_sample_data: { Args: { user_uuid: string }; Returns: undefined }
      create_default_classification_rules: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      ensure_sin_asignar_category: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_admin_user_stats: {
        Args: never
        Returns: {
          apellidos: string
          categorias_count: number
          created_at: string
          criptomonedas_count: number
          cuentas_count: number
          divisa_preferida: string
          email: string
          inversiones_count: number
          last_transaction_at: string
          nombre: string
          transacciones_count: number
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      user_has_sample_data: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      pending_estado: "pendiente" | "cobrado_parcial" | "cobrado" | "cancelado"
      pending_tipo: "reembolso_gasto" | "ingreso_esperado"
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
      app_role: ["admin", "user"],
      pending_estado: ["pendiente", "cobrado_parcial", "cobrado", "cancelado"],
      pending_tipo: ["reembolso_gasto", "ingreso_esperado"],
    },
  },
} as const
