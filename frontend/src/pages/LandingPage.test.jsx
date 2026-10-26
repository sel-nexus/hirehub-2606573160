import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LandingPage from './LandingPage.jsx';

/** Render a landing page with an isolated in-memory route history. */
function renderLandingPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('HireHub landing page', () => {
  it('renders exact hero copy and all four approved culture cards', () => {
    renderLandingPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Build Your Future With Us' })).toBeVisible();
    expect(screen.getByText("Join a team that values innovation, collaboration, and growth. We're looking for talented people like you.")).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Why Join Us?' })).toBeVisible();
    const cards = document.querySelectorAll('.culture-card');
    expect(cards).toHaveLength(4);
    expect(within(cards[0]).getByRole('heading', { name: 'Innovation' })).toBeVisible();
    expect(within(cards[0]).getByText('Work on cutting-edge projects that push boundaries and shape the future of technology.')).toBeVisible();
    expect(within(cards[1]).getByRole('heading', { name: 'Career Growth' })).toBeVisible();
    expect(within(cards[1]).getByText('Clear career paths, mentorship programs, and continuous learning opportunities for every team member.')).toBeVisible();
    expect(within(cards[2]).getByRole('heading', { name: 'Great Culture' })).toBeVisible();
    expect(within(cards[2]).getByText('A diverse, inclusive workplace where collaboration and creativity thrive every day.')).toBeVisible();
    expect(within(cards[3]).getByRole('heading', { name: 'Global Impact' })).toBeVisible();
    expect(within(cards[3]).getByText("Your work reaches millions of users worldwide, making a real difference in people's lives.")).toBeVisible();
  });

  it('provides both application actions as native links to the apply route', async () => {
    const user = userEvent.setup();
    renderLandingPage();

    const heroAction = screen.getByRole('link', { name: 'Express Your Interest' });
    const closingAction = screen.getByRole('link', { name: 'Apply Now' });
    expect(heroAction).toHaveAttribute('href', '/apply');
    expect(closingAction).toHaveAttribute('href', '/apply');
    await user.click(heroAction);
    expect(heroAction).toBeVisible();
    await user.click(closingAction);
    expect(closingAction).toBeVisible();
  });

  it('keeps the feature layout within its source-defined maximum width', () => {
    renderLandingPage();
    expect(document.querySelector('.culture-grid')).toBeInTheDocument();
    expect(document.querySelector('.culture-section')).toHaveAttribute('aria-labelledby', 'culture-title');
  });
});
