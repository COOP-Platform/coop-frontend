/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional on purpose: these are absent from any build that does not define
  // them, so typing them as `string` would hide the case `config/env.ts` exists
  // to handle.
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite at build time — see `define` in vite.config.ts. */
declare const __BUILD_SHA__: string;
declare const __BUILT_AT__: string;
