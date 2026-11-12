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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      beta_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          platform: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          platform: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          platform?: string
        }
        Relationships: []
      }
      compute_nodes: {
        Row: {
          gpu: string | null
          jobs_done: number
          jobs_failed: number
          last_seen: string
          node_id: string
        }
        Insert: {
          gpu?: string | null
          jobs_done?: number
          jobs_failed?: number
          last_seen?: string
          node_id: string
        }
        Update: {
          gpu?: string | null
          jobs_done?: number
          jobs_failed?: number
          last_seen?: string
          node_id?: string
        }
        Relationships: []
      }
      free_quota: {
        Row: {
          bucket: string
          day: string
          kind: string
          used: number
        }
        Insert: {
          bucket: string
          day?: string
          kind: string
          used?: number
        }
        Update: {
          bucket?: string
          day?: string
          kind?: string
          used?: number
        }
        Relationships: []
      }
      gpu_endpoints: {
        Row: {
          api_url: string
          cost_per_minute: number | null
          created_at: string
          id: string
          latency_ms: number | null
          name: string
          status: string
        }
        Insert: {
          api_url: string
          cost_per_minute?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          name: string
          status?: string
        }
        Update: {
          api_url?: string
          cost_per_minute?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      influencers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          handle: string | null
          id: string
          name: string
          platform: string | null
          status: string
          video_pipeline_url: string | null
          vote_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          name: string
          platform?: string | null
          status?: string
          video_pipeline_url?: string | null
          vote_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          name?: string
          platform?: string | null
          status?: string
          video_pipeline_url?: string | null
          vote_count?: number
        }
        Relationships: []
      }
      node_jobs: {
        Row: {
          claimed_at: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          label: string
          node_gpu: string | null
          node_id: string | null
          output_mime: string | null
          output_path: string | null
          status: string
          workflow: Json
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          label?: string
          node_gpu?: string | null
          node_id?: string | null
          output_mime?: string | null
          output_path?: string | null
          status?: string
          workflow: Json
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          label?: string
          node_gpu?: string | null
          node_id?: string | null
          output_mime?: string | null
          output_path?: string | null
          status?: string
          workflow?: Json
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          featured: boolean
          id: string
          owner_id: string
          status: string
          style_tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          featured?: boolean
          id?: string
          owner_id: string
          status?: string
          style_tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          featured?: boolean
          id?: string
          owner_id?: string
          status?: string
          style_tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      render_jobs: {
        Row: {
          created_at: string
          endpoint_id: string | null
          external_job_id: string | null
          id: string
          owner_id: string
          project_id: string | null
          prompt: Json
          response_log: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint_id?: string | null
          external_job_id?: string | null
          id?: string
          owner_id: string
          project_id?: string | null
          prompt?: Json
          response_log?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string | null
          external_job_id?: string | null
          id?: string
          owner_id?: string
          project_id?: string | null
          prompt?: Json
          response_log?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_jobs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "gpu_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "render_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          voter_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          voter_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          voter_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_free_quota: {
        Args: {
          _bucket: string
          _global_limit: number
          _kind: string
          _limit: number
        }
        Returns: number
      }
      claim_node_job: {
        Args: { _gpu: string; _node: string }
        Returns: {
          id: string
          workflow: Json
        }[]
      }
      free_quota_used: {
        Args: { _bucket: string; _kind: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_free_quota: {
        Args: { _bucket: string; _kind: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
