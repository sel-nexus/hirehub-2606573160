import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SubmissionDashboard from './SubmissionDashboard.jsx';

const row = {
  id: '7c1e3a77-e349-49bd-8de5-c9bad401fc12', fullName: 'Jordan Lee',
  email: 'jordan@example.test', mobile: '5551234567', department: 'Engineering',
  submittedAt: '2026-03-04T12:00:00.000Z',
};

/** Provide a controllable storage API for dashboard interactions. */
function createStorageApi(records = [row]) {
  let current = records;
  return {
    readSubmissions: vi.fn(() => ({ records: current, warnings: [] })),
    updateSubmission: vi.fn((id, patch) => {
      const target = current.find((record) => record.id === id);
      if (!target) return { ok: false, code: 'NOT_FOUND', records: current };
      current = current.map((record) => record.id === id ? { ...record, ...patch } : record);
      return { ok: true, record: current.find((record) => record.id === id), records: current };
    }),
    deleteSubmission: vi.fn((id) => {
      current = current.filter((record) => record.id !== id);
      return { ok: true, records: current };
    }),
  };
}

describe('submission dashboard', () => {
  it('renders correct summary, formatted date and required table columns', () => {
    render(<SubmissionDashboard storageApi={createStorageApi()} />);
    expect(screen.getByRole('heading', { name: 'Submissions Dashboard' })).toBeVisible();
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('Mar 4, 2026');
    const table = screen.getByRole('table');
    for (const heading of ['#', 'Full Name', 'Email', 'Mobile', 'Department', 'Submitted On', 'Actions']) {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeVisible();
    }
    expect(within(table).getByText('Mar 4, 2026')).toBeVisible();
    expect(within(table).getByText('Engineering')).toBeVisible();
  });

  it('renders the exact empty state and N/A latest date', () => {
    render(<SubmissionDashboard storageApi={createStorageApi([])} />);
    expect(screen.getByText('No submissions yet.')).toBeVisible();
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('N/A');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('0');
  });

  it('renders candidate-supplied markup as text without creating injected elements', () => {
    const suppliedMarkup = '<img src=x onerror="alert(1)"><script>window.injected = true</script>';
    const maliciousRecord = { ...row, fullName: suppliedMarkup };

    const { container } = render(<SubmissionDashboard storageApi={createStorageApi([maliciousRecord])} />);

    expect(screen.getByRole('cell', { name: suppliedMarkup })).toBeVisible();
    expect(container.querySelector('img, script, svg, iframe')).not.toBeInTheDocument();
    expect(window.injected).toBeUndefined();
  });

  it('makes record details viewable without leaving the dashboard', async () => {
    const user = userEvent.setup();
    render(<SubmissionDashboard storageApi={createStorageApi()} />);
    await user.click(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByRole('region', { name: 'Submission details' })).toHaveTextContent('jordan@example.test');
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('persists valid edits and refreshes the table and summary', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    render(<SubmissionDashboard storageApi={storageApi} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Full Name'));
    await user.type(screen.getByLabelText('Full Name'), 'Jordan Vale');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(storageApi.updateSubmission).toHaveBeenCalledWith(row.id, {
      fullName: 'Jordan Vale', mobile: '5551234567', department: 'Engineering',
    });
    expect(screen.getByText('Jordan Vale')).toBeVisible();
  });

  it('keeps an edited draft open and reports a storage write failure without changing the record', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    storageApi.updateSubmission.mockReturnValue({ ok: false, code: 'STORAGE_WRITE_FAILED', records: [row] });
    render(<SubmissionDashboard storageApi={storageApi} />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Full Name'));
    await user.type(screen.getByLabelText('Full Name'), 'Jordan Vale');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('status')).toHaveTextContent('Changes could not be saved in this browser. Your record is unchanged.');
    expect(screen.getByRole('dialog', { name: 'Edit Submission' })).toBeVisible();
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jordan Vale');
    expect(screen.getByRole('cell', { name: 'Jordan Lee' })).toBeVisible();
    expect(screen.queryByRole('cell', { name: 'Jordan Vale' })).not.toBeInTheDocument();
    expect(storageApi.readSubmissions().records).toEqual([row]);
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('Mar 4, 2026');
  });

  it('keeps an edited draft open and reports when the record is no longer available', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    storageApi.updateSubmission.mockReturnValue({ ok: false, code: 'NOT_FOUND', records: [row] });
    render(<SubmissionDashboard storageApi={storageApi} />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Full Name'));
    await user.type(screen.getByLabelText('Full Name'), 'Jordan Vale');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('status')).toHaveTextContent('This record is no longer available. Refresh the dashboard and try again.');
    expect(screen.getByRole('dialog', { name: 'Edit Submission' })).toBeVisible();
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jordan Vale');
    expect(screen.getByRole('cell', { name: 'Jordan Lee' })).toBeVisible();
    expect(screen.queryByRole('cell', { name: 'Jordan Vale' })).not.toBeInTheDocument();
    expect(storageApi.readSubmissions().records).toEqual([row]);
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('Mar 4, 2026');
  });

  it('does not delete until the exact confirmation is accepted', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    const confirmDelete = vi.fn(() => false);
    render(<SubmissionDashboard storageApi={storageApi} confirmDelete={confirmDelete} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirmDelete).toHaveBeenCalledWith('Are you sure you want to delete this submission?');
    expect(storageApi.deleteSubmission).not.toHaveBeenCalled();
    expect(screen.getByText('Jordan Lee')).toBeVisible();
  });

  it('deletes the confirmed row and refreshes the summary', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    render(<SubmissionDashboard storageApi={storageApi} confirmDelete={() => true} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(storageApi.deleteSubmission).toHaveBeenCalledWith(row.id);
    expect(screen.getByText('No submissions yet.')).toBeVisible();
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('0');
  });

  it('reports a delete storage write failure and leaves the record and summary unchanged', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    storageApi.deleteSubmission.mockReturnValue({ ok: false, code: 'STORAGE_WRITE_FAILED', records: [row] });
    render(<SubmissionDashboard storageApi={storageApi} confirmDelete={() => true} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('status')).toHaveTextContent('This browser could not save the deletion. The record remains unchanged.');
    expect(screen.getByRole('cell', { name: 'Jordan Lee' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'jordan@example.test' })).toBeVisible();
    expect(storageApi.readSubmissions().records).toEqual([row]);
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('Mar 4, 2026');
  });

  it('reports when a delete target is no longer available and leaves the record and summary unchanged', async () => {
    const user = userEvent.setup();
    const storageApi = createStorageApi();
    storageApi.deleteSubmission.mockReturnValue({ ok: false, code: 'NOT_FOUND', records: [row] });
    render(<SubmissionDashboard storageApi={storageApi} confirmDelete={() => true} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('status')).toHaveTextContent('This record is no longer available. Refresh the dashboard and try again.');
    expect(screen.getByRole('cell', { name: 'Jordan Lee' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'jordan@example.test' })).toBeVisible();
    expect(storageApi.readSubmissions().records).toEqual([row]);
    expect(screen.getByText('Total Submissions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unique Departments').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Latest Submission').nextElementSibling).toHaveTextContent('Mar 4, 2026');
  });

  it('reports filtered invalid data without revealing discarded values', () => {
    const storageApi = createStorageApi([]);
    storageApi.readSubmissions.mockReturnValue({
      records: [], warnings: [{ code: 'INVALID_ROW_FILTERED', count: 1, invalidEmail: 'private@example.test' }],
    });
    render(<SubmissionDashboard storageApi={storageApi} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 invalid stored record(s) were skipped.');
    expect(screen.queryByText('private@example.test')).not.toBeInTheDocument();
  });
});
