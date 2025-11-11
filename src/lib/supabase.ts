import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Configure estas variáveis com as credenciais do seu projeto Supabase
// Você pode encontrá-las em: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado. Por favor, configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          description: string;
          is_studied: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          description: string;
          is_studied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          name?: string;
          description?: string;
          is_studied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      study_cycles: {
        Row: {
          id: string;
          user_id: string;
          total_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_hours: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      cycle_allocations: {
        Row: {
          id: string;
          cycle_id: string;
          subject_id: string;
          allocated_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          subject_id: string;
          allocated_hours: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cycle_id?: string;
          subject_id?: string;
          allocated_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
