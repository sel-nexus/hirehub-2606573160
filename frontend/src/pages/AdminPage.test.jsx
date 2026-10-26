import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './AdminPage.jsx';

vi.mock('../storage/adminSession.js', () => ({
  isDemoAdminAuthenticated: vi.fn(() => false),
  loginDemoAdmin: vi.fn(() => true),
  logoutDemoAdmin: vi.fn(() => true),
}));

import { isDemoAdminAuthenticated, loginDemoAdmin } from '../storage/adminSession.js';

/** Render the admin route with a controllable memory-backed navigation stack. */
function renderAdminPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<h1>Home route</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('admin access route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoAdminAuthenticated.mockReturnValue(false);
    loginDemoAdmin.mockReturnValue(true);
  });

  it('shows the login gate when the exact session value is absent', () => {
    renderAdminPage();
    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Submissions Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeVisible();
    expect(screen.getByPlaceholderText('Enter password')).toBeVisible();
  });

  it('shows the dashboard when the exact session state already exists', () => {
    isDemoAdminAuthenticated.mockReturnValue(true);
    renderAdminPage();
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Admin Login' })).not.toBeInTheDocument();
  });

  it('grants dashboard access only after valid login succeeds', async () => {
    const user = userEvent.setup();
    renderAdminPage();
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(loginDemoAdmin).toHaveBeenCalledWith('admin', 'admin');
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
  });

  it('shows exact invalid credential feedback and remains gated', async () => {
    const user = userEvent.setup();
    renderAdminPage();
    await user.type(screen.getByLabelText('Username'), 'visitor');
    await user.type(screen.getByLabelText('Password'), 'incorrect');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials. Please try again.');
    expect(screen.queryByRole('heading', { name: 'Submissions Dashboard' })).not.toBeInTheDocument();
    expect(loginDemoAdmin).not.toHaveBeenCalled();
  });

  it('remains gated if session storage denies the login write', async () => {
    loginDemoAdmin.mockReturnValue(false);
    const user = userEvent.setup();
    renderAdminPage();
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Demo access is unavailable');
    expect(screen.queryByRole('heading', { name: 'Submissions Dashboard' })).not.toBeInTheDocument();
  });
});
