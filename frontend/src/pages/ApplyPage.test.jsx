import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplyPage from './ApplyPage.jsx';
import { createSubmission, readSubmissions } from '../storage/submissions.js';

vi.mock('../storage/submissions.js', () => ({
  createSubmission: vi.fn(),
  readSubmissions: vi.fn(() => ({ records: [], warnings: [] })),
}));

/** Render the application form in an isolated route context. */
function renderApplyPage() {
  return render(
    <MemoryRouter initialEntries={['/apply']}>
      <ApplyPage />
    </MemoryRouter>,
  );
}

/** Fill each required field with one valid candidate submission. */
async function fillValidApplication(user, overrides = {}) {
  const values = {
    'Full Name': 'Jordan Lee',
    'Email Address': 'jordan@example.test',
    'Mobile Number': '5551234567',
    'Department of Interest': 'Engineering',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    const control = screen.getByLabelText(label);
    if (label === 'Department of Interest') {
      await user.selectOptions(control, value);
    } else {
      await user.type(control, value);
    }
  }
}

describe('candidate interest form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('renders exact form copy and all eight departments in order', () => {
    renderApplyPage();
    expect(screen.getByRole('heading', { name: 'Join Our Team' })).toBeVisible();
    expect(screen.getByText('Express your interest in working with us.')).toBeVisible();
    expect(screen.getByRole('link', { name: '← Back to Home' })).toHaveAttribute('href', '/');
    const department = screen.getByLabelText('Department of Interest');
    expect(within(department).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Select a department', 'Engineering', 'Design', 'Marketing', 'Human Resources',
      'Finance', 'Operations', 'Sales', 'Data Science',
    ]);
  });

  it('associates required-field errors with each invalid control and retains the draft', async () => {
    const user = userEvent.setup();
    renderApplyPage();
    await user.click(screen.getByRole('button', { name: 'Submit Application' }));

    expect(screen.getByText('Full name is required.')).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Full Name')).toHaveAttribute('aria-describedby', 'fullName-error');
    expect(screen.getByText('Email address is required.')).toBeVisible();
    expect(screen.getByText('Mobile number is required.')).toBeVisible();
    expect(screen.getByText('Select a listed department.')).toBeVisible();
    expect(createSubmission).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Full Name'), 'Jordan Lee');
    expect(screen.queryByText('Full name is required.')).not.toBeInTheDocument();
  });

  it('rejects overlong and nonalphabetic names, malformed email, and invalid mobile digits', async () => {
    const user = userEvent.setup();
    renderApplyPage();
    await fillValidApplication(user, {
      'Full Name': 'Jordan Lee-2',
      'Email Address': 'not-an-address',
      'Mobile Number': '12345678901',
    });
    await user.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(screen.getByText('Full name may contain letters and spaces only.')).toBeVisible();
    expect(screen.getByText('Enter a valid email address.')).toBeVisible();
    expect(screen.getByText('Mobile number must contain exactly 10 digits.')).toBeVisible();
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('shows the exact duplicate email message without clearing the candidate draft', async () => {
    createSubmission.mockReturnValue({ ok: false, code: 'DUPLICATE_EMAIL', records: [] });
    const user = userEvent.setup();
    renderApplyPage();
    await fillValidApplication(user);
    await user.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(screen.getByText('This email has already been submitted.')).toBeVisible();
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jordan Lee');
    expect(screen.getByLabelText('Email Address')).toHaveValue('jordan@example.test');
  });

  it('persists valid values, clears the form and dismisses confirmation after four seconds', async () => {
    vi.useFakeTimers();
    createSubmission.mockReturnValue({ ok: true, record: { id: 'row-1' }, records: [{ id: 'row-1' }] });
    renderApplyPage();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { name: 'fullName', value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { name: 'email', value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Mobile Number'), { target: { name: 'mobile', value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Department of Interest'), { target: { name: 'department', value: 'Engineering' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Application' }).closest('form'));

    expect(createSubmission).toHaveBeenCalledWith({
      fullName: 'Jordan Lee', email: 'jordan@example.test', mobile: '5551234567', department: 'Engineering',
    });
    expect(screen.getByText('Thank you! Your interest has been submitted successfully.')).toBeVisible();
    expect(screen.getByLabelText('Full Name')).toHaveValue('');
    expect(screen.getByLabelText('Email Address')).toHaveValue('');
    expect(screen.getByLabelText('Mobile Number')).toHaveValue('');
    expect(screen.getByLabelText('Department of Interest')).toHaveValue('');

    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByText('Thank you! Your interest has been submitted successfully.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Thank you! Your interest has been submitted successfully.')).not.toBeInTheDocument();
  });

  it('preserves the draft and does not show success when browser storage cannot write', async () => {
    createSubmission.mockReturnValue({ ok: false, code: 'STORAGE_WRITE_FAILED', records: [] });
    const user = userEvent.setup();
    renderApplyPage();
    await fillValidApplication(user);
    await user.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(screen.getByText('Your application could not be saved. Check your browser storage and try again.')).toBeVisible();
    expect(screen.queryByText('Thank you! Your interest has been submitted successfully.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jordan Lee');
  });

  it('reports failed malformed-data repair without claiming the data was reset', () => {
    readSubmissions.mockReturnValue({
      records: [],
      warnings: [{ code: 'INVALID_STORED_DATA', count: 0 }],
      error: 'STORAGE_WRITE_FAILED',
    });
    renderApplyPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Existing browser data is unreadable and could not be reset because browser storage is unavailable. Your details will not be submitted.',
    );
    expect(screen.queryByText('Existing browser data was unreadable and has been reset. You can submit again.')).not.toBeInTheDocument();
  });
});
