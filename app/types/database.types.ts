// Minimal checked-in shape for the initial migration. Replace it after linking a project:
// pnpm exec supabase gen types typescript --project-id <project-ref> > app/types/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>, Insert: Record<string, unknown>, Update: Record<string, unknown>, Relationships: [] }>
    Views: Record<string, never>
    Functions: Record<string, { Args: Record<string, unknown>, Returns: Json }>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
