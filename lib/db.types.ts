export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      accounts: {
        Row: { archived: boolean; color: string; created_at: string; currency: string; deleted_at: string | null; household_id: string; icon: string; id: string; name: string; starting_balance: number; type: string; updated_at: string }
        Insert: { archived?: boolean; color?: string; created_at?: string; currency: string; deleted_at?: string | null; household_id: string; icon?: string; id: string; name: string; starting_balance?: number; type: string; updated_at?: string }
        Update: { archived?: boolean; color?: string; created_at?: string; currency?: string; deleted_at?: string | null; household_id?: string; icon?: string; id?: string; name?: string; starting_balance?: number; type?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "accounts_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      agent_actions: {
        Row: { actor: string; args: Json; created_at: string; deleted_at: string | null; household_id: string; id: string; inverse: Json | null; parent_action_id: string | null; rationale: string | null; result: Json | null; tier: string; tool: string; ts: string; undone_at: string | null; updated_at: string }
        Insert: { actor: string; args: Json; created_at?: string; deleted_at?: string | null; household_id: string; id: string; inverse?: Json | null; parent_action_id?: string | null; rationale?: string | null; result?: Json | null; tier: string; tool: string; ts?: string; undone_at?: string | null; updated_at?: string }
        Update: { actor?: string; args?: Json; created_at?: string; deleted_at?: string | null; household_id?: string; id?: string; inverse?: Json | null; parent_action_id?: string | null; rationale?: string | null; result?: Json | null; tier?: string; tool?: string; ts?: string; undone_at?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "agent_actions_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      agent_memory: {
        Row: { created_at: string; deleted_at: string | null; household_id: string; id: string; kind: string; source: string; text: string; updated_at: string }
        Insert: { created_at?: string; deleted_at?: string | null; household_id: string; id: string; kind: string; source: string; text: string; updated_at?: string }
        Update: { created_at?: string; deleted_at?: string | null; household_id?: string; id?: string; kind?: string; source?: string; text?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "agent_memory_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      budgets: {
        Row: { amount: number; category_id: string; created_at: string; deleted_at: string | null; household_id: string; id: string; period: string; rollover: boolean; updated_at: string }
        Insert: { amount: number; category_id: string; created_at?: string; deleted_at?: string | null; household_id: string; id: string; period: string; rollover?: boolean; updated_at?: string }
        Update: { amount?: number; category_id?: string; created_at?: string; deleted_at?: string | null; household_id?: string; id?: string; period?: string; rollover?: boolean; updated_at?: string }
        Relationships: [{ foreignKeyName: "budgets_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      categories: {
        Row: { color: string; created_at: string; deleted_at: string | null; household_id: string; icon: string; id: string; name: string; type: string; updated_at: string }
        Insert: { color: string; created_at?: string; deleted_at?: string | null; household_id: string; icon: string; id: string; name: string; type: string; updated_at?: string }
        Update: { color?: string; created_at?: string; deleted_at?: string | null; household_id?: string; icon?: string; id?: string; name?: string; type?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "categories_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      household_members: {
        Row: { household_id: string; joined_at: string; role: string; user_id: string }
        Insert: { household_id: string; joined_at?: string; role?: string; user_id: string }
        Update: { household_id?: string; joined_at?: string; role?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "household_members_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      households: {
        Row: { created_at: string; id: string; invite_code: string; name: string; owner_id: string; updated_at: string }
        Insert: { created_at?: string; id?: string; invite_code?: string; name: string; owner_id: string; updated_at?: string }
        Update: { created_at?: string; id?: string; invite_code?: string; name?: string; owner_id?: string; updated_at?: string }
        Relationships: []
      }
      notes: {
        Row: { color: string | null; content: string; created_at: string; deleted_at: string | null; household_id: string; id: string; pinned: boolean; tag_ids: Json; title: string; updated_at: string }
        Insert: { color?: string | null; content: string; created_at?: string; deleted_at?: string | null; household_id: string; id: string; pinned?: boolean; tag_ids?: Json; title: string; updated_at?: string }
        Update: { color?: string | null; content?: string; created_at?: string; deleted_at?: string | null; household_id?: string; id?: string; pinned?: boolean; tag_ids?: Json; title?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "notes_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      recurring_rules: {
        Row: { account_id: string; active: boolean; amount: number; autopay: boolean; category_id: string | null; created_at: string; currency: string; day_of_month: number | null; deleted_at: string | null; end_date: string | null; frequency: string; household_id: string; id: string; last_generated: string | null; name: string; notes: string | null; start_date: string; tag_ids: Json; to_account_id: string | null; type: string; updated_at: string }
        Insert: { account_id: string; active?: boolean; amount: number; autopay?: boolean; category_id?: string | null; created_at?: string; currency: string; day_of_month?: number | null; deleted_at?: string | null; end_date?: string | null; frequency: string; household_id: string; id: string; last_generated?: string | null; name: string; notes?: string | null; start_date: string; tag_ids?: Json; to_account_id?: string | null; type: string; updated_at?: string }
        Update: { account_id?: string; active?: boolean; amount?: number; autopay?: boolean; category_id?: string | null; created_at?: string; currency?: string; day_of_month?: number | null; deleted_at?: string | null; end_date?: string | null; frequency?: string; household_id?: string; id?: string; last_generated?: string | null; name?: string; notes?: string | null; start_date?: string; tag_ids?: Json; to_account_id?: string | null; type?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "recurring_rules_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      reminders: {
        Row: { created_at: string; date: string; deleted_at: string | null; done: boolean; household_id: string; id: string; linked_transaction_id: string | null; recurring: string | null; title: string; updated_at: string }
        Insert: { created_at?: string; date: string; deleted_at?: string | null; done?: boolean; household_id: string; id: string; linked_transaction_id?: string | null; recurring?: string | null; title: string; updated_at?: string }
        Update: { created_at?: string; date?: string; deleted_at?: string | null; done?: boolean; household_id?: string; id?: string; linked_transaction_id?: string | null; recurring?: string | null; title?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "reminders_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      savings_goals: {
        Row: { account_id: string | null; color: string; contributions: Json; created_at: string; current: number; deadline: string | null; deleted_at: string | null; household_id: string; icon: string; id: string; name: string; target: number; updated_at: string }
        Insert: { account_id?: string | null; color: string; contributions?: Json; created_at?: string; current?: number; deadline?: string | null; deleted_at?: string | null; household_id: string; icon: string; id: string; name: string; target: number; updated_at?: string }
        Update: { account_id?: string | null; color?: string; contributions?: Json; created_at?: string; current?: number; deadline?: string | null; deleted_at?: string | null; household_id?: string; icon?: string; id?: string; name?: string; target?: number; updated_at?: string }
        Relationships: [{ foreignKeyName: "savings_goals_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      tags: {
        Row: { color: string; created_at: string; deleted_at: string | null; household_id: string; id: string; name: string; updated_at: string }
        Insert: { color: string; created_at?: string; deleted_at?: string | null; household_id: string; id: string; name: string; updated_at?: string }
        Update: { color?: string; created_at?: string; deleted_at?: string | null; household_id?: string; id?: string; name?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "tags_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      transactions: {
        Row: { account_id: string; amount: number; attachments: Json | null; category_id: string | null; created_at: string; currency: string; date: string; deleted_at: string | null; description: string; household_id: string; id: string; notes: string | null; projected: boolean; recurring_id: string | null; splits: Json | null; status: string; tag_ids: Json; to_account_id: string | null; type: string; updated_at: string }
        Insert: { account_id: string; amount: number; attachments?: Json | null; category_id?: string | null; created_at?: string; currency: string; date: string; deleted_at?: string | null; description: string; household_id: string; id: string; notes?: string | null; projected?: boolean; recurring_id?: string | null; splits?: Json | null; status: string; tag_ids?: Json; to_account_id?: string | null; type: string; updated_at?: string }
        Update: { account_id?: string; amount?: number; attachments?: Json | null; category_id?: string | null; created_at?: string; currency?: string; date?: string; deleted_at?: string | null; description?: string; household_id?: string; id?: string; notes?: string | null; projected?: boolean; recurring_id?: string | null; splits?: Json | null; status?: string; tag_ids?: Json; to_account_id?: string | null; type?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "transactions_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
      what_if_scenarios: {
        Row: { color: string; created_at: string; deleted_at: string | null; deltas: Json; end_date: string | null; household_id: string; icon: string; id: string; name: string; pinned: boolean; start_date: string; updated_at: string }
        Insert: { color?: string; created_at?: string; deleted_at?: string | null; deltas?: Json; end_date?: string | null; household_id: string; icon?: string; id: string; name: string; pinned?: boolean; start_date: string; updated_at?: string }
        Update: { color?: string; created_at?: string; deleted_at?: string | null; deltas?: Json; end_date?: string | null; household_id?: string; icon?: string; id?: string; name?: string; pinned?: boolean; start_date?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "what_if_scenarios_household_id_fkey"; columns: ["household_id"]; isOneToOne: false; referencedRelation: "households"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      attach_touch_trigger: { Args: { table_name: string }; Returns: undefined }
      user_household_ids: { Args: never; Returns: string[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: { Enums: {} },
} as const
