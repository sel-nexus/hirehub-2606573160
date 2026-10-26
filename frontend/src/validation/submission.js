/** Define the HireHub candidate data contract and its pure validation rules. */
export const DEPARTMENTS = Object.freeze([
  'Engineering',
  'Design',
  'Marketing',
  'Human Resources',
  'Finance',
  'Operations',
  'Sales',
  'Data Science',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L} ]+$/u;
const MOBILE_PATTERN = /^[0-9]{10}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Trim user-entered fields without changing their internal content. */
export function normalizeSubmissionInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return {
    fullName: typeof input.fullName === 'string' ? input.fullName.trim() : input.fullName,
    email: typeof input.email === 'string' ? input.email.trim() : input.email,
    mobile: typeof input.mobile === 'string' ? input.mobile.trim() : input.mobile,
    department: typeof input.department === 'string' ? input.department.trim() : input.department,
  };
}

/** Normalize an address for duplicate comparison without changing display data. */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** Validate the editable fields for a new submission or an existing-record edit. */
export function validateSubmission(input, mode = 'create') {
  const errors = {};
  const normalized = normalizeSubmissionInput(input);
  if (mode !== 'create' && mode !== 'edit') {
    return { valid: false, errors: { form: 'INVALID_MODE' } };
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: { form: 'INVALID_INPUT' } };
  }

  const name = normalized.fullName;
  if (typeof name !== 'string' || name.length === 0) {
    errors.fullName = 'Full name is required.';
  } else if (name.length > 100) {
    errors.fullName = 'Full name must be 100 characters or fewer.';
  } else if (!NAME_PATTERN.test(name)) {
    errors.fullName = 'Full name may contain letters and spaces only.';
  }

  if (mode === 'create') {
    const email = normalized.email;
    if (typeof email !== 'string' || email.length === 0) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
  }

  const mobile = normalized.mobile;
  if (typeof mobile !== 'string' || mobile.length === 0) {
    errors.mobile = 'Mobile number is required.';
  } else if (!MOBILE_PATTERN.test(mobile)) {
    errors.mobile = 'Mobile number must contain exactly 10 digits.';
  }

  if (typeof normalized.department !== 'string' || !DEPARTMENTS.includes(normalized.department)) {
    errors.department = 'Select a listed department.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Check that a stored candidate has the complete persisted schema. */
export function isSubmission(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const requiredKeys = ['id', 'fullName', 'email', 'mobile', 'department', 'submittedAt'];
  if (!requiredKeys.every((key) => Object.hasOwn(value, key))) {
    return false;
  }
  if (!UUID_PATTERN.test(value.id) || typeof value.submittedAt !== 'string') {
    return false;
  }
  if (!Number.isFinite(Date.parse(value.submittedAt)) || !/^\d{4}-\d{2}-\d{2}T/.test(value.submittedAt)) {
    return false;
  }
  return validateSubmission(value, 'create').valid;
}

/** Compare two values using the accepted case-insensitive email key. */
export function hasDuplicateEmail(records, email) {
  const normalized = normalizeEmail(email);
  return Array.isArray(records) && records.some((record) => normalizeEmail(record?.email) === normalized);
}

/** Extract only fields that an administrator is allowed to modify. */
export function normalizeEditableFields(patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return null;
  }
  const allowed = new Set(['fullName', 'mobile', 'department']);
  if (Object.keys(patch).some((key) => !allowed.has(key))) {
    return null;
  }
  return {
    fullName: typeof patch.fullName === 'string' ? patch.fullName.trim() : patch.fullName,
    mobile: typeof patch.mobile === 'string' ? patch.mobile.trim() : patch.mobile,
    department: typeof patch.department === 'string' ? patch.department.trim() : patch.department,
  };
}
