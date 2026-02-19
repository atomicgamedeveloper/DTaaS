import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

test.describe('Benchmark Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();

    // Navigate to benchmark page
    await page.goto('./insight/measure');
  });

  test('Should navigate to benchmark page successfully', async ({ page }) => {
    // Verify page loaded correctly (not 404)
    await expect(page.locator('text=404 Not Found')).not.toBeVisible();

    // Verify correct URL
    await expect(page).toHaveURL(/insight\/measure/);

    // Verify page title renders (basic smoke test)
    await expect(
      page.getByRole('heading', { name: 'Digital Twin Benchmark' }),
    ).toBeVisible();
  });

  test('Should manage button states correctly', async ({ page }) => {
    // Verify initial button states
    const startButton = page.getByRole('button', {
      name: 'Start',
      exact: true,
    });
    const restartButton = page.getByRole('button', {
      name: 'Restart',
      exact: true,
    });
    const purgeButton = page.getByRole('button', {
      name: 'Purge',
      exact: true,
    });

    await expect(startButton).toBeEnabled();
    await expect(restartButton).toBeDisabled();
    await expect(purgeButton).toBeEnabled();
  });
});
