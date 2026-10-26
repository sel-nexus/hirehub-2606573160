import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SubmissionEditor from './SubmissionEditor.jsx';

const submission = {
  id: 'row-1', fullName: 'Jordan Lee', email: 'jordan@example.test',
  mobile: '5551234567', department: 'Engineering', submittedAt: '2026-03-04T12:00:00.000Z',
};

describe('submission editor', () => {
  afterEach(() => { document.body.style.overflow = ''; });

  it('opens an accessible modal with prefilled fields and immutable email', () => {
    render(<SubmissionEditor submission={submission} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Edit Submission' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jordan Lee');
    expect(screen.getByLabelText('Email Address')).toHaveValue('jordan@example.test');
    expect(screen.getByLabelText('Email Address')).toBeDisabled();
    expect(screen.getByLabelText('Mobile Number')).toHaveValue('5551234567');
    expect(screen.getByLabelText('Department')).toHaveValue('Engineering');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('rejects invalid editable values and leaves the record unchanged', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SubmissionEditor submission={submission} onSave={onSave} onCancel={vi.fn()} />);
    await user.clear(screen.getByLabelText('Full Name'));
    await user.type(screen.getByLabelText('Full Name'), 'Jordan-2');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText('Full name may contain letters and spaces only.')).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits only permitted values and cancels without mutating the record', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<SubmissionEditor submission={submission} onSave={onSave} onCancel={onCancel} />);
    await user.clear(screen.getByLabelText('Full Name'));
    await user.type(screen.getByLabelText('Full Name'), 'Jordan Vale');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledWith({ fullName: 'Jordan Vale', mobile: '5551234567', department: 'Engineering' });

    rerender(<SubmissionEditor submission={submission} onSave={onSave} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
