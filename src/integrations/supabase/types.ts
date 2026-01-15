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
          es_costo_directo: boolean
          frecuencia_seguimiento: string | null
          id: string
          sat_codigo: string | null
          seguimiento_pago: boolean
          subcategoria: string
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          es_costo_directo?: boolean
          frecuencia_seguimiento?: string | null
          id?: string
          sat_codigo?: string | null
          seguimiento_pago?: boolean
          subcategoria: string
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          es_costo_directo?: boolean
          frecuencia_seguimiento?: string | null
          id?: string
          sat_codigo?: string | null
          seguimiento_pago?: boolean
          subcategoria?: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          rfc?: string | null
          telefono?: string | null
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
          vendida: boolean
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
          vendida?: boolean
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
          vendida?: boolean
        }
        Relationships: []
      }
      facturas: {
        Row: {
          cliente_id: string | null
          concepto: string | null
          created_at: string
          divisa: string
          estatus: string
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          isr_retenido: number
          iva: number
          iva_retenido: number
          monto_pagado: number
          notas: string | null
          numero_factura: string
          proveedor_id: string | null
          proyecto_id: string | null
          subtotal: number
          tipo: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          concepto?: string | null
          created_at?: string
          divisa?: string
          estatus?: string
          fecha_emision: string
          fecha_vencimiento: string
          id?: string
          isr_retenido?: number
          iva?: number
          iva_retenido?: number
          monto_pagado?: number
          notas?: string | null
          numero_factura: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          subtotal?: number
          tipo: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          concepto?: string | null
          created_at?: string
          divisa?: string
          estatus?: string
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          isr_retenido?: number
          iva?: number
          iva_retenido?: number
          monto_pagado?: number
          notas?: string | null
          numero_factura?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          subtotal?: number
          tipo?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "rentabilidad_proyectos"
            referencedColumns: ["id"]
          },
        ]
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
      inventario: {
        Row: {
          activo: boolean
          cantidad: number
          codigo_parte: string
          costo_promedio: number
          created_at: string
          descripcion: string | null
          id: string
          minimo_stock: number | null
          nombre: string
          sat_cuenta: string
          ubicacion: string | null
          unidad: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          cantidad?: number
          codigo_parte: string
          costo_promedio?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          minimo_stock?: number | null
          nombre: string
          sat_cuenta?: string
          ubicacion?: string | null
          unidad?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          cantidad?: number
          codigo_parte?: string
          costo_promedio?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          minimo_stock?: number | null
          nombre?: string
          sat_cuenta?: string
          ubicacion?: string | null
          unidad?: string
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
      movimientos_inventario: {
        Row: {
          cantidad: number
          costo_total: number
          costo_unitario: number
          created_at: string
          cuenta_abono: string | null
          cuenta_cargo: string | null
          factura_id: string | null
          fecha: string
          id: string
          inventario_id: string
          notas: string | null
          proyecto_id: string | null
          referencia: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          cantidad: number
          costo_total?: number
          costo_unitario?: number
          created_at?: string
          cuenta_abono?: string | null
          cuenta_cargo?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          inventario_id: string
          notas?: string | null
          proyecto_id?: string | null
          referencia?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          cantidad?: number
          costo_total?: number
          costo_unitario?: number
          created_at?: string
          cuenta_abono?: string | null
          cuenta_cargo?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          inventario_id?: string
          notas?: string | null
          proyecto_id?: string | null
          referencia?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_cobrar_aging"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_pagar_aging"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "rentabilidad_proyectos"
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
          tipo_cuenta: string
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
          tipo_cuenta?: string
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
          tipo_cuenta?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          cliente_id: string | null
          codigo: string
          created_at: string
          descripcion: string | null
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          notas: string | null
          presupuesto: number | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          codigo: string
          created_at?: string
          descripcion?: string | null
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          notas?: string | null
          presupuesto?: number | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          presupuesto?: number | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      sat_cuentas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          cuenta_padre: string | null
          id: string
          naturaleza: string
          nivel: number
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          cuenta_padre?: string | null
          id?: string
          naturaleza: string
          nivel?: number
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          cuenta_padre?: string | null
          id?: string
          naturaleza?: string
          nivel?: number
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_services: {
        Row: {
          active: boolean
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
          proyecto_id: string | null
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
          proyecto_id?: string | null
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
          proyecto_id?: string | null
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
            foreignKeyName: "transacciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "rentabilidad_proyectos"
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
      cuentas_por_cobrar_aging: {
        Row: {
          aging_bucket: string | null
          cliente_nombre: string | null
          dias_vencidos: number | null
          divisa: string | null
          factura_id: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          monto_pagado: number | null
          numero_factura: string | null
          saldo_pendiente: number | null
          total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      cuentas_por_pagar_aging: {
        Row: {
          aging_bucket: string | null
          dias_vencidos: number | null
          divisa: string | null
          factura_id: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          monto_pagado: number | null
          numero_factura: string | null
          proveedor_nombre: string | null
          saldo_pendiente: number | null
          total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      rentabilidad_proyectos: {
        Row: {
          cliente_nombre: string | null
          codigo: string | null
          costo_inventario: number | null
          estatus: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          gastos_directos: number | null
          id: string | null
          ingresos_total: number | null
          margen_porcentaje: number | null
          nombre: string | null
          tipo: string | null
          user_id: string | null
          utilidad_bruta: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      clear_sample_data: { Args: { user_uuid: string }; Returns: undefined }
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
          nombre: string
          transacciones_count: number
          user_id: string
        }[]
      }
      get_business_dashboard_metrics: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      user_has_sample_data: { Args: { user_uuid: string }; Returns: boolean }
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
