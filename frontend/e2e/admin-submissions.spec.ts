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

test.describe('admin review and maintenance journey', () => {
  test('reviews, edits, views and confirms deletion of a browser-local candidate', async ({ page }) => {
    await page.goto('/apply');
    await page.getByLabel('Full Name').fill('Jordan Lee');
    await page.getByLabel('Email Address').fill('jordan@example.test');
    await page.getByLabel('Mobile Number').fill('5551234567');
    await page.getByLabel('Department of Interest').selectOption('Engineering');
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Thank you! Your interest has been submitted successfully.' })).toBeVisible();

    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    const dashboardTitle = page.getByRole('heading', { name: 'Submissions Dashboard' });
    await expect(dashboardTitle).toBeVisible();
    const dashboardStyles = await dashboardTitle.evaluate((element) => getComputedStyle(element).fontSize);
    const statValueStyles = await page.locator('.summary-card strong').first().evaluate((element) => getComputedStyle(element).fontSize);
    expect(dashboardStyles).toBe('28px');
    expect(statValueStyles).toBe('32px');
    await expect(page.getByText('Total Submissions').locator('..').locator('strong')).toHaveText('1');
    await expect(page.getByRole('cell', { name: 'Jordan Lee' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const summaryGrid = page.locator('.summary-grid');
    const statCards = page.locator('.summary-card');
    const statLayout = await statCards.evaluateAll((cards) => cards.map((card) => {
      const { top, left, width } = card.getBoundingClientRect();
      return { top, left, width };
    }));
    const summaryColumns = await summaryGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(summaryColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(statLayout).toHaveLength(3);
    expect(new Set(statLayout.map((card) => card.left)).size).toBe(1);
    expect(statLayout[1].top).toBeGreaterThan(statLayout[0].top);
    expect(statLayout[2].top).toBeGreaterThan(statLayout[1].top);
    const tableRegion = page.getByRole('region', { name: 'Candidate submissions' });
    const tableOverflow = await tableRegion.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }));
    expect(tableOverflow.overflowX).toBe('auto');
    expect(tableOverflow.scrollWidth).toBeGreaterThan(tableOverflow.clientWidth);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.getByRole('button', { name: 'View details' }).click();
    await expect(page.getByRole('region', { name: 'Submission details' })).toContainText('jordan@example.test');
    await page.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Submission' });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: 'test-results/reviewer/admin-submissions-edit-dialog.png', fullPage: true });
    const backdrop = page.locator('.modal-backdrop');
    const [backdropBounds, dialogBounds, dialogStyles, backdropBackground] = await Promise.all([
      backdrop.boundingBox(),
      dialog.boundingBox(),
      dialog.evaluate((element) => {
        const styles = getComputedStyle(element);
        return { maxWidth: styles.maxWidth, borderRadius: styles.borderRadius, padding: styles.padding };
      }),
      backdrop.evaluate((element) => {
        const color = getComputedStyle(element).backgroundColor;
        const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
        return { color, alpha: channels.length === 4 ? channels[3] : 1 };
      }),
    ]);
    if (!backdropBounds || !dialogBounds) throw new Error('The edit overlay and dialog must have measurable dimensions.');
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error('The edit dialog must be tested in a sized browser viewport.');
    expect(await backdrop.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
    expect(backdropBackground.color).toBe('rgba(0, 0, 0, 0.5)');
    expect(dialogStyles).toEqual({ maxWidth: '500px', borderRadius: '12px', padding: '32px' });
    expect(dialogBounds.width).toBeLessThanOrEqual(500);
    expect(backdropBounds.width).toBe(viewportSize.width);
    expect(backdropBounds.height).toBe(viewportSize.height);
    expect(dialogBounds.width).toBeGreaterThan(0);
    expect(dialogBounds.height).toBeGreaterThan(0);
    expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(viewportSize.width);
    expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(viewportSize.height);
    expect(backdropBackground.alpha).toBeGreaterThan(0);
    expect(backdropBackground.alpha).toBeLessThan(1);
    await expect(page.getByLabel('Email Address')).toBeDisabled();
    await page.getByLabel('Full Name').fill('Jordan Vale');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('cell', { name: 'Jordan Vale' })).toBeVisible();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Are you sure you want to delete this submission?');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('cell', { name: 'Jordan Vale' })).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Are you sure you want to delete this submission?');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No submissions yet.')).toBeVisible();
    expect(await page.getByText('Total Submissions').locator('..').locator('strong').textContent()).toBe('0');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hirehub_submissions')))).toEqual([]);
  });

  test('shows a safe empty dashboard when storage contains malformed JSON', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('hirehub_admin_auth', 'true');
      localStorage.setItem('hirehub_submissions', '{broken');
    });
    await page.goto('/admin');
    await expect(page.getByText('No submissions yet.')).toBeVisible();
    expect(await page.getByText('Latest Submission').locator('..').locator('strong').textContent()).toBe('N/A');
    expect(await page.evaluate(() => localStorage.getItem('hirehub_submissions'))).toBe('[]');
  });
});
