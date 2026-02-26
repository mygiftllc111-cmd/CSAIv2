import type { UserProfile, ProfileSubmission, AdminSession } from '@/types/index.ts';
import apiClient, { getApiErrorMessage } from './client.ts';

const USER_TOKEN_KEY = 'csai_user_token';
const ADMIN_SESSION_KEY = 'csai_admin_session';

export const apiAuthService = {
  async submitProfile(data: ProfileSubmission): Promise<UserProfile> {
    try {
      const res = await apiClient.post('/auth/profile', data);
      const profile: UserProfile = res.data;
      // pending状態ではauth_tokenがないのでprofile_idを保存
      localStorage.setItem(USER_TOKEN_KEY, profile.profile_id);
      return profile;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async checkStatus(): Promise<UserProfile | null> {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (!token) return null;

    try {
      const res = await apiClient.get('/auth/status');
      const profile: UserProfile = res.data;
      // 承認済みでauth_tokenが返ってきたら、tokenを更新
      if (profile.auth_token) {
        localStorage.setItem(USER_TOKEN_KEY, profile.auth_token);
      }
      return profile;
    } catch {
      // 404 or 401: ユーザーが見つからない → null
      return null;
    }
  },

  async adminLogin(password: string): Promise<AdminSession> {
    try {
      const res = await apiClient.post('/admin/login', { password });
      const session: AdminSession = res.data;
      // Cookie自動設定 + LocalStorageにも保存（getAdminSession用）
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      return session;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async adminLogout(): Promise<void> {
    try {
      await apiClient.post('/admin/logout');
    } catch {
      // ログアウト失敗時もローカルはクリア
    }
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

  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const res = await apiClient.get('/admin/users/pending');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const res = await apiClient.get('/admin/users');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async approveUser(profileId: string): Promise<UserProfile> {
    try {
      const res = await apiClient.put(`/admin/users/${profileId}/approve`);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async rejectUser(profileId: string): Promise<UserProfile> {
    try {
      const res = await apiClient.put(`/admin/users/${profileId}/reject`);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
