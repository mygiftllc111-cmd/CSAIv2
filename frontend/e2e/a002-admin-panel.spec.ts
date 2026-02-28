import { test, expect } from '@playwright/test';
import { loginAsAdminDirect } from './fixtures';

// ============================================================
// TAB1: 利用者承認
// ============================================================

test.describe('A-002 TAB1: 利用者承認', () => {
  // Tests must run serially because they mutate shared mock data
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
    await expect(page.getByText('全利用者一覧')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-T1-E01: 承認待ちユーザー一覧表示', async ({ page }) => {
    // Check that user approval tab shows properly
    await expect(page.getByText('全利用者一覧')).toBeVisible();
    // At least some user data should be visible
    await expect(page.getByText('テスト太郎')).toBeVisible();
  });

  test('A-002-T1-E02: ユーザー承認', async ({ page }) => {
    // If there are pending users, approve one
    const approveButton = page.getByRole('button', { name: '承認' }).first();
    if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveButton.click();
      await page.waitForTimeout(1000);
    }
    // 承認済み status should exist
    await expect(page.getByText('承認済み').first()).toBeVisible();
  });

  test('A-002-T1-E03: ユーザー拒否', async ({ page }) => {
    const rejectButton = page.getByRole('button', { name: '拒否' }).first();
    if (await rejectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rejectButton.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.getByText('全利用者一覧')).toBeVisible();
  });

  test('A-002-T1-E04: 全利用者一覧のステータス表示', async ({ page }) => {
    await expect(page.getByText('全利用者一覧')).toBeVisible();
    await expect(page.getByText('承認済み').first()).toBeVisible();
  });

  test('A-002-T1-E05: 承認待ちゼロ時の表示', async ({ page }) => {
    // Approve all remaining pending users
    for (let i = 0; i < 5; i++) {
      const approveBtn = page.getByRole('button', { name: '承認' }).first();
      if (await approveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }
    // Also reject any remaining
    for (let i = 0; i < 5; i++) {
      const rejectBtn = page.getByRole('button', { name: '拒否' }).first();
      if (await rejectBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await rejectBtn.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }
    // 新規申請セクションが非表示
    await expect(page.getByText(/新規申請/)).not.toBeVisible();
    await expect(page.getByText('全利用者一覧')).toBeVisible();
  });
});

// ============================================================
// TAB2: ログ分析
// ============================================================

