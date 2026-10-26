import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSubmission,
  deleteSubmission,
  readSubmissions,
  submissionsStorageContract,
  updateSubmission,
} from './submissions.js';

const original = {
  id: '7c1e3a77-e349-49bd-8de5-c9bad401fc12',
  fullName: 'Jordan Lee',
  email: 'jordan@example.test',
  mobile: '5551234567',
  department: 'Engineering',
  submittedAt: '2026-01-15T12:30:00.000Z',
};

const malformedRow = { ...original, id: 'not-a-uuid', email: 'sensitive-invalid@example.test' };

const input = {
  fullName: 'Morgan Vale',
  email: 'morgan@example.test',
  mobile: '5559876543',
  department: 'Design',
};

/** Provide the minimal Storage API with injectable browser failure cases. */
function createMemoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key, next) => { value = String(next); }),
    read: () => value,
  };
}

describe('browser-local submission storage', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'd943d7c8-8ac8-4c7f-8fd9-5e1ee79d4cf1' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:30:00.000Z'));
  });

  it('returns an empty list for an unused store', () => {
    const storage = createMemoryStorage();
    expect(readSubmissions(storage)).toEqual({ records: [], warnings: [] });
  });

  it('reads valid records and filters malformed rows without including their values', () => {
    const storage = createMemoryStorage(JSON.stringify([original, malformedRow]));
    const result = readSubmissions(storage);
    expect(result.records).toEqual([original]);
    expect(result.warnings).toEqual([{ code: 'INVALID_ROW_FILTERED', count: 1 }]);
    expect(JSON.stringify(result.warnings)).not.toContain('sensitive-invalid@example.test');
  });

  it('recovers malformed JSON and a wrong root shape to an empty array', () => {
    for (const raw of ['{broken', JSON.stringify({ records: [original] })]) {
      const storage = createMemoryStorage(raw);
      const result = readSubmissions(storage);
      expect(result.records).toEqual([]);
      expect(result.warnings).toEqual([{ code: 'INVALID_STORED_DATA', count: 0 }]);
      expect(storage.read()).toBe('[]');
      expect(storage.setItem).toHaveBeenCalledWith(submissionsStorageContract.key, '[]');
    }
  });

  it('reports denied reads and unavailable storage without throwing', () => {
    const deniedStorage = { getItem: () => { throw new Error('browser details'); } };
    expect(readSubmissions(deniedStorage)).toEqual({ records: [], warnings: [], error: 'STORAGE_READ_FAILED' });
    expect(readSubmissions(null).error).toBe('STORAGE_UNAVAILABLE');
    expect(createSubmission(input, null).code).toBe('STORAGE_UNAVAILABLE');
  });

  it('creates a UUID-backed timestamped row after validation and persists it', () => {
    const storage = createMemoryStorage('[]');
    const result = createSubmission(input, storage);
    expect(result.ok).toBe(true);
    expect(result.record).toEqual({
      id: 'd943d7c8-8ac8-4c7f-8fd9-5e1ee79d4cf1',
      ...input,
      submittedAt: '2026-01-15T12:30:00.000Z',
    });
    expect(JSON.parse(storage.read())).toEqual([result.record]);
  });

  it('rejects invalid candidates without writing storage', () => {
    const storage = createMemoryStorage('[]');
    const result = createSubmission({ ...input, mobile: '123' }, storage);
    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT', records: [] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('rejects normalized duplicate email without changing records', () => {
    const storage = createMemoryStorage(JSON.stringify([original]));
    const result = createSubmission({ ...input, email: ' JORDAN@EXAMPLE.TEST ' }, storage);
    expect(result).toEqual({ ok: false, code: 'DUPLICATE_EMAIL', records: [original] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('preserves ID, email and submitted timestamp while updating permitted fields', () => {
    const storage = createMemoryStorage(JSON.stringify([original]));
    const result = updateSubmission(original.id, {
      fullName: 'Jordan Vale', mobile: '5550001234', department: 'Sales',
    }, storage);
    expect(result.ok).toBe(true);
    expect(result.record).toEqual({ ...original, fullName: 'Jordan Vale', mobile: '5550001234', department: 'Sales' });
    expect(JSON.parse(storage.read())[0]).toEqual(result.record);
  });

  it('rejects immutable-field changes, invalid edits, and missing IDs without writes', () => {
    const storage = createMemoryStorage(JSON.stringify([original]));
    expect(updateSubmission(original.id, { fullName: 'Jordan Lee', mobile: '5551234567', department: 'Engineering', email: 'changed@example.test' }, storage).code).toBe('INVALID_INPUT');
    expect(updateSubmission(original.id, { fullName: 'Jordan2', mobile: '5551234567', department: 'Engineering' }, storage).code).toBe('INVALID_INPUT');
    expect(updateSubmission('not-present', { fullName: 'Jordan Lee', mobile: '5551234567', department: 'Engineering' }, storage).code).toBe('NOT_FOUND');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('deletes an existing record and returns not found for an absent identifier', () => {
    const storage = createMemoryStorage(JSON.stringify([original]));
    expect(deleteSubmission(original.id, storage)).toEqual({ ok: true, records: [] });
    expect(storage.read()).toBe('[]');
    expect(deleteSubmission(original.id, storage)).toEqual({ ok: false, code: 'NOT_FOUND', records: [] });
  });

  it('does not delete or change stored records when reading storage fails', () => {
    const storedValue = JSON.stringify([original]);
    const storage = createMemoryStorage(storedValue);
    storage.getItem.mockImplementation(() => { throw new Error('browser details'); });

    expect(deleteSubmission(original.id, storage)).toEqual({
      ok: false,
      code: 'STORAGE_READ_FAILED',
      records: [],
    });
    expect(storage.read()).toBe(storedValue);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not claim deletion or change stored records when writing fails', () => {
    const storedValue = JSON.stringify([original]);
    const storage = createMemoryStorage(storedValue);
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });

    expect(deleteSubmission(original.id, storage)).toEqual({
      ok: false,
      code: 'STORAGE_WRITE_FAILED',
      records: [original],
    });
    expect(storage.read()).toBe(storedValue);
  });

  it('does not claim success or replace visible records when writes fail', () => {
    const storage = createMemoryStorage(JSON.stringify([original]));
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    const result = updateSubmission(original.id, {
      fullName: 'Jordan Vale', mobile: '5550001234', department: 'Sales',
    }, storage);
    expect(result).toEqual({ ok: false, code: 'STORAGE_WRITE_FAILED', records: [original] });
  });

  it('aborts mutation if recovery cannot replace malformed stored data', () => {
    const storage = createMemoryStorage('{bad');
    storage.setItem.mockImplementation(() => { throw new Error('denied'); });
    expect(createSubmission(input, storage).code).toBe('STORAGE_WRITE_FAILED');
  });
});
