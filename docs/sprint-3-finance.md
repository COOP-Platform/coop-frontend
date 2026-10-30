# Sprint 3 — Finance app

First pass: the Finance shell and dashboard. Source of truth for the endpoints is the backend's OpenAPI schema; the Sprint 3–5 brief is the proposal we build against until it lands.

## 1. What exists

| Route | State |
| --- | --- |
| `/finance` | Dashboard, built from the Figma |
| `/finance/my-contributions`, `/contributions`, `/expenses`, `/statements`, `/reports` | "Coming soon" placeholders so the sidebar works |

`/finance/*` uses the same guard as `/community/*` (signed in, belongs to a community). Finance replaces the "Contributions" placeholder in the app switcher.

## 2. Permissions

The catalogue already carries the finance codes ([permissions.ts](../src/features/positions/data/permissions.ts)). Every member holds `finance.contribution.record` and `finance.report.view` through `MEMBER_BASELINE`.

| Thing on screen | Needs |
| --- | --- |
| Record Contribution (header button, quick action) | `finance.contribution.record` |
| **Record Expense** (header button, quick action), Expenses page | `finance.expense.record` / `finance.expense.view` |
| Contributions page and the "View all" link | `finance.contribution.view` |
| Recent activity and Account balances | `finance.contribution.view` or `finance.expense.view` |
| Reports | `finance.report.view` |

The sidebar hides links the user cannot use; a page opened by URL shows "You don't have access" ([FinanceAccessGate](../src/features/finance/components/FinanceAccessGate.tsx)). The backend enforces all of it.

**Open:** whether members see only totals or the full list is still to be confirmed with Les Cousins (brief, 02 Nov). Today members get the four totals and the compliance card, not the activity feed or account balances. Flip `canViewLedger` in `FinanceDashboard.tsx` if that changes.

## 3. Dashboard data

- `GET /finance/summary?community_id=&year=` is **not in the live schema yet** (checked against `/api/schema/`). Until it answers, the dashboard shows the Figma's sample figures with a "Sample figures" badge instead of "Live". The samples live in one file, [sample-summary.ts](../src/features/finance/data/sample-summary.ts); delete it once the API is the only source.
- Money is whole RWF, formatted with thousands separators, never floats.
- The account named "Bank of Kigali" in the design is "Bank Transfer" here.

## 4. Gaps against the Figma

- **Activity rows** show a category line ("Venue Booking") and a method ("Cheque #0421"). The brief's summary payload has neither (`type`, `title`, `member`, `amount`, `direction`, `at`). `detail` and `method` are optional and shown when sent. **BE:** add them, or tell us where to get them.
- **Account subtitles** ("MoMo float") are not in the payload either. Same treatment.
- **"Audited Under Article 14 of By-Laws"** note and the "Live Audit" / "Audited Entries" chips are left out: the brief lists by-law audit badges as not in this sprint.
- **Top-bar search** is not part of the shell yet.
- **Record Contribution / Record Expense** open the placeholder pages until the forms are built.
