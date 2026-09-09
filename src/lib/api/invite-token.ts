/**
 * Invitation token generation.
 *
 * THIS BELONGS ON THE SERVER. `POST /api/invitations/` requires `token_hash`
 * from the client, so the raw token is minted here and only its SHA-256 is
 * sent — the API never receives the token itself, which is the one property of
 * the model's design that this preserves.
 *
 * What it cannot preserve: a token generated in a browser is not a secret the
 * server vouches for, and nothing emails it, so the inviter has to pass the
 * link on by hand. Once the backend mints and dispatches the token, delete
 * this file and stop sending `token_hash`.
 */

/** URL-safe, 256 bits of entropy from the platform CSPRNG. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  // base64url: the token travels in a query string.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Hex SHA-256, matching what the model's `token_hash` column expects. */
export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
