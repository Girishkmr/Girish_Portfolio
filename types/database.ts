/**
 * Database row types.
 *
 * NOTE — this file is normally GENERATED, not written:
 *
 *   npx supabase gen types typescript --linked > types/database.ts
 *
 * It is hand-written here only because the Supabase project does not exist yet,
 * and Phase 2 had to be buildable before the credentials arrived. Run the
 * generator once the project is linked and let it overwrite this file — the
 * generated version is authoritative, and a hand-maintained copy will drift
 * from the schema exactly the way REQUIREMENTS.html §8 warns about.
 *
 * Kept deliberately in step with supabase/migrations/0002_posts.sql.
 */

export type PostType = 'note' | 'essay';
export type PostStatus = 'draft' | 'published';

export type PostRow = {
  id: string;
  type: PostType;
  status: PostStatus;
  slug: string | null;
  title: string | null;
  body_md: string;
  excerpt: string | null;
  cover_path: string | null;
  tags: string[];
  reading_min: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Insert and Update are written out in full rather than derived from `PostRow`
 * with Omit/Pick intersections.
 *
 * The derived version type-checks in isolation and then breaks Supabase's
 * inference: postgrest-js resolves the table to `never`, and the resulting
 * errors ("Property 'id' does not exist on type 'never'") name the call site
 * rather than the type that caused it. The generator emits plain object types
 * for exactly this reason — match it.
 *
 * Optional here means "the database supplies it": a default, or the
 * updated_at trigger from 0002_posts.sql.
 */
export type PostInsert = {
  id?: string;
  type?: PostType;
  status?: PostStatus;
  slug?: string | null;
  title?: string | null;
  body_md: string;
  excerpt?: string | null;
  cover_path?: string | null;
  tags?: string[];
  reading_min?: number | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PostUpdate = {
  id?: string;
  type?: PostType;
  status?: PostStatus;
  slug?: string | null;
  title?: string | null;
  body_md?: string;
  excerpt?: string | null;
  cover_path?: string | null;
  tags?: string[];
  reading_min?: number | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MessageRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  ip_hash: string | null;
  user_agent: string | null;
  handled: boolean;
};

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: PostInsert;
        Update: PostUpdate;
        /**
         * Required by Supabase's `GenericTable` constraint even when a table
         * has no foreign keys. Omitting it does not produce a helpful error —
         * the schema silently fails the constraint, every table resolves to
         * `never`, and the failure only surfaces at unrelated call sites.
         * Empty here because neither table references another.
         */
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          message: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          handled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          message?: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          handled?: boolean;
        };
        Relationships: [];
      };
    };
    /**
     * `{ [_ in never]: never }`, not `Record<never, never>`.
     *
     * They look equivalent and are not: Supabase's `GenericSchema` constraint
     * wants `Record<string, GenericView>`, and a plain empty object fails it.
     * When the constraint fails the whole schema is discarded and every table
     * resolves to `never` — which surfaces as "Property 'id' does not exist on
     * type 'never'" at the call site, pointing nowhere near the real cause.
     * This is the form the Supabase generator emits, and the reason it does.
     */
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      post_type: PostType;
      post_status: PostStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
