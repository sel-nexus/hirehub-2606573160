const SESSION_KEY = 'hirehub_admin_auth';
const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin';

/** Resolve tab-scoped storage without leaking access exceptions. */
function resolveSessionStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

/** Check whether the exact demo session flag is present in this tab. */
export function isDemoAdminAuthenticated(storage) {
  const target = resolveSessionStorage(storage);
  if (!target || typeof target.getItem !== 'function') return false;
  try {
    return target.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Grant the demonstration session only for the exact fixed credential pair. */
export function loginDemoAdmin(username, password, storage) {
  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) return false;
  const target = resolveSessionStorage(storage);
  if (!target || typeof target.setItem !== 'function') return false;
  try {
    target.setItem(SESSION_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

/** Clear this tab's demo session and fail closed when storage is unavailable. */
export function logoutDemoAdmin(storage) {
  const target = resolveSessionStorage(storage);
  if (!target || typeof target.removeItem !== 'function') return false;
  try {
    target.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Expose the fixed session key without exposing credential values. */
export function getDemoSessionKey() {
  return SESSION_KEY;
}
