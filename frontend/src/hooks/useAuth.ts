import { create } from 'zustand';
import type { UserProfile, AdminSession, ProfileSubmission } from '@/types/index.ts';
import { authService } from '@/services/index.ts';

interface AuthStore {
  userProfile: UserProfile | null;
  adminSession: AdminSession | null;
  isLoading: boolean;
  error: string | null;
  submitProfile: (data: ProfileSubmission) => Promise<void>;
  checkStatus: () => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuth = create<AuthStore>((set) => ({
  userProfile: null,
  adminSession: null,
  isLoading: true,
  error: null,

  submitProfile: async (data: ProfileSubmission) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await authService.submitProfile(data);
      set({ userProfile: profile, isLoading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : '申請に失敗しました';
      set({ error: message, isLoading: false });
      throw e;
    }
  },

  checkStatus: async () => {
    set({ isLoading: true });
    try {
      const profile = await authService.checkStatus();
      const adminSession = await authService.getAdminSession();
      set({ userProfile: profile, adminSession, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  adminLogin: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.adminLogin(password);
      set({ adminSession: session, isLoading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'ログインに失敗しました';
      set({ error: message, isLoading: false });
      throw e;
    }
  },

  adminLogout: async () => {
    await authService.adminLogout();
    set({ adminSession: null });
  },

  logout: () => {
    authService.logout();
    set({ userProfile: null, adminSession: null });
  },

  clearError: () => set({ error: null }),
}));
