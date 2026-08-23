/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite at build time — see `define` in vite.config.ts. */
declare const __BUILD_SHA__: string;
declare const __BUILT_AT__: string;
