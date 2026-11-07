# Sprint 3 — Finance app

The Finance shell, dashboard and My Contributions read the live backend
(`COOP-Platform/coop-backend`, branch `develop`). Source of truth for every
shape is the backend's OpenAPI schema at `/api/docs/`; the backend team's
walkthrough is `coop-backend/docs/sprint-3-5-backend-guide.html`.

## 1. What exists

| Route | State | Endpoint |
| --- | --- | --- |
| `/finance` | Dashboard, live | `GET /communities/{id}/finance/summary/?year=` |
| `/finance/my-contributions` | Live, with statement PDF | `GET /communities/{id}/contributions/me/?year=` · `GET .../contributions/me/statement/?year=` |
| Details drawer | Live, with receipt PDF and proof links | `GET /communities/{id}/contributions/{cid}/` · `GET .../contributions/{cid}/receipt/` |
| `/finance/contributions` | Live: month summary, Treasurer review queue (approve / reject), full list, reverse, reminders | `GET .../contributions/?month=` · `/confirm/` · `/reject/` · `/reverse/` · `POST .../contributions/reminders/` |
| `/finance/expenses` | Live: spent / awaiting approval, approval queue (approve / reject), list, details, reverse, CSV export, record with receipt and budget | `.../expenses/` · `/approve/` · `/reject/` · `/reverse/` · `/export/` |
| `/finance/income` | Live: totals, list by source, details, reverse, record with receipt | `.../income/` · `/reverse/` |
| `/finance/statements`, `/reports` | "Coming soon" placeholders | see §4 |

`/finance/*` uses the same guard as `/community/*` (signed in, belongs to a community).

## 2. Conventions the API uses

- **Money is integer minor units: 100 = 1 RWF.** `2000000` is 20,000 RWF.
  Always render through `Money` / `formatAmount` ([format.ts](../src/features/finance/format.ts)),
  never divide by hand.
- **Enums are lowercase**: status `pending | confirmed | rejected | reversed`,
  method `cash | mobile_money | bank_transfer`, type
  `monthly | one_off | arrears | fine | dedicated`. Labels live in
  [labels.ts](../src/features/finance/labels.ts).
- **Community-scoped URLs with a trailing slash**: `/communities/{id}/...`.
- **Lists the reader may not see come back `null`, not `[]`** (e.g. the
  dashboard's `recent_activity`, `accounts`). The UI hides the panel on `null`.

## 3. Permissions

Permissions come from the backend (`useWorkspace().can`). The position editor's
copy of the catalogue ([permissions.ts](../src/features/positions/data/permissions.ts))
is now in step with `rbac/catalog.py`, including the Sprint 3–5 codes
(`finance.cashflow.view`, `finance.budget.*`, `finance.campaign.*`,
`finance.income.*`, `finance.shares.manage`, `finance.account.manage`, `event.*`, ...).

Since the 1 Nov decision every member reads every finance record: the member
baseline includes `finance.contribution.view`, `expense.view`, `income.view`,
`cashflow.view`, `budget.view`, `campaign.view` and `report.view`. Proof files
of other members' payments stay private (the API sends `proofs: null`).

## 4. Still to build (endpoints are live)

| Screen | Endpoints |
| --- | --- |
| Record a contribution (form + proof upload) | `POST .../contributions/` (multipart) · `POST .../contributions/{cid}/proofs/` |
| Shares (Treasurer) | `GET/POST .../share-categories/` · `PATCH .../members/{mid}/shares/` |
| Expenses | `GET/POST .../expenses/` · `/approve/` · `/reject/` · `/reverse/` · `/export/` |
| Income | `GET/POST .../income/` · `/reverse/` |
| Cash flow (Statements page) | `GET .../cash-flow/` · `/items/` · `/export/` |
| Budgets + dedicated contributions | `.../budgets/` · `/close/` · `.../campaigns/` · `/close/` |
| Accounts (Treasurer enters bank/MoMo balances) | `.../finance/accounts/` · `/balances/` · `/retire/` |
| Reports | `GET .../finance/reports/` · `/export/` (PDF, CSV) |

## 5. Gaps against the Figma

- Activity rows: the API sends `party`, `narrative`, `category`, `payment_method`;
  there is no cheque number. Shown as party · narrative · method.
- Account subtitles show the account kind and the "as of" date of the balance.
- "Receipt number" (`#REC-2024-051`) has no field; the table shows the payment
  reference in the drawer.
- Per-payment "remaining" is not sent; the member-level `outstanding_minor` and
  `owed_to_date_minor` are.
- Audit badges, top-bar search and messaging the Treasurer are out of scope.
