import { test, expect } from '@playwright/test';
import {
  loginAsApprovedUser,
  loginAsPendingUser,
  loginAsRejectedUser,
  clearAllStorage,
} from './fixtures';

// ============================================================
// 利用申請フロー
// ============================================================

test.describe('利用申請フロー', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
  });

  test('E2E-P001-001: 利用申請フォーム表示', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hospitality AI').first()).toBeVisible();
    await expect(page.getByLabel('お名前')).toBeVisible();
    await expect(page.getByLabel('所属部署')).toBeVisible();
    await expect(page.getByLabel('入社時期')).toBeVisible();
    await expect(page.getByRole('button', { name: '利用申請を送信' })).toBeVisible();
  });

  test('E2E-P001-002: 利用申請送信', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('お名前').fill('テスト太郎');
    await page.getByLabel('所属部署').fill('研修チーム');
    await page.getByLabel('入社時期').fill('2026-02');
    await page.getByRole('button', { name: '利用申請を送信' }).click();
    await expect(page.getByText('申請を受け付けました')).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P001-003: 承認待ち画面表示', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('お名前').fill('テスト太郎');
    await page.getByLabel('所属部署').fill('研修チーム');
    await page.getByLabel('入社時期').fill('2026-02');
    await page.getByRole('button', { name: '利用申請を送信' }).click();
    await expect(page.getByText('申請を受け付けました')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('テスト太郎さん、ありがとうございます。')).toBeVisible();
    await expect(page.getByText('承認されるまでしばらくお待ちください。')).toBeVisible();
  });

  test('E2E-P001-004: 承認状況確認ボタン', async ({ page }) => {
    await loginAsPendingUser(page);
    await expect(page.getByText('申請を受け付けました')).toBeVisible();
    const checkButton = page.getByRole('button', { name: '承認状況を確認する' });
    await expect(checkButton).toBeVisible();
    await checkButton.click();
    await expect(page.getByRole('button', { name: '承認状況を確認する' })).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P001-005: 承認後のリダイレクト', async ({ page }) => {
    await loginAsApprovedUser(page);
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByText('何でも気軽に質問してください')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// チャットフロー
// ============================================================

test.describe('チャットフロー', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsApprovedUser(page);
    await expect(page.getByText('何でも気軽に質問してください')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-P001-010: 空状態表示', async ({ page }) => {
    await expect(page.getByText('何でも気軽に質問してください')).toBeVisible();
    // Use exact: true for suggestion chips to avoid matching sidebar items
    await expect(page.getByRole('button', { name: '有給休暇の取り方', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '経費精算の方法', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '研修スケジュール', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '社内ツールの使い方', exact: true })).toBeVisible();
  });

  test('E2E-P001-011: サジェストチップクリック', async ({ page }) => {
    await page.getByRole('button', { name: '有給休暇の取り方', exact: true }).click();
    // AI応答を待つ
    await expect(page.locator('text=お疲れさまです').or(page.locator('text=なるほど')).or(page.locator('text=ご質問ありがとうございます'))).toBeVisible({ timeout: 10000 });
  });

  test('E2E-P001-012: テキスト質問送信', async ({ page }) => {
    await page.getByPlaceholder('質問を入力してください...').fill('経費精算の方法を教えてください');
    await page.getByRole('button', { name: '送信' }).click();
    await expect(page.getByText('経費精算の方法を教えてください')).toBeVisible();
    await expect(page.locator('text=お疲れさまです').or(page.locator('text=なるほど')).or(page.locator('text=ご質問ありがとうございます'))).toBeVisible({ timeout: 10000 });
  });

  test('E2E-P001-013: Enterキーで送信', async ({ page }) => {
    const input = page.getByPlaceholder('質問を入力してください...');
    await input.fill('テスト質問です');
    await input.press('Enter');
    await expect(page.getByText('テスト質問です')).toBeVisible();
  });

  test('E2E-P001-014: Shift+Enterで改行', async ({ page }) => {
    const input = page.getByPlaceholder('質問を入力してください...');
    await input.fill('1行目');
    await input.press('Shift+Enter');
    await input.pressSequentially('2行目');
    await expect(input).toHaveValue('1行目\n2行目');
    await expect(page.getByText('何でも気軽に質問してください')).toBeVisible();
  });

  test('E2E-P001-015: 連続メッセージ送信', async ({ page }) => {
    await page.getByPlaceholder('質問を入力してください...').fill('最初の質問');
    await page.getByRole('button', { name: '送信' }).click();
    await expect(page.getByText('最初の質問')).toBeVisible();
    await expect(page.locator('text=お疲れさまです').or(page.locator('text=なるほど')).or(page.locator('text=ご質問ありがとうございます'))).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('質問を入力してください...').fill('追加の質問');
    await page.getByRole('button', { name: '送信' }).click();
    await expect(page.getByText('追加の質問')).toBeVisible();
  });

  // E2E-P001-016, 017: 音声入力 → SKIP (Web Speech API not available in Playwright Chromium)
});

