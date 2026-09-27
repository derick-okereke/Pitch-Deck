export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          role: "founder" | "investor" | null;
          display_name: string;
          organization_name: string | null;
          onboarding_completed_at: string | null;
          suspended_at: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          display_name?: string;
          organization_name?: string | null;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { account_role: "founder" | "investor" };
    CompositeTypes: Record<string, never>;
  };
};
