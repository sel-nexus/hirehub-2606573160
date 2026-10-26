import { expect, test } from '@playwright/test';

test.describe('demo administrator access journey', () => {
  test('gates the dashboard, accepts fixed demo credentials, and logs out', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

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
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test('does not inherit the demo session into a newly opened tab', async ({ browser, baseURL }) => {
    const firstContext = await browser.newContext();
    const firstPage = await firstContext.newPage();
    await firstPage.goto(`${baseURL}/admin`);
    await firstPage.getByLabel('Username').fill('admin');
    await firstPage.getByLabel('Password').fill('admin');
    await firstPage.getByRole('button', { name: 'Login' }).click();
    await expect(firstPage.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();

    const newTab = await firstContext.newPage();
    await newTab.goto(`${baseURL}/admin`);
    await expect(newTab.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await firstContext.close();
  });
});
