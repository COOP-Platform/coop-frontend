/** `/platform/audit-log` search params — so a filtered view can be linked to. */
export interface AuditLogSearch {
  page?: number;
  /** Community id. */
  community?: string;
  /** Exact action, e.g. `platform.support.read`. */
  action?: string;
}

export function parseAuditLogSearch(raw: Record<string, unknown>): AuditLogSearch {
  const page = Number(raw.page);
  return {
    page: Number.isInteger(page) && page > 1 ? page : undefined,
    community:
      typeof raw.community === 'string' && raw.community !== '' ? raw.community : undefined,
    action: typeof raw.action === 'string' && raw.action !== '' ? raw.action : undefined,
  };
}
