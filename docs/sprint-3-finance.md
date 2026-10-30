# Sprint 3 — Finance app

First pass: the Finance shell and dashboard. Source of truth for the endpoints is the backend's OpenAPI schema; the Sprint 3–5 brief is the proposal we build against until it lands.

## 1. What exists

| Route | State |
| --- | --- |
| `/finance` | Dashboard, built from the Figma |
| `/finance/my-contributions` | Built from the Figma (§5) |
| `/finance/contributions`, `/expenses`, `/statements`, `/reports` | "Coming soon" placeholders so the sidebar works |

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

## 5. My Contributions

`GET /me/contributions?year=` feeds the three stat cards and the table; `GET /contributions/{id}` feeds the details drawer. Neither is on the live backend yet, so the page shows the Figma's sample rows with a "Sample figures" badge until they answer ([sample-my-contributions.ts](../src/features/finance/data/sample-my-contributions.ts) — delete then).

**Deliberate differences from the Figma**

- The table has four columns (Date, Amount, Payment type, Status) and a **View details** button. The rest — purpose, reference, who confirmed it, status history, receipt — is in a side drawer, the same `Drawer` the Members and Invitations pages use. It slides in from the right, like those.
- Left out: "End-to-End Cryptographically Logged" (ledger cryptography is out of scope in the brief), and "member ID #JC-8821" (no such field).
- "Message <treasurer>" is a plain line naming the Treasurer from the committee list; there is no messaging feature.

**Asks for the backend**

- **Remaining amount per payment.** A contribution carries only what was paid. Nothing says what was due, or which month a payment covers, so "remaining" per row cannot be computed honestly in the browser. Either send `amount_due` / `remaining` on each contribution, or send due-vs-paid per month and link payments to the month. The page already shows the member-level `summary.outstanding`; the drawer and a column can show the per-payment figure once it exists. `default_contribution_minor` on member categories could be the expected amount.
- **Receipt number.** The design shows `#REC-2024-051`. The brief's `reference` is the member's own transaction reference (`TXN-123`). The table shows `reference`; a separate receipt number would need its own field.
- **PDFs.** `/contributions/{id}/receipt.pdf` and `/me/statement.pdf?year=` are Should items. The buttons are disabled on sample data and show the server's error otherwise.
