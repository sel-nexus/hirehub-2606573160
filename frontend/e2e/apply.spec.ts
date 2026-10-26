import { expect, test } from '@playwright/test';

test.describe('candidate application journey', () => {
  test('validates, persists and reloads candidate interest in the same browser', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/apply');
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
    expect(browserErrors).toEqual([]);
  });

  test('recovers malformed browser submission data before allowing a new record', async ({ page }) => {
    await page.goto('/apply');
    await page.evaluate(() => localStorage.setItem('hirehub_submissions', '{broken-json'));
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Existing browser data was unreadable and has been reset.');
    expect(await page.evaluate(() => localStorage.getItem('hirehub_submissions'))).toBe('[]');
  });
});
