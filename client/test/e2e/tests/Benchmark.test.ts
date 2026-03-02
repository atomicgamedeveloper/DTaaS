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

  test.afterEach(async ({ page }) => {
    const stopButton = page.getByRole('button', { name: 'Stop', exact: true });
    if (await stopButton.isVisible()) {
      await stopButton.click();
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: 'Stop' }).click();
      }
    }
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

  test('Should remain running after navigating to settings and back, then stop', async ({
    page,
  }) => {
    // Start the benchmark
    await page.getByRole('button', { name: 'Start', exact: true }).click();

    // Verify benchmark is running (Stop button replaces Start)
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeVisible();

    // Navigate to Settings
    await page.getByLabel('Open settings').click();
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(
      page.getByRole('button', { name: 'Save Settings' }),
    ).toBeVisible();

    // Return to benchmark page using browser back (avoids full reload that resets module state)
    await page.goBack();
    await expect(page).toHaveURL(/insight\/measure/);

    // Verify benchmark is still running
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeVisible();

    // Stop the benchmark
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Stop' })
      .click();

    // Verify benchmark has stopped (Stop button replaced by Start or Continue)
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).not.toBeVisible();
  });
});
