import { test, expect } from '@playwright/test';

const DEFAULT_SETTINGS = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
};

test.describe('Account Settings Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();
    await page.getByLabel('Open settings').click();
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
  });

  test('Should save new settings', async ({ page }) => {
    await page.getByLabel('Group Name').fill('DTaaStest');
    await page.getByLabel('DT Directory').fill('digital_twinstest');
    await page.getByLabel('Common Library Project name').fill('foo');
    await page.getByLabel('Runner Tag').fill('bar');
    await page.getByRole('button', { name: 'Save Settings' }).click();

    await page.getByRole('tab', { name: 'Profile' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();

    await expect(page.getByLabel('Group Name')).toHaveValue('DTaaStest');
    await expect(page.getByLabel('DT Directory')).toHaveValue(
      'digital_twinstest',
    );
    await expect(page.getByLabel('Common Library Project name')).toHaveValue(
      'foo',
    );
    await expect(page.getByLabel('Runner Tag')).toHaveValue('bar');
  });

  test('Should reset to default settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();

    await expect(page.getByLabel('Group Name')).toHaveValue(
      DEFAULT_SETTINGS.GROUP_NAME,
    );
    await expect(page.getByLabel('DT Directory')).toHaveValue(
      DEFAULT_SETTINGS.DT_DIRECTORY,
    );
    await expect(page.getByLabel('Common Library Project name')).toHaveValue(
      DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
    );
    await expect(page.getByLabel('Runner Tag')).toHaveValue(
      DEFAULT_SETTINGS.RUNNER_TAG,
    );
  });
});
