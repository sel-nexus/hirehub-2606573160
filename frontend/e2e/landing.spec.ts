import { expect, test } from '@playwright/test';

test.describe('HireHub landing experience', () => {
  test('shows approved culture content and sends both actions to application', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Build Your Future With Us' })).toBeVisible();
    await expect(page.getByText("Join a team that values innovation, collaboration, and growth. We're looking for talented people like you.")).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why Join Us?' })).toBeVisible();
    await expect(page.locator('.culture-card')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Innovation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Career Growth' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Great Culture' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Global Impact' })).toBeVisible();

    await page.getByRole('link', { name: 'Express Your Interest' }).click();
    await expect(page).toHaveURL(/\/apply$/);
    await expect(page.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    await page.goto('/');
    await page.getByRole('link', { name: 'Apply Now' }).click();
    await expect(page).toHaveURL(/\/apply$/);
    await expect(page.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test('keeps all route links in one row at a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const links = await page.locator('.primary-nav__link').evaluateAll((nodes) =>
      nodes.map((node) => ({ top: node.getBoundingClientRect().top, label: node.textContent })),
    );
    expect(links).toHaveLength(3);
    expect(new Set(links.map((link) => link.top)).size).toBe(1);
    await expect(page.getByRole('heading', { name: 'Build Your Future With Us' })).toBeVisible();
  });
});