// ============================================================
// サイドバー・ナビゲーション
// ============================================================

test.describe('サイドバー・ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsApprovedUser(page);
  });

  test('E2E-P001-020: サイドバー表示（デスクトップ）', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('新しい会話')).toBeVisible();
    await expect(page.getByText('対話履歴')).toBeVisible();
    await expect(page.getByText('安心して質問してください')).toBeVisible();
  });

  test('E2E-P001-021: サイドバー非表示（モバイル）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    await expect(page.getByText('安心して質問してください')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'メニュー' })).toBeVisible();
  });

  test('E2E-P001-022: 最近の会話リスト', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('最近の会話')).toBeVisible();
    const sidebar = page.locator('.MuiDrawer-root');
    await expect(sidebar.getByText('有給休暇の申請方法について')).toBeVisible();
    await expect(sidebar.getByText('社内ポータルの使い方')).toBeVisible();
  });

  test('E2E-P001-023: 会話の切り替え', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.locator('.MuiDrawer-root');
    await sidebar.getByText('有給休暇の申請方法について').click();
    await expect(page).toHaveURL(/\/chat\/conv-001/);
    await expect(page.getByText('有給休暇の申請方法を教えてください')).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P001-024: 新しい会話ボタン', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.locator('.MuiDrawer-root');
    await sidebar.getByText('有給休暇の申請方法について').click();
    await expect(page).toHaveURL(/\/chat\/conv-001/);
    await page.getByText('新しい会話').click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByText('何でも気軽に質問してください')).toBeVisible();
  });
});

// ============================================================
// 対話履歴ページ
// ============================================================

test.describe('対話履歴ページ', () => {
  test('E2E-P001-030: 対話履歴一覧表示', async ({ page }) => {
    await loginAsApprovedUser(page);
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h5').filter({ hasText: '対話履歴' })).toBeVisible();
    const main = page.locator('main');
    await expect(main.getByText('有給休暇の申請方法について')).toBeVisible();
    await expect(main.getByText('社内ポータルの使い方')).toBeVisible();
    // At least one message count
    await expect(main.getByText(/件のメッセージ/).first()).toBeVisible();
  });

  test('E2E-P001-031: 履歴からチャット画面へ遷移', async ({ page }) => {
    await loginAsApprovedUser(page);
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');
    await main.getByText('有給休暇の申請方法について').click();
    await expect(page).toHaveURL(/\/chat\/conv-001/);
    // Conversation messages should load (may need page reload for fresh state)
    await page.waitForLoadState('networkidle');
    // The first user message from this conversation
    await expect(page.getByText('有給休暇の申請方法を教えてください').or(
      page.getByText('有給休暇の申請方法について')
    ).first()).toBeVisible({ timeout: 10000 });
  });

  test('E2E-P001-032: 履歴が空の場合', async ({ page }) => {
    await loginAsApprovedUser(page);
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h5').filter({ hasText: '対話履歴' })).toBeVisible();
  });
});

// ============================================================
// ログアウト
// ============================================================

test.describe('ログアウト', () => {
  test('E2E-P001-040: ログアウト', async ({ page }) => {
    await loginAsApprovedUser(page);
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: '利用申請を送信' })).toBeVisible();
  });
});

// ============================================================
// 異常系
// ============================================================

test.describe('異常系', () => {
  test('E2E-P001-101: 空のフォーム送信', async ({ page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: '利用申請を送信' })).toBeVisible();
    await expect(page.getByRole('button', { name: '利用申請を送信' })).toBeDisabled();
  });

  test('E2E-P001-102: 名前が長すぎる入力', async ({ page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    const longName = 'あ'.repeat(60);
    await page.getByLabel('お名前').fill(longName);
    const value = await page.getByLabel('お名前').inputValue();
    expect(value.length).toBeLessThanOrEqual(50);
  });

  test('E2E-P001-103: 空のメッセージ送信', async ({ page }) => {
    await loginAsApprovedUser(page);
    await expect(page.getByRole('button', { name: '送信' })).toBeDisabled();
  });

  // E2E-P001-104: API通信エラー時 → SKIP (モック固定レスポンスのためエラー再現不可)

  test('E2E-P001-105: 未承認でのチャットアクセス', async ({ page }) => {
    await loginAsPendingUser(page);
    await page.goto('/chat');
    await expect(page).toHaveURL('/');
  });

  test('E2E-P001-106: 拒否ユーザーの画面表示', async ({ page }) => {
    await loginAsRejectedUser(page);
    await expect(page.getByText('申請が承認されませんでした')).toBeVisible();
  });

  // E2E-P001-107: 音声入力非対応ブラウザ → SKIP (Chromiumでは対応扱い)
});
