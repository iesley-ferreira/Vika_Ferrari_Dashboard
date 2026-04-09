export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          area: 'produto' | 'comercial' | 'gestor';
          role: 'especialista' | 'gestora_produto' | 'sdr' | 'seller' | 'closer' | 'gestor';
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          area: 'produto' | 'comercial' | 'gestor';
          role: 'especialista' | 'gestora_produto' | 'sdr' | 'seller' | 'closer' | 'gestor';
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          area?: 'produto' | 'comercial' | 'gestor';
          role?: 'especialista' | 'gestora_produto' | 'sdr' | 'seller' | 'closer' | 'gestor';
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      daily_reports: {
        Row: {
          id: string;
          user_id: string;
          report_date: string;
          area: string;
          role: string;
          data: Json;
          submitted_at: string;
          edited_at: string | null;
          edited_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_date?: string;
          area: string;
          role: string;
          data: Json;
          submitted_at?: string;
          edited_at?: string | null;
          edited_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_date?: string;
          area?: string;
          role?: string;
          data?: Json;
          submitted_at?: string;
          edited_at?: string | null;
          edited_by?: string | null;
        };
      };
      monthly_goals: {
        Row: {
          id: string;
          month: string;
          area: 'produto' | 'comercial' | 'geral';
          metric: string;
          target: number;
          created_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          month: string;
          area: 'produto' | 'comercial' | 'geral';
          metric: string;
          target: number;
          created_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          month?: string;
          area?: 'produto' | 'comercial' | 'geral';
          metric?: string;
          target?: number;
          created_at?: string;
          updated_by?: string | null;
        };
      };
      ranking_weights: {
        Row: {
          id: string;
          area: 'produto' | 'comercial';
          weights: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          area: 'produto' | 'comercial';
          weights: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          area?: 'produto' | 'comercial';
          weights?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      investment_metrics: {
        Row: {
          id: string;
          month: string;
          funnel: 'aplicacao' | 'isca_gratuita' | 'diagnostico' | 'aula_gratuita';
          data: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          month: string;
          funnel: 'aplicacao' | 'isca_gratuita' | 'diagnostico' | 'aula_gratuita';
          data: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          month?: string;
          funnel?: 'aplicacao' | 'isca_gratuita' | 'diagnostico' | 'aula_gratuita';
          data?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailyReport = Database['public']['Tables']['daily_reports']['Row'];
export type MonthlyGoal = Database['public']['Tables']['monthly_goals']['Row'];
export type RankingWeights = Database['public']['Tables']['ranking_weights']['Row'];
export type InvestmentMetric = Database['public']['Tables']['investment_metrics']['Row'];
