/**
 * Typed, validated access to the Vite environment variables.
 * Import from here instead of touching `import.meta.env` directly, so a
 * missing variable fails loudly at startup rather than silently at runtime.
 */

function required(name: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  apiBaseUrl: required('VITE_API_BASE_URL', 'http://localhost:8080/api'),
  // TODO(Sprint 0): drop the fallback once the product name is approved.
  appName: required('VITE_APP_NAME', 'Community Management Platform'),
  isDev: import.meta.env.DEV,
} as const;
