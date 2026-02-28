import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsAdminDirect, clearAllStorage } from './fixtures';

test.describe('A-001 管理者ログイン', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
  });

  test('A-001-E01: 正しいパスワードでログイン成功', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('パスワード').fill('dev-admin-2026!');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 });
    // 管理画面が表示される
    await expect(page.getByText('全利用者一覧')).toBeVisible({ timeout: 10000 });
  });

  test('A-001-E02: 誤ったパスワードでエラー表示', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('パスワード').fill('wrong-password');
    await page.getByRole('button', { name: 'ログイン' }).click();
    // エラーアラート表示
    await expect(page.getByText('パスワードが正しくありません')).toBeVisible({ timeout: 5000 });
    // ページ遷移なし
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('A-001-E03: 空パスワードではログインボタン無効', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    const loginButton = page.getByRole('button', { name: 'ログイン' });
    await expect(loginButton).toBeDisabled();
  });

  test('A-001-E04: セッション保持による自動ログイン', async ({ page }) => {
    // ログイン（localStorage直接設定）
    await loginAsAdminDirect(page);
    await expect(page.getByText('全利用者一覧')).toBeVisible({ timeout: 10000 });
    // 再アクセスしても管理画面が表示される
    await page.goto('/admin');
    await expect(page.getByText('全利用者一覧')).toBeVisible({ timeout: 10000 });
  });

  test('A-001-E05: ログアウト', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'ログアウト' }).click();
    // /admin/login にリダイレクト
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 5000 });
  });

  test('A-001-E06: 未ログインで管理画面アクセス拒否', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    // /admin/login にリダイレクト
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
