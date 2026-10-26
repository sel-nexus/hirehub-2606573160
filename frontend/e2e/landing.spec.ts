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

test.describe('HireHub landing experience', () => {
  test('shows approved culture content and sends both actions to application', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    const heroStyles = await hero.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { minHeight: styles.minHeight, paddingBlock: styles.paddingBlock };
    });
    const heroHeadingStyles = await page.locator('.hero h1').evaluate((element) => {
      const styles = getComputedStyle(element);
      return { fontSize: styles.fontSize, fontWeight: Number.parseInt(styles.fontWeight, 10) };
    });
    const subtitleStyles = await page.locator('.hero__subtitle').evaluate((element) => {
      const styles = getComputedStyle(element);
      return { fontSize: styles.fontSize, color: styles.color };
    });
    const ctaStyles = await page.getByRole('link', { name: 'Express Your Interest' }).evaluate((element) => {
      const styles = getComputedStyle(element);
      return { minHeight: styles.minHeight, minWidth: styles.minWidth };
    });
    expect(Number.parseFloat(heroStyles.minHeight)).toBeGreaterThanOrEqual(400);
    expect(heroStyles.paddingBlock).toBe('60px');
    expect(heroHeadingStyles.fontSize).toBe('42px');
    expect(heroHeadingStyles.fontWeight).toBeGreaterThanOrEqual(700);
    expect(subtitleStyles).toEqual({ fontSize: '18px', color: 'rgba(255, 255, 255, 0.9)' });
    expect(ctaStyles).toEqual({ minHeight: '50px', minWidth: '220px' });
    const cardStyles = await page.locator('.culture-card').evaluateAll((cards) => cards.map((card) => {
      const styles = getComputedStyle(card);
      const iconStyles = getComputedStyle(card.querySelector('.culture-card__icon'));
      return {
        borderTopWidth: styles.borderTopWidth,
        borderTopStyle: styles.borderTopStyle,
        borderTopColor: styles.borderTopColor,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        iconFontSize: iconStyles.fontSize,
        iconWidth: iconStyles.width,
        iconHeight: iconStyles.height,
        titleSize: getComputedStyle(card.querySelector('h3')).fontSize,
        descriptionSize: getComputedStyle(card.querySelector('p')).fontSize,
      };
    }));
    expect(cardStyles).toHaveLength(4);
    for (const styles of cardStyles) {
      expect(styles).toMatchObject({
        borderTopWidth: '4px',
        borderTopStyle: 'solid',
        borderTopColor: 'rgb(37, 99, 235)',
        borderRadius: '12px',
        padding: '24px',
        iconFontSize: '40px',
        iconWidth: '40px',
        iconHeight: '40px',
        titleSize: '20px',
        descriptionSize: '14px',
      });
    }
    await expect(page.getByRole('heading', { name: 'Build Your Future With Us' })).toBeVisible();
    await expect(page.getByText("Join a team that values innovation, collaboration, and growth. We're looking for talented people like you.")).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why Join Us?' })).toBeVisible();
    await expect(page.locator('.culture-card')).toHaveCount(4);
    await expect(page.locator('.culture-card__icon')).toHaveText(['💡', '📈', '🤝', '🌍']);
    await expect(page.locator('.culture-card h3')).toHaveText(['Innovation', 'Career Growth', 'Great Culture', 'Global Impact']);
    await expect(page.locator('.culture-card p')).toHaveText([
      'Work on cutting-edge projects that push boundaries and shape the future of technology.',
      'Clear career paths, mentorship programs, and continuous learning opportunities for every team member.',
      'A diverse, inclusive workplace where collaboration and creativity thrive every day.',
      "Your work reaches millions of users worldwide, making a real difference in people's lives.",
    ]);

    await page.getByRole('link', { name: 'Express Your Interest' }).click();
    await expect(page).toHaveURL(/\/apply$/);
    await expect(page.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    await page.getByRole('link', { name: 'HireHub home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Apply Now' }).click();
    await expect(page).toHaveURL(/\/apply$/);
    await expect(page.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
  });

  test('keeps all route links in one row at a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const links = await page.locator('.primary-nav__link').evaluateAll((nodes) =>
      nodes.map((node) => ({ top: node.getBoundingClientRect().top, label: node.textContent })),
    );
    expect(links).toHaveLength(3);
    expect(new Set(links.map((link) => link.top)).size).toBe(1);
    const mobileHeroStyles = await page.locator('.hero').evaluate((element) => {
      const styles = getComputedStyle(element);
      return { minHeight: styles.minHeight, paddingBlock: styles.paddingBlock };
    });
    expect(Number.parseFloat(mobileHeroStyles.minHeight)).toBeGreaterThanOrEqual(400);
    expect(mobileHeroStyles.paddingBlock).toBe('40px');
    expect(await page.locator('.hero h1').evaluate((element) => getComputedStyle(element).fontSize)).toBe('28px');
    await expect(page.getByRole('heading', { name: 'Build Your Future With Us' })).toBeVisible();
  });
});
