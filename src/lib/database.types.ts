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
      recipient_saved_gift_ideas: {
        Row: {
          created_at: string;
          estimated_price_max: number | null;
          estimated_price_min: number | null;
          id: string;
          image_url: string | null;
          product_url: string | null;
          rationale: string | null;
          recipient_id: string;
          suggestion_id: string | null;
          tier: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          estimated_price_max?: number | null;
          estimated_price_min?: number | null;
          id?: string;
          image_url?: string | null;
          product_url?: string | null;
          rationale?: string | null;
          recipient_id: string;
          suggestion_id?: string | null;
          tier?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          estimated_price_max?: number | null;
          estimated_price_min?: number | null;
          id?: string;
          image_url?: string | null;
          product_url?: string | null;
          rationale?: string | null;
          recipient_id?: string;
          suggestion_id?: string | null;
          tier?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipient_saved_gift_ideas_recipient_id_fkey";
            columns: ["recipient_id"];
            referencedRelation: "recipient_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipient_saved_gift_ideas_suggestion_id_fkey";
            columns: ["suggestion_id"];
            referencedRelation: "gift_suggestions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipient_saved_gift_ideas_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            referencedSchema: "auth";
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
