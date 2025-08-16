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
          id: string
          subcategoria: string
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          subcategoria: string
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          subcategoria?: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          divisa?: string
          fecha_inicio?: string | null
          id?: string
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
        }
        Update: {
          created_at?: string
          divisa?: string
          fecha_inicio?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      clear_sample_data: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      ensure_sin_asignar_category: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_admin_user_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          apellidos: string
          categorias_count: number
          criptomonedas_count: number
          cuentas_count: number
          divisa_preferida: string
          email: string
          inversiones_count: number
          nombre: string
          transacciones_count: number
          user_id: string
        }[]
      }
      user_has_sample_data: {
        Args: { user_uuid: string }
        Returns: boolean
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
