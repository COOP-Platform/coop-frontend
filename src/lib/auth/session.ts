/**
 * Where the signed-in user's JWT lives.
 *
 * The API issues bearer tokens (`rest_framework_simplejwt`), so there is no
 * httpOnly cookie to hide them in — web storage is the only option available
 * to a browser client, which means any script running on this origin can read
 * them. That is the accepted trade-off of bearer-token SPAs; the mitigation is
 * a short access-token lifetime and not rendering untrusted HTML.
 *
 * "Remember me" chooses the backing store: `localStorage` survives closing the
 * browser, `sessionStorage` is discarded with the tab. Nothing else differs.
 */

const ACCESS_KEY = 'coop.access';
const REFRESH_KEY = 'coop.refresh';
const PERSIST_KEY = 'coop.persist';
const USER_KEY = 'coop.user';

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
}

export interface Session {
  access: string;
  refresh: string;
  mustChangePassword: boolean;
  user: SessionUser;
}

/**
 * Storage access throws in some contexts (Safari private mode, blocked site
 * data), so every call is guarded — a browser that refuses to store the token
 * should leave the user signed out, not crash the app.
 */
function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Nothing useful to do: the user simply won't stay signed in.
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // As above.
  }
}

function activeStore(): Storage {
  return safeGet(localStorage, PERSIST_KEY) === '1' ? localStorage : sessionStorage;
}

export function saveSession(
  access: string,
  refresh: string,
  user: SessionUser,
  remember: boolean,
): void {
  saveTokens(access, refresh, remember);
  safeSet(remember ? localStorage : sessionStorage, USER_KEY, JSON.stringify(user));
}

/** The signed-in user, or null when absent or unparseable. */
export function getUser(): SessionUser | null {
  const raw = safeGet(activeStore(), USER_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    // Corrupt entry is the same as no session.
    return null;
  }
}

export function saveTokens(access: string, refresh: string, remember: boolean): void {
  // Clear both stores first so switching "remember me" can't leave a stale
  // token behind in the store we're no longer reading from.
  clearSession();

  if (remember) {
    safeSet(localStorage, PERSIST_KEY, '1');
  }

  const store = remember ? localStorage : sessionStorage;
  safeSet(store, ACCESS_KEY, access);
  safeSet(store, REFRESH_KEY, refresh);
}

export function getAccessToken(): string | null {
  return safeGet(activeStore(), ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return safeGet(activeStore(), REFRESH_KEY);
}

export function isSignedIn(): boolean {
  return getAccessToken() !== null;
}

export function clearSession(): void {
  for (const store of [localStorage, sessionStorage]) {
    safeRemove(store, ACCESS_KEY);
    safeRemove(store, REFRESH_KEY);
    safeRemove(store, USER_KEY);
  }
  safeRemove(localStorage, PERSIST_KEY);
}
