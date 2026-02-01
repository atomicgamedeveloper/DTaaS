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
    await page.goto('./admin/measure');
  });

  test('Should navigate to benchmark page successfully', async ({ page }) => {
    // Verify page loaded correctly (not 404)
    await expect(page.locator('text=404 Not Found')).not.toBeVisible();

    // Verify correct URL
    await expect(page).toHaveURL(/admin\/measure/);

    // Verify page title renders (basic smoke test)
    await expect(
      page.getByRole('heading', { name: 'Digital Twin Benchmark' }),
    ).toBeVisible();
  });

  test('Should update form input values', async ({ page }) => {
    // Test iterations input
    const iterationsInput = page.getByLabel('Trials');
    await iterationsInput.fill('5');
    await expect(iterationsInput).toHaveValue('5');

    // Change to another value
    await iterationsInput.fill('10');
    await expect(iterationsInput).toHaveValue('10');

    // Test secondary runner tag input
    const runnerTagInput = page.getByLabel('Secondary Runner Tag');
    await runnerTagInput.fill('custom-runner-tag');
    await expect(runnerTagInput).toHaveValue('custom-runner-tag');

    // Clear and enter new value
    await runnerTagInput.fill('');
    await runnerTagInput.fill('another-tag');
    await expect(runnerTagInput).toHaveValue('another-tag');
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

  test('Should display tooltip on secondary runner tag hover', async ({
    page,
  }) => {
    const runnerTagInput = page.getByLabel('Secondary Runner Tag');
    await runnerTagInput.hover();

    // Wait for tooltip to appear
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 3000 });
  });
});
