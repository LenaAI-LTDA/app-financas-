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
      categoria_trasacoes: {
        Row: {
          created_at: string
          descricao: string
          id: number
          usuario_id: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: number
          usuario_id: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: number
          usuario_id?: number
        }
        Relationships: []
      }
      consentimentos_usuarios: {
        Row: {
          data_consentimento: string | null
          id: number
          ip_origem: string | null
          status: boolean | null
          tipo_consentimento: string
          usuario_id: number
          versao_politica: string
        }
        Insert: {
          data_consentimento?: string | null
          id?: number
          ip_origem?: string | null
          status?: boolean | null
          tipo_consentimento: string
          usuario_id: number
          versao_politica: string
        }
        Update: {
          data_consentimento?: string | null
          id?: number
          ip_origem?: string | null
          status?: boolean | null
          tipo_consentimento?: string
          usuario_id?: number
          versao_politica?: string
        }
        Relationships: [
          {
            foreignKeyName: "consentimentos_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_futuros: {
        Row: {
          categoria_id: number
          created_at: string
          data_efetivacao: string | null
          data_prevista: string
          descricao: string
          id: number
          pagador_recebedor: string | null
          periodicidade: string | null
          recorrente: boolean
          status: string
          tipo: string
          ultima_atualizacao: string | null
          usuario_id: number
          valor: number
        }
        Insert: {
          categoria_id: number
          created_at?: string
          data_efetivacao?: string | null
          data_prevista: string
          descricao: string
          id?: number
          pagador_recebedor?: string | null
          periodicidade?: string | null
          recorrente?: boolean
          status?: string
          tipo: string
          ultima_atualizacao?: string | null
          usuario_id: number
          valor: number
        }
        Update: {
          categoria_id?: number
          created_at?: string
          data_efetivacao?: string | null
          data_prevista?: string
          descricao?: string
          id?: number
          pagador_recebedor?: string | null
          periodicidade?: string | null
          recorrente?: boolean
          status?: string
          tipo?: string
          ultima_atualizacao?: string | null
          usuario_id?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_futuros_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_trasacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories_corporation: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      solicitacoes_lgpd: {
        Row: {
          data_conclusao: string | null
          data_solicitacao: string | null
          id: number
          justificativa: string | null
          status: string
          tipo_solicitacao: string
          usuario_id: number
        }
        Insert: {
          data_conclusao?: string | null
          data_solicitacao?: string | null
          id?: number
          justificativa?: string | null
          status?: string
          tipo_solicitacao: string
          usuario_id: number
        }
        Update: {
          data_conclusao?: string | null
          data_solicitacao?: string | null
          id?: number
          justificativa?: string | null
          status?: string
          tipo_solicitacao?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_lgpd_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          categoria_id: number
          created_at: string
          data: string
          descricao: string
          id: number
          lancamento_futuro_id: number | null
          mes: string
          pagador: string | null
          recebedor: string | null
          tipo: string
          usuario_id: number
          valor: number
        }
        Insert: {
          categoria_id: number
          created_at?: string
          data: string
          descricao: string
          id?: number
          lancamento_futuro_id?: number | null
          mes: string
          pagador?: string | null
          recebedor?: string | null
          tipo: string
          usuario_id: number
          valor: number
        }
        Update: {
          categoria_id?: number
          created_at?: string
          data?: string
          descricao?: string
          id?: number
          lancamento_futuro_id?: number | null
          mes?: string
          pagador?: string | null
          recebedor?: string | null
          tipo?: string
          usuario_id?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_trasacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_lancamento_futuro_id_fkey"
            columns: ["lancamento_futuro_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_futuros"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          aceite_termos: boolean | null
          auth_user: string
          celular: string
          created_at: string | null
          data_aceite_termos: string | null
          data_compra: string | null
          email: string
          has_password: boolean | null
          id: number
          nome: string
          plano: string | null
          status: string | null
          ultima_atualizacao: string | null
        }
        Insert: {
          aceite_termos?: boolean | null
          auth_user: string
          celular: string
          created_at?: string | null
          data_aceite_termos?: string | null
          data_compra?: string | null
          email: string
          has_password?: boolean | null
          id?: number
          nome: string
          plano?: string | null
          status?: string | null
          ultima_atualizacao?: string | null
        }
        Update: {
          aceite_termos?: boolean | null
          auth_user?: string
          celular?: string
          created_at?: string | null
          data_aceite_termos?: string | null
          data_compra?: string | null
          email?: string
          has_password?: boolean | null
          id?: number
          nome?: string
          plano?: string | null
          status?: string | null
          ultima_atualizacao?: string | null
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
