// ============================================================
// Hospitality Agent Infrastructure - 型定義（単一真実源）
// フロントエンド・バックエンド間で同一構造を保つ
// ============================================================

// --- ユーザー・認証関連 ---

export type UserStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'guest' | 'user' | 'admin';

export interface UserProfile {
  profile_id: string;
  name: string;
  department: string;
  join_date: string; // YYYY-MM
  status: UserStatus;
  approved_at: string | null;
  auth_token: string | null;
  created_at: string;
  last_accessed_at: string;
}

export interface ProfileSubmission {
  name: string;
  department: string;
  join_date: string;
}

export interface AdminLoginRequest {
  password: string;
}

export interface AdminSession {
  session_id: string;
  authenticated: boolean;
  created_at: string;
  expires_at: string;
}

// --- 対話関連 ---

export type MessageRole = 'user' | 'assistant';
export type InputMethod = 'text' | 'voice';

export interface Message {
  message_id: string;
  role: MessageRole;
  content: string;
  input_method: InputMethod;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  message_count?: number;
}

export interface ChatRequest {
  content: string;
  input_method: InputMethod;
  conversation_id?: string;
}

export interface ChatResponse {
  message: Message;
  conversation_id: string;
  sources?: KnowledgeReference[];
}

export interface KnowledgeReference {
  source_title: string;
  source_url: string | null;
  source_type: 'notion' | 'google_drive';
}

// --- 管理画面関連 ---

export interface PromptConfig {
  config_id: string;
  system_prompt: string;
  few_shot_examples: FewShotExample[];
  version: number;
  created_at: string;
  updated_by: string;
}

export interface FewShotExample {
  user_message: string;
  assistant_message: string;
}

export type KnowledgeSourceType = 'notion' | 'google_drive';
export type KnowledgeSourceStatus = 'active' | 'error' | 'syncing';

export interface KnowledgeSource {
  source_id: string;
  type: KnowledgeSourceType;
  connection_config: Record<string, string>;
  sync_interval_minutes: number;
  last_synced_at: string | null;
  document_count: number;
  status: KnowledgeSourceStatus;
  last_error?: string | null;
}

// --- ログ分析関連 ---

export interface ConversationLog {
  conversation_id: string;
  title: string;
  user_name: string;
  department: string;
  join_date: string;
  created_at: string;
  message_count: number;
  first_message: string;
}

export interface LogFilter {
  department?: string;
  join_date?: string;
  date_from?: string;
  date_to?: string;
}

export interface FrequentQuestion {
  question: string;
  count: number;
  category: string;
}

// --- 認証ストア ---

export interface AuthState {
  userProfile: UserProfile | null;
  adminSession: AdminSession | null;
  isLoading: boolean;
  submitProfile: (data: ProfileSubmission) => Promise<void>;
  checkStatus: () => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  logout: () => void;
}

// --- APIパス ---

export const API_PATHS = {
  AUTH: {
    SUBMIT_PROFILE: '/api/auth/profile',
    CHECK_STATUS: '/api/auth/status',
    ADMIN_LOGIN: '/api/admin/login',
    ADMIN_LOGOUT: '/api/admin/logout',
  },
  CHAT: {
    SEND: '/api/chat',
    CONVERSATIONS: '/api/conversations',
    CONVERSATION_DETAIL: (id: string) => `/api/conversations/${id}`,
    NEW_CONVERSATION: '/api/conversations/new',
  },
  ADMIN: {
    PENDING_USERS: '/api/admin/users/pending',
    ALL_USERS: '/api/admin/users',
    APPROVE_USER: (id: string) => `/api/admin/users/${id}/approve`,
    REJECT_USER: (id: string) => `/api/admin/users/${id}/reject`,
    LOGS: '/api/admin/logs',
    LOG_DETAIL: (id: string) => `/api/admin/logs/${id}`,
    LOG_ANALYTICS: '/api/admin/logs/analytics',
    PROMPT: '/api/admin/prompt',
    KNOWLEDGE_SOURCES: '/api/admin/knowledge-sources',
    SYNC: '/api/admin/sync',
  },
} as const;
