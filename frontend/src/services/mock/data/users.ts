import type { UserProfile, AdminSession } from '@/types/index.ts';

export const MOCK_USERS: UserProfile[] = [
  {
    profile_id: 'user-001',
    name: 'テスト太郎',
    department: '研修チーム',
    join_date: '2026-02',
    status: 'approved',
    approved_at: '2026-02-10T10:00:00Z',
    auth_token: 'mock-token-user-001',
    created_at: '2026-02-09T09:00:00Z',
    last_accessed_at: '2026-02-14T08:00:00Z',
  },
  {
    profile_id: 'user-002',
    name: '承認待ち花子',
    department: 'カスタマーサポート',
    join_date: '2026-03',
    status: 'pending',
    approved_at: null,
    auth_token: null,
    created_at: '2026-02-13T14:00:00Z',
    last_accessed_at: '2026-02-13T14:00:00Z',
  },
  {
    profile_id: 'user-003',
    name: '拒否次郎',
    department: '営業部',
    join_date: '2026-01',
    status: 'rejected',
    approved_at: null,
    auth_token: null,
    created_at: '2026-02-08T11:00:00Z',
    last_accessed_at: '2026-02-08T11:00:00Z',
  },
];

export const MOCK_ADMIN_SESSION: AdminSession = {
  session_id: 'admin-session-001',
  authenticated: true,
  created_at: '2026-02-14T08:00:00Z',
  expires_at: '2026-02-14T20:00:00Z',
};

export const ADMIN_PASSWORD = 'dev-admin-2026!';
