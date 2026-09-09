/**
 * Typed, validated access to the Vite environment variables.
 * Import from here instead of touching `import.meta.env` directly, so a
 * missing variable fails loudly at startup rather than silently at runtime.
 */

function required(name: keyof ImportMetaEnv, fallback?: string): string {
  const raw: string | undefined = import.meta.env[name];
  const configured = raw?.trim();

  /*
   * An empty value counts as absent. Vercel stores a project variable that has
   * been added but left blank as `""`, and Vite inlines it as `""` — which
   * `??` would pass straight through, because it only falls back on
   * null/undefined. That took the whole app down at import time: the throw
   * below happens before React mounts, so the page rendered blank with only a
   * console error to go on.
   */
  const value = configured === undefined || configured === '' ? fallback?.trim() : configured;

  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${name}. See .env.example.`);
  }

  // Falling back is right for local dev but a deployed build reaching for a
  // localhost default is a misconfiguration, and an unreachable API is not
  // otherwise visible until someone submits a form. Say so once, loudly.
  if (value !== configured && import.meta.env.PROD) {
    console.warn(
      `[env] ${name} is not set in this deployment; using the fallback "${value}". ` +
        `Set it in the hosting provider's environment variables.`,
    );
  }

  return value;
}

export const env = {
  /*
   * Falls back to the deployed backend rather than localhost: there is one
   * shared API and a build without the variable set should reach it, not a
   * port that only exists on a developer's machine. Override via .env.local
   * to point at a local Django instance.
   */
  apiBaseUrl: required('VITE_API_BASE_URL', 'https://coop-backend-rxdl.onrender.com/api'),
  appName: required('VITE_APP_NAME', 'COOP'),
  isDev: import.meta.env.DEV,
} as const;
