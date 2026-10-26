import {
  hasDuplicateEmail,
  isSubmission,
  normalizeEditableFields,
  normalizeEmail,
  normalizeSubmissionInput,
  validateSubmission,
} from '../validation/submission.js';

const STORAGE_KEY = 'hirehub_submissions';

/** Resolve browser storage without allowing unavailable globals to escape. */
function resolveStorage(storage) {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Return the standard failure result without exposing browser exception details. */
function failure(code, records = []) {
  return { ok: false, code, records };
}

/** Read and normalize saved records, repairing malformed roots when possible. */
function readFromStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return { records: [], warnings: [], error: 'STORAGE_UNAVAILABLE' };
  }
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { records: [], warnings: [], error: 'STORAGE_READ_FAILED' };
  }
  if (raw === null) {
    return { records: [], warnings: [] };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed)) {
    try {
      storage.setItem(STORAGE_KEY, '[]');
      return { records: [], warnings: [{ code: 'INVALID_STORED_DATA', count: 0 }], reset: true };
    } catch {
      return {
        records: [],
        warnings: [{ code: 'INVALID_STORED_DATA', count: 0 }],
        error: 'STORAGE_WRITE_FAILED',
      };
    }
  }

  const records = parsed.filter(isSubmission);
  const invalidCount = parsed.length - records.length;
  return {
    records,
    warnings: invalidCount > 0 ? [{ code: 'INVALID_ROW_FILTERED', count: invalidCount }] : [],
  };
}

/** Persist a complete record list and convert browser failures to a result code. */
function persist(storage, records) {
  if (!storage || typeof storage.setItem !== 'function') {
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** Return validated browser-local submissions and non-sensitive recovery warnings. */
export function readSubmissions(storage) {
  return readFromStorage(resolveStorage(storage));
}

/** Validate, deduplicate, and persist a candidate record. */
export function createSubmission(input, storage) {
  const target = resolveStorage(storage);
  const current = readFromStorage(target);
  if (current.error) {
    return failure(current.error, current.records);
  }
  const normalized = normalizeSubmissionInput(input);
  const validation = validateSubmission(normalized, 'create');
  if (!validation.valid) {
    return failure('INVALID_INPUT', current.records);
  }
  if (hasDuplicateEmail(current.records, normalized.email)) {
    return failure('DUPLICATE_EMAIL', current.records);
  }

  let id;
  try {
    id = globalThis.crypto.randomUUID();
  } catch {
    return failure('STORAGE_UNAVAILABLE', current.records);
  }
  const record = {
    id,
    fullName: normalized.fullName,
    email: normalized.email,
    mobile: normalized.mobile,
    department: normalized.department,
    submittedAt: new Date().toISOString(),
  };
  const records = [...current.records, record];
  if (!persist(target, records)) {
    return failure('STORAGE_WRITE_FAILED', current.records);
  }
  return { ok: true, record, records };
}

/** Validate and persist allowed editable fields while preserving immutable values. */
export function updateSubmission(id, patch, storage) {
  const target = resolveStorage(storage);
  const current = readFromStorage(target);
  if (current.error) {
    return failure(current.error, current.records);
  }
  const index = current.records.findIndex((record) => record.id === id);
  if (index < 0) {
    return failure('NOT_FOUND', current.records);
  }
  const editable = normalizeEditableFields(patch);
  if (!editable || !validateSubmission(editable, 'edit').valid) {
    return failure('INVALID_INPUT', current.records);
  }

  const record = { ...current.records[index], ...editable };
  const records = current.records.map((item, itemIndex) => itemIndex === index ? record : item);
  if (!persist(target, records)) {
    return failure('STORAGE_WRITE_FAILED', current.records);
  }
  return { ok: true, record, records };
}

/** Remove a saved submission by its stable identifier. */
export function deleteSubmission(id, storage) {
  const target = resolveStorage(storage);
  const current = readFromStorage(target);
  if (current.error) {
    return failure(current.error, current.records);
  }
  if (!current.records.some((record) => record.id === id)) {
    return failure('NOT_FOUND', current.records);
  }
  const records = current.records.filter((record) => record.id !== id);
  if (!persist(target, records)) {
    return failure('STORAGE_WRITE_FAILED', current.records);
  }
  return { ok: true, records };
}

/** Expose a small immutable storage contract for UI consumers and tests. */
export const submissionsStorageContract = Object.freeze({ key: STORAGE_KEY, emailKey: normalizeEmail });
