import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

// Increase the test timeout to 5 minutes
test.setTimeout(300000);

test.describe('Digital Twin Log Cleaning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page and authenticate
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();

    // Navigate directly to the Digital Twins page
    await page.goto('./preview/digitaltwins');

    // Navigate to the Execute tab
    await page.getByRole('tab', { name: 'Execute' }).click();

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  // @slow - This test requires waiting for actual GitLab pipeline execution
  test('Execute Digital Twin and verify log cleaning', async ({ page }) => {
    // Find the Hello world Digital Twin card
    const helloWorldCard = page
      .locator('.MuiPaper-root:has-text("Hello world")')
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Get the Start button
    const startButton = helloWorldCard.getByRole('button', { name: 'Start' }).first();
    await expect(startButton).toBeVisible();

    // Start the execution
    await startButton.click();

    // Wait a bit for the execution to start
    await page.waitForTimeout(2000);

    // Click the History button
    const historyButton = helloWorldCard.getByRole('button', { name: 'History' }).first();
    await expect(historyButton).toBeEnabled({ timeout: 5000 });
    await historyButton.click();

    // Verify that the execution history dialog is displayed
    const historyDialog = page.locator('div[role="dialog"]');
    await expect(historyDialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Execution History' })).toBeVisible();

    // This is more stable than a polling loop
    const completedExecution = historyDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    await completedExecution.waitFor({ timeout: 35000 });

    // View the logs for the completed execution
    await completedExecution.getByLabel('view').click();

    // Verify that the logs dialog shows the execution details
    await expect(page.getByRole('heading', { name: 'create_hello-world' })).toBeVisible();

    // Verify logs content is loaded and properly cleaned
    const logsPanel = page.locator('div[role="tabpanel"]').filter({ hasText: /Running with gitlab-runner/ });
    await expect(logsPanel).toBeVisible({ timeout: 10000 });

    // Get the log content
    const logContent = await logsPanel.textContent();

    // Verify log cleaning
    expect(logContent).not.toBeNull();
    if (logContent) {
      // Verify ANSI escape codes are removed
      // eslint-disable-next-line no-control-regex
      expect(logContent).not.toMatch(/\u001b\[[0-9;]*[mK]/);
      expect(logContent).not.toMatch(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/,
      );

      // Verify GitLab section markers are removed
      expect(logContent).not.toMatch(/section_start:[0-9]+:[a-zA-Z0-9_-]+/);
      expect(logContent).not.toMatch(/section_end:[0-9]+:[a-zA-Z0-9_-]+/);
    }

    // Go back to history view
    await page.getByRole('tab', { name: 'History' }).click();

    // Clean up by deleting the execution
    await completedExecution.getByLabel('delete').click();

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Verify the dialog is closed
    await expect(historyDialog).not.toBeVisible();
  });
});
