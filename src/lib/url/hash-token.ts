/**
 * Reads the token out of `#token=…` on the current URL.
 *
 * Invitation and password-reset links carry their token in the fragment
 * rather than the query string, because a fragment is never sent to the
 * server: it stays out of access logs, `Referer` headers, and anything else
 * that records request URLs. The trade-off is that the router cannot validate
 * it as a search param — the value exists only in the browser — so it is read
 * from `location` directly.
 */
export function readTokenFromHash(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const raw = window.location.hash.replace(/^#/, '');
  if (raw === '') {
    return undefined;
  }

  // Accepts `#token=abc` as the backend sends it, and a bare `#abc` in case a
  // mail client mangles the key on the way through.
  const token = raw.includes('=') ? new URLSearchParams(raw).get('token') : raw;

  return token === null || token === '' ? undefined : token;
}
