import { expect, test, type Page } from '@playwright/test';

let browserErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
});

test.afterEach(() => {
  expect(browserErrors).toEqual([]);
});

test.describe('demo administrator access journey', () => {
  test('gates the dashboard, accepts fixed demo credentials, and logs out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Submissions Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();

    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid credentials. Please try again.');
    expect(await page.evaluate(() => sessionStorage.getItem('hirehub_admin_auth'))).toBeNull();

    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('hirehub_admin_auth'))).toBe('true');
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => sessionStorage.getItem('hirehub_admin_auth'))).toBeNull();
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  });

  test('does not inherit the demo session into a newly opened tab', async ({ browser, baseURL }) => {
    const errors: string[] = [];
    const captureErrors = (targetPage: Page) => {
      targetPage.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      targetPage.on('pageerror', (error) => errors.push(error.message));
    };
    const firstContext = await browser.newContext();
    const firstPage = await firstContext.newPage();
    captureErrors(firstPage);
    await firstPage.goto(`${baseURL}/admin`);
    await firstPage.getByLabel('Username').fill('admin');
    await firstPage.getByLabel('Password').fill('admin');
    await firstPage.getByRole('button', { name: 'Login' }).click();
    await expect(firstPage.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();

    const newTab = await firstContext.newPage();
    captureErrors(newTab);
    await newTab.goto(`${baseURL}/admin`);
    await expect(newTab.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    expect(errors).toEqual([]);
    await firstContext.close();
  });
});
