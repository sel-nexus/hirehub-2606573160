import { describe, expect, it, vi } from 'vitest';
import {
  getDemoSessionKey,
  isDemoAdminAuthenticated,
  loginDemoAdmin,
  logoutDemoAdmin,
} from './adminSession.js';

/** Create a session Storage implementation with an optional starting value. */
function createSessionStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key, nextValue) => { value = String(nextValue); }),
    removeItem: vi.fn(() => { value = null; }),
    current: () => value,
  };
}

describe('demo administrator session', () => {
  it('recognizes only the exact true session value', () => {
    expect(getDemoSessionKey()).toBe('hirehub_admin_auth');
    expect(isDemoAdminAuthenticated(createSessionStorage('true'))).toBe(true);
    for (const value of [null, '', 'false', 'TRUE', '1']) {
      expect(isDemoAdminAuthenticated(createSessionStorage(value))).toBe(false);
    }
  });

  it('sets the tab session for only exact admin credentials', () => {
    const storage = createSessionStorage();
    expect(loginDemoAdmin('admin', 'admin', storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith('hirehub_admin_auth', 'true');
    expect(storage.current()).toBe('true');
  });

  it('rejects incorrect username or password without touching storage', () => {
    const storage = createSessionStorage();
    expect(loginDemoAdmin('Admin', 'admin', storage)).toBe(false);
    expect(loginDemoAdmin('admin', 'ADMIN', storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.current()).toBeNull();
  });

  it('fails closed if session storage is unavailable or throws', () => {
    expect(isDemoAdminAuthenticated(null)).toBe(false);
    expect(loginDemoAdmin('admin', 'admin', null)).toBe(false);
    const readFailure = { getItem: () => { throw new Error('storage denied'); } };
    const writeFailure = { setItem: () => { throw new Error('storage denied'); } };
    expect(isDemoAdminAuthenticated(readFailure)).toBe(false);
    expect(loginDemoAdmin('admin', 'admin', writeFailure)).toBe(false);
  });

  it('clears the session on logout and reports a failure without throwing', () => {
    const storage = createSessionStorage('true');
    expect(logoutDemoAdmin(storage)).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledWith('hirehub_admin_auth');
    expect(storage.current()).toBeNull();
    expect(logoutDemoAdmin(null)).toBe(false);
    expect(logoutDemoAdmin({ removeItem: () => { throw new Error('denied'); } })).toBe(false);
  });
});
