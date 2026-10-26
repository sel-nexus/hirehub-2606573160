import { expect, test } from '@playwright/test';

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

test.describe('candidate application journey', () => {
  test('validates, persists and reloads candidate interest in the same browser', async ({ page }) => {
    await page.goto('/apply');
    const applyCard = page.locator('.apply-card');
    const inputPadding = await page.getByLabel('Full Name').evaluate((element) => getComputedStyle(element).padding);
    expect(inputPadding).toBe('12px');
    const desktopCardStyles = await applyCard.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { maxWidth: styles.maxWidth, padding: styles.padding };
    });
    expect(desktopCardStyles).toEqual({ maxWidth: '600px', padding: '32px' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await applyCard.evaluate((element) => getComputedStyle(element).padding)).toBe('20px');
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    await expect(page.getByText('Express your interest in working with us.')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveCount(3);

    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByText('Full name is required.')).toBeVisible();
    await expect(page.getByText('Email address is required.')).toBeVisible();
    await expect(page.getByText('Mobile number is required.')).toBeVisible();
    await expect(page.getByText('Select a listed department.')).toBeVisible();

    await page.getByLabel('Full Name').fill('Jordan Lee');
    await page.getByLabel('Email Address').fill('jordan@example.test');
    await page.getByLabel('Mobile Number').fill('5551234567');
    await page.getByLabel('Department of Interest').selectOption('Engineering');
    await page.getByRole('button', { name: 'Submit Application' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Thank you! Your interest has been submitted successfully.' })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hirehub_submissions')));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      fullName: 'Jordan Lee',
      email: 'jordan@example.test',
      mobile: '5551234567',
      department: 'Engineering',
    });
    expect(saved[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Number.isNaN(Date.parse(saved[0].submittedAt))).toBe(false);
    await expect(page.getByLabel('Full Name')).toHaveValue('');
    await page.reload();
    await page.getByLabel('Full Name').fill('Jordan Lee');
    await page.getByLabel('Email Address').fill('JORDAN@example.test');
    await page.getByLabel('Mobile Number').fill('5551234567');
    await page.getByLabel('Department of Interest').selectOption('Engineering');
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByText('This email has already been submitted.')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hirehub_submissions')))).toHaveLength(1);
  });

  test('recovers malformed browser submission data and accepts a new record', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('hirehub_submissions', '{broken-json'));
    await page.getByRole('link', { name: 'Apply', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('hirehub_submissions'))).toBe('[]');

    await page.getByLabel('Full Name').fill('Jordan Lee');
    await page.getByLabel('Email Address').fill('jordan@example.test');
    await page.getByLabel('Mobile Number').fill('5551234567');
    await page.getByLabel('Department of Interest').selectOption('Engineering');
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Thank you! Your interest has been submitted successfully.' })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hirehub_submissions')))).toHaveLength(1);
  });
});
