import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

// Increase the test timeout to 5 minutes
test.setTimeout(300000);

test.describe('Concurrent Execution', () => {
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
  test('should start multiple executions concurrently and view logs', async ({
    page,
  }) => {
    // Find the Hello world Digital Twin card
    const helloWorldCard = page
      .locator('.MuiPaper-root:has-text("Hello world")')
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();
    await expect(startButton).toBeVisible();

    // Start the first execution
    await startButton.click();

    // Wait a bit for the execution to start
    await page.waitForTimeout(2000);

    // Start a second execution
    await startButton.click();

    // Wait a bit for the second execution to start
    await page.waitForTimeout(2000);

    // Click the History button
    const historyButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(historyButton).toBeEnabled({ timeout: 5000 });
    await historyButton.click();

    // Verify that the execution history dialog is displayed
    const historyDialog = page.locator('div[role="dialog"]');
    await expect(historyDialog).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Execution History' }),
    ).toBeVisible();

    // Verify that there are at least 2 executions in the history
    const executionItems = historyDialog.locator('li');
    const count = await executionItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Wait for at least one execution to complete
    // This may take some time as it depends on the GitLab pipeline

    // Use Playwright's built-in waiting mechanism for more stability
    const completedSelector = historyDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    await completedSelector.waitFor({ timeout: 35000 });

    // For the first completed execution, view the logs
    const firstCompletedExecution = historyDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    await firstCompletedExecution.getByLabel('view').click();

    // Verify that the logs dialog shows the execution details
    await expect(
      page.getByRole('heading', { name: 'create_hello-world' }),
    ).toBeVisible();

    // Verify logs content is loaded
    const logsPanel = page
      .locator('div[role="tabpanel"]')
      .filter({ hasText: /Running with gitlab-runner/ });
    await expect(logsPanel).toBeVisible({ timeout: 10000 });

    // Wait a bit to ensure both executions have time to complete
    await page.waitForTimeout(1500);

    // Go back to history view
    await page.getByRole('tab', { name: 'History' }).click();

    // Check another execution's logs if available
    const secondExecution = historyDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .nth(1);

    if ((await secondExecution.count()) > 0) {
      await secondExecution.getByLabel('view').click();

      // Verify logs for second execution
      await expect(
        page.getByRole('heading', { name: 'create_hello-world' }),
      ).toBeVisible();
      await expect(
        page.locator('div[role="tabpanel"]').filter({
          hasText: /Running with gitlab-runner/,
        }),
      ).toBeVisible({ timeout: 10000 });

      // Go back to history view
      await page.getByRole('tab', { name: 'History' }).click();
    }

    // Get all completed executions
    const completedExecutions = historyDialog.locator('li').filter({
      hasText: /Status: (Completed|Failed|Canceled)/,
    });

    const completedCount = await completedExecutions.count();

    // Delete each completed execution
    // Instead of a loop, use a recursive function to avoid linting issues
    const deleteCompletedExecutions = async (
      remainingCount: number,
    ): Promise<void> => {
      if (remainingCount <= 0) return;

      // Always delete the first one since the list gets rerendered after each deletion
      const execution = historyDialog
        .locator('li')
        .filter({
          hasText: /Status: (Completed|Failed|Canceled)/,
        })
        .first();

      await execution.getByLabel('delete').click();
      await page.waitForTimeout(500); // Wait a bit for the UI to update

      // Recursive call with decremented count
      await deleteCompletedExecutions(remainingCount - 1);
    };

    // Start the recursive deletion
    await deleteCompletedExecutions(completedCount);

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Verify the dialog is closed
    await expect(historyDialog).not.toBeVisible();
  });

  test('should persist execution history across page reloads', async ({
    page,
  }) => {
    // Find the Hello world Digital Twin card
    const helloWorldCard = page
      .locator('.MuiPaper-root:has-text("Hello world")')
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();

    // Start an execution
    await startButton.click();

    // Wait a bit for the execution to start
    await page.waitForTimeout(2000);

    // Click the History button to check execution status
    const preReloadHistoryButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(preReloadHistoryButton).toBeEnabled({ timeout: 5000 });
    await preReloadHistoryButton.click();

    // Verify that the execution history dialog is displayed
    const preReloadHistoryDialog = page.locator('div[role="dialog"]');
    await expect(preReloadHistoryDialog).toBeVisible();

    await preReloadHistoryDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first()
      .waitFor({ timeout: 35000 });

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Reload the page
    await page.reload();

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Navigate to the Execute tab again
    await page.getByRole('tab', { name: 'Execute' }).click();

    // Wait for the Digital Twin card to be visible
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Click the History button
    const postReloadHistoryButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(postReloadHistoryButton).toBeEnabled({ timeout: 5000 });
    await postReloadHistoryButton.click();

    // Verify that the execution history dialog is displayed
    const postReloadHistoryDialog = page.locator('div[role="dialog"]');
    await expect(postReloadHistoryDialog).toBeVisible();

    // Verify that there is at least 1 execution in the history
    const postReloadExecutionItems = postReloadHistoryDialog.locator('li');
    const postReloadCount = await postReloadExecutionItems.count();
    expect(postReloadCount).toBeGreaterThanOrEqual(1);

    // Use Playwright's built-in waiting mechanism for more stability
    const completedSelector = postReloadHistoryDialog
      .locator('li')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    await completedSelector.waitFor({ timeout: 35000 });

    // Clean up by deleting the execution
    const deleteButton = completedSelector.getByLabel('delete');
    await deleteButton.click();

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
