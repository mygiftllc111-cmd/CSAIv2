import { type Page } from '@playwright/test';

// LocalStorage keys (must match frontend constants)
const USER_TOKEN_KEY = 'csai_user_token';
const ADMIN_SESSION_KEY = 'csai_admin_session';

// Mock user tokens (must match mock data)
const APPROVED_USER_TOKEN = 'mock-token-user-001';
const PENDING_USER_TOKEN = 'user-002';
const REJECTED_USER_TOKEN = 'user-003';

// Admin credentials
const ADMIN_PASSWORD = 'dev-admin-2026!';

/**
 * Clear all browser storage. Must be called after a page.goto() so
 * the page context has access to localStorage.
 */
export async function clearAllStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set up an approved user session via localStorage, then navigate to /chat.
 */
export async function loginAsApprovedUser(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ([key, token]) => localStorage.setItem(key, token),
    [USER_TOKEN_KEY, APPROVED_USER_TOKEN] as const,
  );
  await page.goto('/chat');
  await page.waitForLoadState('networkidle');
}

/**
 * Set up a pending user session via localStorage, then navigate to /.
 */
export async function loginAsPendingUser(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ([key, token]) => localStorage.setItem(key, token),
    [USER_TOKEN_KEY, PENDING_USER_TOKEN] as const,
  );
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Set up a rejected user session via localStorage, then navigate to /.
 */
export async function loginAsRejectedUser(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ([key, token]) => localStorage.setItem(key, token),
    [USER_TOKEN_KEY, REJECTED_USER_TOKEN] as const,
  );
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Log in as admin via the login page UI.
 */
export async function loginAsAdmin(page: Page) {
  await clearAllStorage(page);
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('パスワード').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/admin', { timeout: 10000 });
}

/**
 * Log in as admin by setting localStorage directly (faster).
 */
export async function loginAsAdminDirect(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ([key]) => {
      const session = {
        session_id: 'admin-session-001',
        authenticated: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(session));
    },
    [ADMIN_SESSION_KEY] as const,
  );
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
}
