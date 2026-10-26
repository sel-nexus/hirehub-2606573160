import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

/** Render the full application router from an isolated public route. */
function renderApplication() {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  return render(<App />);
}

describe('HireHub application router and shared session header', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('routes through visible links and changes header state after demo login/logout', async () => {
    const user = userEvent.setup();
    renderApplication();
    await user.click(screen.getByRole('link', { name: 'Apply' }));
    expect(screen.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Admin' }));
    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('heading', { name: 'Build Your Future With Us' })).toBeVisible();
    expect(window.sessionStorage.getItem('hirehub_admin_auth')).toBeNull();
  });

  it('keeps the authenticated UI gated if the browser refuses to clear session storage', async () => {
    let sessionValue = null;
    vi.stubGlobal('sessionStorage', {
      getItem: () => sessionValue,
      setItem: (_key, value) => { sessionValue = String(value); },
      removeItem: () => { throw new DOMException('Storage denied', 'SecurityError'); },
      clear: () => { sessionValue = null; },
    });
    const user = userEvent.setup();
    renderApplication();
    await user.click(screen.getByRole('link', { name: 'Admin' }));
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(sessionValue).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Could not end the demo session');
    expect(window.location.pathname).toBe('/admin');
  });
});
