import { describe, expect, it } from 'vitest';
import {
  DEPARTMENTS,
  hasDuplicateEmail,
  isSubmission,
  normalizeEditableFields,
  normalizeEmail,
  normalizeSubmissionInput,
  validateSubmission,
} from './submission.js';

const validCandidate = {
  fullName: 'Jordan Lee',
  email: 'jordan@example.test',
  mobile: '5551234567',
  department: 'Engineering',
};

const persistedCandidate = {
  id: '7c1e3a77-e349-49bd-8de5-c9bad401fc12',
  ...validCandidate,
  submittedAt: '2026-01-15T12:30:00.000Z',
};

describe('submission validation', () => {
  it('accepts valid candidate fields and the exact department contract', () => {
    expect(validateSubmission(validCandidate, 'create')).toEqual({ valid: true, errors: {} });
    expect(DEPARTMENTS).toEqual(['Engineering', 'Design', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Sales', 'Data Science']);
  });

  it('rejects an empty or malformed input object', () => {
    expect(validateSubmission(null, 'create').valid).toBe(false);
    expect(validateSubmission([], 'create').errors.form).toBe('INVALID_INPUT');
  });

  it('rejects missing, overlong, and nonalphabetic names', () => {
    expect(validateSubmission({ ...validCandidate, fullName: '' }, 'create').errors.fullName).toMatch(/required/i);
    expect(validateSubmission({ ...validCandidate, fullName: 'A'.repeat(101) }, 'create').errors.fullName).toMatch(/100/i);
    expect(validateSubmission({ ...validCandidate, fullName: 'Jordan Lee-1' }, 'create').errors.fullName).toMatch(/letters/i);
  });

  it('rejects invalid and missing email on create but does not require email on edit', () => {
    expect(validateSubmission({ ...validCandidate, email: 'bad-address' }, 'create').errors.email).toMatch(/valid/i);
    expect(validateSubmission({ ...validCandidate, email: '' }, 'create').errors.email).toMatch(/required/i);
    const { email, ...editable } = validCandidate;
    expect(validateSubmission(editable, 'edit').valid).toBe(true);
  });

  it('rejects mobiles outside ten ASCII digits and unknown departments', () => {
    for (const mobile of ['', '123456789', '12345678901', '12345abc90', '１２３４５６７８９０']) {
      expect(validateSubmission({ ...validCandidate, mobile }, 'create').errors.mobile).toBeDefined();
    }
    expect(validateSubmission({ ...validCandidate, department: 'People Operations' }, 'create').errors.department).toBeDefined();
  });

  it('trims outer whitespace and compares duplicate addresses case-insensitively', () => {
    expect(normalizeSubmissionInput({ ...validCandidate, email: '  JORDAN@example.test  ' }).email).toBe('JORDAN@example.test');
    expect(normalizeEmail(' JORDAN@example.test ')).toBe('jordan@example.test');
    expect(hasDuplicateEmail([persistedCandidate], ' JORDAN@example.test ')).toBe(true);
    expect(hasDuplicateEmail([], 'jordan@example.test')).toBe(false);
  });

  it('validates persisted row schema, UUID, department and timestamp', () => {
    expect(isSubmission(persistedCandidate)).toBe(true);
    expect(isSubmission({ ...persistedCandidate, id: 'candidate-1' })).toBe(false);
    expect(isSubmission({ ...persistedCandidate, department: 'Unknown' })).toBe(false);
    expect(isSubmission({ ...persistedCandidate, submittedAt: 'not-a-date' })).toBe(false);
    expect(isSubmission(null)).toBe(false);
  });

  it('permits only the three editable fields', () => {
    expect(normalizeEditableFields({ fullName: ' Jordan Lee ', mobile: '5551234567', department: 'Engineering' })).toEqual({
      fullName: 'Jordan Lee', mobile: '5551234567', department: 'Engineering',
    });
    expect(normalizeEditableFields({ ...validCandidate })).toBeNull();
    expect(normalizeEditableFields(null)).toBeNull();
    expect(normalizeEditableFields({ fullName: 'Jordan Lee', mobile: '5551234567' })).toEqual({
      fullName: 'Jordan Lee', mobile: '5551234567', department: undefined,
    });
  });
});
