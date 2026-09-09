/**
 * One-shot handoff between the accept screen and the success screen.
 *
 * The temporary password has to reach the next screen and deliberately does
 * not travel in the URL: query strings land in browser history, referrers and
 * server logs. `sessionStorage` keeps it to this tab and it is cleared as soon
 * as it has been read once.
 *
 * None of this is needed once the backend emails credentials — the success
 * screen then just says an email is on its way.
 */

const KEY = 'coop.accepted';

export interface AcceptedAccount {
  email: string;
  temporaryPassword: string;
  memberId: string;
  communityName: string;
  roleName: string;
}

export function storeAcceptedAccount(account: AcceptedAccount): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(account));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The
    // success screen falls back to its "check your email" copy.
  }
}

/** Reads and clears. Returns null if absent, unreadable, or already consumed. */
export function takeAcceptedAccount(): AcceptedAccount | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) {
      return null;
    }
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as AcceptedAccount;
  } catch {
    return null;
  }
}
