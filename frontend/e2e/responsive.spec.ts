import { test, expect } from '@playwright/test';
import { loginAsAdminDirect } from './fixtures';

test.describe('A-002 レスポンシブ・レイアウト', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
  });

  test('A-002-R-E01: モバイルでのサイドバー表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    // サイドバーが隠れている
    await expect(page.getByText('管理メニュー')).not.toBeVisible();
    // ハンバーガーメニューをクリック
    await page.getByRole('button', { name: 'メニュー' }).click();
    // サイドバーがオーバーレイとして表示
    await expect(page.getByText('管理メニュー')).toBeVisible();
    await expect(page.getByText('利用者承認')).toBeVisible();
  });

  test('A-002-R-E02: モバイルでのサイドバー自動閉じ', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    // ハンバーガーメニューを開く
    await page.getByRole('button', { name: 'メニュー' }).click();
    await expect(page.getByText('管理メニュー')).toBeVisible();
    // メニュー項目をクリック
    await page.getByText('ログ分析').click();
    // サイドバーが自動的に閉じる
    await expect(page.getByText('管理メニュー')).not.toBeVisible({ timeout: 3000 });
    // ページが正しく表示
    await expect(page.getByText('対話ログ分析')).toBeVisible();
  });

  test('A-002-R-E03: デスクトップでのサイドバー常時表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // サイドバーが常時表示
    await expect(page.getByText('管理メニュー')).toBeVisible();
    await expect(page.getByText('利用者承認')).toBeVisible();
    await expect(page.getByText('ログ分析')).toBeVisible();
    await expect(page.getByText('プロンプト設定')).toBeVisible();
    await expect(page.getByText('ナレッジソース')).toBeVisible();
  });

  test('A-002-N-E03: 管理者バッジ表示', async ({ page }) => {
    // ヘッダーに管理者Chipが表示
    await expect(page.getByText('管理者').first()).toBeVisible();
  });
});
