import type { UserProfile, ProfileSubmission, AdminSession } from '@/types/index.ts';
import { MOCK_USERS, MOCK_ADMIN_SESSION, ADMIN_PASSWORD } from './data/users.ts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage keys
const USER_TOKEN_KEY = 'csai_user_token';
const ADMIN_SESSION_KEY = 'csai_admin_session';
const MOCK_USERS_KEY = 'csai_mock_users';

// Persist mock users in LocalStorage so data is shared across tabs
function loadUsers(): UserProfile[] {
  const stored = localStorage.getItem(MOCK_USERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as UserProfile[];
    } catch {
      // fall through to default
    }
  }
  const initial = [...MOCK_USERS];
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(initial));
  return initial;
}

function saveUsers(users: UserProfile[]): void {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

export const mockAuthService = {
  async submitProfile(data: ProfileSubmission): Promise<UserProfile> {
    await delay(800);

    const newUser: UserProfile = {
      profile_id: `user-${Date.now()}`,
      name: data.name,
      department: data.department,
      join_date: data.join_date,
      status: 'pending',
      approved_at: null,
      auth_token: null,
      created_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    };

    const users = loadUsers();
    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(USER_TOKEN_KEY, newUser.profile_id);
    return newUser;
  },

  async checkStatus(): Promise<UserProfile | null> {
    await delay(300);

    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (!token) return null;

    const users = loadUsers();
    const user = users.find(u => u.profile_id === token || u.auth_token === token);
    return user ?? null;
  },

  async adminLogin(password: string): Promise<AdminSession> {
    await delay(500);

    if (password !== ADMIN_PASSWORD) {
      throw new Error('パスワードが正しくありません');
    }

    const session = { ...MOCK_ADMIN_SESSION, created_at: new Date().toISOString() };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async adminLogout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  async getAdminSession(): Promise<AdminSession | null> {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AdminSession;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(USER_TOKEN_KEY);
  },

  // 管理者用: ユーザー一覧
  async getPendingUsers(): Promise<UserProfile[]> {
    await delay(300);
    return loadUsers().filter(u => u.status === 'pending');
  },

  async getAllUsers(): Promise<UserProfile[]> {
    await delay(300);
    return [...loadUsers()];
  },

  async approveUser(profileId: string): Promise<UserProfile> {
    await delay(500);
    const users = loadUsers();
    const user = users.find(u => u.profile_id === profileId);
    if (!user) throw new Error('ユーザーが見つかりません');

    user.status = 'approved';
    user.approved_at = new Date().toISOString();
    user.auth_token = `token-${Date.now()}`;
    saveUsers(users);
    return { ...user };
  },

  async rejectUser(profileId: string): Promise<UserProfile> {
    await delay(500);
    const users = loadUsers();
    const user = users.find(u => u.profile_id === profileId);
    if (!user) throw new Error('ユーザーが見つかりません');

    user.status = 'rejected';
    saveUsers(users);
    return { ...user };
  },
};