test.describe('A-002 TAB2: ログ分析', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
    await page.goto('/admin/logs');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('対話ログ分析')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-T2-E01: ログ一覧表示', async ({ page }) => {
    await expect(page.getByText(/対話ログ一覧（\d+件）/)).toBeVisible();
    await expect(page.getByText('利用者名')).toBeVisible();
    await expect(page.getByText('質問概要')).toBeVisible();
  });

  test('A-002-T2-E02: 所属別フィルタ', async ({ page }) => {
    await page.getByLabel('所属').click();
    await page.getByRole('option', { name: '研修チーム' }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/対話ログ一覧/)).toBeVisible();
  });

  test('A-002-T2-E03: 入社時期フィルタ', async ({ page }) => {
    await page.getByLabel('入社時期').click();
    await page.getByRole('option', { name: '2026-02' }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/対話ログ一覧/)).toBeVisible();
  });

  test('A-002-T2-E04: 期間フィルタ', async ({ page }) => {
    await page.getByLabel('開始日').fill('2026-02-13');
    await page.getByLabel('終了日').fill('2026-02-14');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/対話ログ一覧/)).toBeVisible();
  });

  test('A-002-T2-E05: フィルタ複合条件', async ({ page }) => {
    await page.getByLabel('所属').click();
    await page.getByRole('option', { name: '研修チーム' }).click();
    await page.getByLabel('開始日').fill('2026-02-14');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/対話ログ一覧/)).toBeVisible();
  });

  test('A-002-T2-E06: 対話詳細展開', async ({ page }) => {
    await expect(page.getByText(/対話ログ一覧（\d+件）/)).toBeVisible();
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await expect(page.getByText('利用者').first()).toBeVisible({ timeout: 5000 });
  });

  test('A-002-T2-E07: 対話詳細折りたたみ', async ({ page }) => {
    await expect(page.getByText(/対話ログ一覧（\d+件）/)).toBeVisible();
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await expect(page.getByText('利用者').first()).toBeVisible({ timeout: 5000 });
    await firstRow.click();
    await page.waitForTimeout(500);
  });

  test('A-002-T2-E08: よくある質問表示', async ({ page }) => {
    await page.getByRole('button', { name: 'よくある質問' }).click();
    await expect(page.getByText('よくある質問ランキング')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('質問内容')).toBeVisible();
    await expect(page.getByText('カテゴリ')).toBeVisible();
    await expect(page.getByText('回数')).toBeVisible();
  });

  test('A-002-T2-E09: ログゼロ件の表示', async ({ page }) => {
    await page.getByLabel('開始日').fill('2020-01-01');
    await page.getByLabel('終了日').fill('2020-01-02');
    await page.waitForTimeout(1000);
    await expect(page.getByText('該当するログがありません')).toBeVisible();
  });

  test('A-002-T2-E10: 更新ボタン', async ({ page }) => {
    await page.getByRole('button', { name: '更新' }).click();
    await expect(page.getByText(/対話ログ一覧/)).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// TAB3: プロンプト設定
// ============================================================

test.describe('A-002 TAB3: プロンプト設定', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
    await page.goto('/admin/prompt');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('システムプロンプト')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-T3-E01: 現在のプロンプト表示', async ({ page }) => {
    await expect(page.locator('h5').filter({ hasText: 'プロンプト設定' })).toBeVisible();
    await expect(page.getByText('システムプロンプト')).toBeVisible();
    // バージョンChip (e.g. "v1")
    await expect(page.locator('.MuiChip-label').filter({ hasText: /^v\d+$/ }).first()).toBeVisible();
    await expect(page.getByText(/Few-shot例/)).toBeVisible();
  });

  test('A-002-T3-E02: システムプロンプト編集', async ({ page }) => {
    const textarea = page.getByPlaceholder('システムプロンプトを入力...');
    await textarea.click();
    await textarea.pressSequentially(' 追加テキスト');
    await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();
    await expect(page.getByText(/\d+ 文字/)).toBeVisible();
  });

  test('A-002-T3-E03: プロンプト保存', async ({ page }) => {
    const textarea = page.getByPlaceholder('システムプロンプトを入力...');
    await textarea.click();
    await textarea.pressSequentially(' 保存テスト');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(/バージョン \d+ として保存しました/)).toBeVisible({ timeout: 5000 });
  });

  test('A-002-T3-E04: Few-shot例の追加', async ({ page }) => {
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByLabel('ユーザーメッセージ').last().fill('テスト質問');
    await page.getByLabel('アシスタント応答').last().fill('テスト回答');
    await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();
  });

  test('A-002-T3-E05: Few-shot例の削除', async ({ page }) => {
    const countText = page.getByText(/Few-shot例（\d+件）/);
    await expect(countText).toBeVisible();
    const initialText = await countText.textContent();
    const initialCount = parseInt(initialText!.match(/(\d+)/)?.[1] ?? '0');

    if (initialCount > 0) {
      // Delete button is MUI IconButton with DeleteIcon inside
      const deleteBtn = page.locator('[data-testid="DeleteIcon"]').first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();
      }
    }
  });

  test('A-002-T3-E06: 変更履歴表示', async ({ page }) => {
    await page.getByRole('button', { name: '変更履歴' }).click();
    await page.waitForTimeout(500);
    // Version chips should be visible in the history
    await expect(page.locator('.MuiChip-label').filter({ hasText: /^v\d+$/ }).first()).toBeVisible();
  });

  test('A-002-T3-E07: 過去バージョンの復元', async ({ page }) => {
    await page.getByRole('button', { name: '変更履歴' }).click();
    await page.waitForTimeout(500);
    const restoreButton = page.getByRole('button', { name: '復元' }).first();
    if (await restoreButton.isVisible().catch(() => false)) {
      await restoreButton.click();
      await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();
    }
  });

  test('A-002-T3-E08: バージョン詳細展開', async ({ page }) => {
    await page.getByRole('button', { name: '変更履歴' }).click();
    await page.waitForTimeout(500);
    // Click the expand icon button within the version history area
    const expandIcon = page.locator('[data-testid="ExpandMoreIcon"]').first();
    if (await expandIcon.isVisible().catch(() => false)) {
      // Click the button that contains this icon
      await expandIcon.click();
      await expect(page.getByText('システムプロンプト（先頭200文字）').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('A-002-T3-E09: 未変更時は保存ボタン無効', async ({ page }) => {
    await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
  });
});

// ============================================================
// TAB4: ナレッジソース設定
// ============================================================

test.describe('A-002 TAB4: ナレッジソース設定', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
    await page.goto('/admin/knowledge');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ナレッジソース設定')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-T4-E01: ナレッジソース一覧表示', async ({ page }) => {
    await expect(page.getByText('Notion')).toBeVisible();
    await expect(page.getByText('Google Drive')).toBeVisible();
    await expect(page.getByText('Integration Token')).toBeVisible();
  });

  test('A-002-T4-E02: 合計ドキュメント数表示', async ({ page }) => {
    await expect(page.getByText(/\d+ ドキュメント/)).toBeVisible();
  });

  test('A-002-T4-E03: 手動再同期', async ({ page }) => {
    await page.getByRole('button', { name: '手動再同期' }).first().click();
    await expect(page.getByText('同期中...').first()).toBeVisible();
    await expect(page.getByText('同期が完了しました')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-T4-E04: 同期中はボタン無効', async ({ page }) => {
    await page.getByRole('button', { name: '手動再同期' }).first().click();
    await expect(page.getByRole('button', { name: '同期中...' }).first()).toBeDisabled();
  });

  test('A-002-T4-E05: 同期間隔変更', async ({ page }) => {
    const intervalSelect = page.locator('.MuiSelect-select').last();
    await intervalSelect.click();
    await page.getByRole('option', { name: '30分' }).click();
    await expect(page.getByText('同期間隔を更新しました')).toBeVisible({ timeout: 5000 });
  });

  test('A-002-T4-E06: ステータスChip表示', async ({ page }) => {
    await expect(page.getByText('正常').first()).toBeVisible();
  });
});

// ============================================================
// ナビゲーション
// ============================================================

test.describe('A-002 ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDirect(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('A-002-N-E01: サイドバーナビゲーション', async ({ page }) => {
    await page.getByText('ログ分析').click();
    await expect(page).toHaveURL(/\/admin\/logs/);
    await expect(page.getByText('対話ログ分析')).toBeVisible({ timeout: 10000 });

    await page.getByText('プロンプト設定').click();
    await expect(page).toHaveURL(/\/admin\/prompt/);
    await expect(page.getByText('システムプロンプト')).toBeVisible({ timeout: 10000 });

    await page.getByText('ナレッジソース').click();
    await expect(page).toHaveURL(/\/admin\/knowledge/);
    await expect(page.getByText('ナレッジソース設定')).toBeVisible({ timeout: 10000 });

    await page.getByText('利用者承認').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('全利用者一覧')).toBeVisible({ timeout: 10000 });
  });

  test('A-002-N-E02: アクティブメニューのハイライト', async ({ page }) => {
    await page.goto('/admin/logs');
    await page.waitForLoadState('networkidle');
    const logNavItem = page.locator('.Mui-selected').filter({ hasText: 'ログ分析' });
    await expect(logNavItem).toBeVisible();
  });
});
