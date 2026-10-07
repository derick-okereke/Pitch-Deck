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
      investor_profiles: {
        Row: {
          user_id: string;
          full_name: string;
          investor_type: "angel" | "vc-firm" | "corporate-venture" | "accelerator";
          firm_name: string | null;
          professional_title: string | null;
          bio: string | null;
          sectors: string[];
          stages: string[];
          countries: string[];
          check_currency: "NGN" | "USD";
          check_min_minor: number;
          check_max_minor: number;
          linkedin_url: string | null;
          domain_signal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["investor_profiles"]["Row"], "created_at" | "updated_at" | "domain_signal"> & { domain_signal?: boolean };
        Update: Partial<Omit<Database["public"]["Tables"]["investor_profiles"]["Row"], "user_id" | "created_at" | "updated_at" | "domain_signal">>;
        Relationships: [];
      };
      demo_entitlements: {
        Row: {
          account_id: string;
          role: "founder" | "investor";
          tier: string;
          expires_at: string;
          granted_by: string;
          reason: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["demo_entitlements"]["Row"], "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["demo_entitlements"]["Row"], "account_id" | "created_at">>;
        Relationships: [];
      };
      billing_checkout_attempts: {
        Row: {
          id: string;
          account_id: string;
          idempotency_key: string;
          reference: string;
          provider_checkout_id: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          state: Database["public"]["Enums"]["billing_checkout_state"];
          environment: "sandbox";
          product_id: string;
          currency: "USD";
          amount_minor: number;
          checkout_url: string | null;
          expires_at: string | null;
          error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_checkout_attempts"]["Row"], "provider_checkout_id" | "provider_customer_id" | "provider_subscription_id" | "checkout_url" | "expires_at" | "error_code" | "created_at" | "updated_at"> & {
          provider_checkout_id?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          checkout_url?: string | null;
          expires_at?: string | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["billing_checkout_attempts"]["Row"], "id" | "account_id" | "idempotency_key" | "reference" | "environment" | "product_id" | "currency" | "amount_minor" | "created_at">>;
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          account_id: string;
          provider_subscription_id: string;
          provider_customer_id: string;
          source_checkout_id: string;
          environment: "sandbox";
          product_id: string;
          currency: "USD";
          amount_minor: number;
          status: Database["public"]["Enums"]["billing_subscription_state"];
          current_period_start: string | null;
          current_period_end: string;
          cancel_at_period_end: boolean;
          revoked_at: string | null;
          verified_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      billing_webhook_receipts: {
        Row: {
          provider_event_id: string;
          event_type: string;
          environment: "sandbox";
          payload_hash: string;
          state: Database["public"]["Enums"]["billing_webhook_state"];
          error_code: string | null;
          received_at: string;
          processed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_webhook_receipts"]["Row"], "state" | "error_code" | "received_at" | "processed_at"> & {
          state?: Database["public"]["Enums"]["billing_webhook_state"];
          error_code?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Pick<Database["public"]["Tables"]["billing_webhook_receipts"]["Row"], "state" | "error_code" | "processed_at">>;
        Relationships: [];
      };
      investor_detail_views: {
        Row: {
          investor_id: string;
          startup_id: string;
          view_month: string;
          first_viewed_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          investor_id: string;
          startup_id: string;
          founder_id: string;
          next_sequence: number;
          created_at: string;
          last_message_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          client_message_id: string;
          sequence: number;
          body: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversation_reads: {
        Row: { conversation_id: string; user_id: string; last_read_sequence: number; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversation_blocks: {
        Row: { conversation_id: string; blocker_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      intro_request_events: {
        Row: {
          id: string;
          event_key: string;
          event_type: "intro_requested" | "intro_responded";
          actor_id: string | null;
          conversation_id: string;
          occurred_at: string;
          created_at: string;
          schema_version: string;
          is_demo: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      startups: {
        Row: {
          id: string;
          founder_id: string;
          draft_payload: Json;
          draft_version: number;
          published_revision_id: string | null;
          publication_status: "draft" | "published" | "unpublished";
          selected_audio_session_id: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profile_revisions: {
        Row: {
          id: string;
          startup_id: string;
          revision_number: number;
          draft_version: number;
          content_hash: string;
          payload: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profile_reviews: {
        Row: {
          id: string;
          revision_id: string;
          rubric_version: string;
          model_id: string | null;
          prompt_version: string;
          operation_id: string;
          state: "reviewing" | "needs_improvement" | "passed" | "review_failed";
          ratings: Json | null;
          evidence: Json | null;
          flags: Json | null;
          content_points: number | null;
          error_code: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      simulator_sessions: {
        Row: {
          id: string;
          founder_id: string;
          startup_id: string;
          snapshot_revision_id: string;
          tier_at_start: "free" | "pro";
          entitlement_source: string;
          state: Database["public"]["Enums"]["simulator_session_state"];
          state_version: number;
          consent_version: string;
          expires_at: string;
          started_at: string;
          completed_at: string | null;
          failure_code: string | null;
          is_fixture: boolean;
          idempotency_key: string;
          input_hash: string;
          answered_question_count: number;
          retry_stage: string | null;
          retry_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      simulator_personas: {
        Row: {
          session_id: string;
          persona_key: "p1" | "p2" | "p3";
          name: string;
          title: string;
          focus: string;
          voice_style: "warm-rigorous" | "direct-analytical" | "calm-strategic";
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      usage_reservations: {
        Row: {
          session_id: string;
          founder_id: string;
          state: "reserved" | "consumed" | "released";
          expires_at: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      simulator_recordings: {
        Row: {
          id: string;
          session_id: string;
          segment_kind: "pitch" | "answer";
          question_index: number | null;
          segment_slot: number;
          storage_path: string;
          mime_type: string;
          byte_size: number;
          duration_ms: number;
          transcript: string | null;
          word_timestamps: Json | null;
          segment_timestamps: Json | null;
          word_count: number | null;
          words_per_minute: number | null;
          filler_matches: number | null;
          filler_token_count: number | null;
          filler_percent: number | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      simulator_questions: {
        Row: {
          session_id: string;
          question_index: number;
          persona_key: "p1" | "p2" | "p3";
          question: string;
          source_quote: string;
          focus_category: "problem" | "solution" | "market" | "traction" | "business_model" | "ask";
          prompt_version: string;
          model_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      simulator_reports: {
        Row: {
          session_id: string;
          schema_version: string;
          rubric_version: string;
          prompt_version: string;
          model_id: string;
          categories: Json;
          persona_feedback: Json;
          session_points: number;
          delivery_points: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      confirmed_signup_email_exists: {
        Args: { p_email: string };
        Returns: boolean;
      };
      save_founder_draft: {
        Args: { p_founder_id: string; p_expected_version: number; p_payload: Json };
        Returns: Array<{ startup_id: string; draft_version: number; saved_at: string }>;
      };
      begin_profile_review: {
        Args: {
          p_founder_id: string;
          p_startup_id: string;
          p_draft_version: number;
          p_content_hash: string;
          p_rubric_version: string;
          p_prompt_version: string;
        };
        Returns: Array<{
          review_id: string;
          revision_id: string;
          review_state: "reviewing" | "needs_improvement" | "passed" | "review_failed";
          reused: boolean;
        }>;
      };
      complete_profile_review: {
        Args: {
          p_review_id: string;
          p_model_id: string;
          p_ratings: Json;
          p_evidence: Json;
          p_flags: Json;
          p_content_points: number;
        };
        Returns: Array<{ published: boolean; reviewed_earlier_draft: boolean }>;
      };
      publish_founder_review: {
        Args: { p_founder_id: string; p_review_id: string };
        Returns: Array<{ startup_id: string; revision_id: string }>;
      };
      fail_profile_review: {
        Args: { p_review_id: string; p_error_code: string };
        Returns: undefined;
      };
      start_simulator_session: {
        Args: {
          p_founder_id: string;
          p_startup_id: string;
          p_draft_version: number;
          p_content_hash: string;
          p_consent_version: string;
          p_idempotency_key: string;
          p_input_hash: string;
        };
        Returns: Array<{
          session_id: string;
          session_state: Database["public"]["Enums"]["simulator_session_state"];
          state_version: number;
          remaining_free: number;
          reused: boolean;
        }>;
      };
      complete_simulator_preparation: {
        Args: { p_session_id: string; p_personas: Json };
        Returns: Array<{
          session_state: Database["public"]["Enums"]["simulator_session_state"];
          state_version: number;
        }>;
      };
      fail_simulator_preparation: {
        Args: { p_session_id: string; p_error_code: string };
        Returns: undefined;
      };
      cancel_simulator_session: {
        Args: { p_founder_id: string; p_session_id: string; p_expected_version: number };
        Returns: number;
      };
      begin_simulator_segment: {
        Args: {
          p_founder_id: string;
          p_session_id: string;
          p_expected_version: number;
          p_segment_kind: "pitch" | "answer";
          p_question_index: number | null;
          p_storage_path: string;
          p_mime_type: string;
          p_byte_size: number;
          p_duration_ms: number;
        };
        Returns: number;
      };
      complete_pitch_and_questions: {
        Args: {
          p_session_id: string;
          p_transcript: string;
          p_words: Json;
          p_segments: Json;
          p_word_count: number;
          p_wpm: number;
          p_filler_matches: number;
          p_filler_token_count: number;
          p_filler_percent: number;
          p_questions: Json;
          p_prompt_version: string;
          p_model_id: string;
        };
        Returns: number;
      };
      complete_simulator_answer: {
        Args: {
          p_session_id: string;
          p_question_index: number;
          p_transcript: string;
          p_words: Json;
          p_segments: Json;
          p_word_count: number;
          p_wpm: number;
          p_filler_matches: number;
          p_filler_token_count: number;
          p_filler_percent: number;
        };
        Returns: Array<{ session_state: Database["public"]["Enums"]["simulator_session_state"]; state_version: number; answered_question_count: number }>;
      };
      begin_simulator_feedback: {
        Args: { p_founder_id: string; p_session_id: string; p_expected_version: number };
        Returns: number;
      };
      complete_simulator_feedback: {
        Args: {
          p_session_id: string;
          p_schema_version: string;
          p_rubric_version: string;
          p_prompt_version: string;
          p_model_id: string;
          p_categories: Json;
          p_persona_feedback: Json;
          p_session_points: number;
          p_delivery_points: number;
        };
        Returns: number;
      };
      fail_simulator_stage: {
        Args: { p_session_id: string; p_expected_state: Database["public"]["Enums"]["simulator_session_state"]; p_error_code: string };
        Returns: number | null;
      };
      create_intro_request: {
        Args: {
          p_investor_id: string;
          p_startup_id: string;
          p_body: string;
          p_client_message_id: string;
          p_demo_mode: boolean;
        };
        Returns: Array<{ conversation_id: string; created: boolean }>;
      };
      reserve_investor_detail_view: {
        Args: {
          p_investor_id: string;
          p_startup_id: string;
          p_demo_mode: boolean;
          p_limit?: number;
        };
        Returns: Array<{
          allowed: boolean;
          consumed: boolean;
          used_count: number;
          view_limit: number;
          reset_at: string;
          demo_pro: boolean;
        }>;
      };
      send_conversation_message: {
        Args: { p_sender_id: string; p_conversation_id: string; p_body: string; p_client_message_id: string };
        Returns: Array<{
          message_id: string;
          message_sequence: number;
          message_body: string;
          message_created_at: string;
          reused: boolean;
        }>;
      };
      set_conversation_read: {
        Args: { p_user_id: string; p_conversation_id: string; p_last_read_sequence: number };
        Returns: number;
      };
      set_conversation_block: {
        Args: { p_user_id: string; p_conversation_id: string; p_blocked: boolean };
        Returns: boolean;
      };
      founder_has_active_pro: {
        Args: { p_account_id: string };
        Returns: boolean;
      };
      activate_bachs_founder_subscription: {
        Args: {
          p_event_id: string;
          p_checkout_id: string;
          p_customer_id: string;
          p_subscription_id: string;
          p_product_id: string;
          p_currency: string;
          p_amount_minor: number;
          p_status: Database["public"]["Enums"]["billing_subscription_state"];
          p_period_start: string | null;
          p_period_end: string;
          p_cancel_at_period_end: boolean;
        };
        Returns: string;
      };
      update_bachs_founder_subscription: {
        Args: {
          p_event_id: string;
          p_subscription_id: string;
          p_status: Database["public"]["Enums"]["billing_subscription_state"];
          p_period_start: string | null;
          p_period_end: string;
          p_cancel_at_period_end: boolean;
        };
        Returns: string;
      };
    };
    Enums: {
      account_role: "founder" | "investor";
      startup_publication_status: "draft" | "published" | "unpublished";
      profile_review_state: "reviewing" | "needs_improvement" | "passed" | "review_failed";
      simulator_tier: "free" | "pro";
      simulator_session_state:
        | "preparing" | "ready" | "pitch_processing" | "pitch_transcribed" | "question_generating"
        | "question_ready" | "answer_processing" | "ready_for_feedback" | "feedback_generating"
        | "retryable_error" | "completed" | "failed" | "cancelled" | "expired";
      simulator_persona_key: "p1" | "p2" | "p3";
      simulator_voice_style: "warm-rigorous" | "direct-analytical" | "calm-strategic";
      usage_reservation_state: "reserved" | "consumed" | "released";
      simulator_segment_kind: "pitch" | "answer";
      billing_checkout_state: "creating" | "open" | "pending_verification" | "completed" | "expired" | "cancelled" | "failed";
      billing_subscription_state: "pending" | "active" | "past_due" | "unpaid" | "cancelled" | "expired";
      billing_webhook_state: "received" | "processed" | "ignored" | "quarantined" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};
