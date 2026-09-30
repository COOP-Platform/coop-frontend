# Sprint 2 — Community app on the live backend

What the frontend calls, and every place the Sprint 2 design and the backend do not line up yet: what each side has, what the frontend does today, and what would close the gap.

- **Backend:** `https://coop-backend-rxdl.onrender.com/api` (`develop` @ `807bdbc`, verified against its live `/api/schema/`)
- **Frontend:** branch `feat/community-app-redesign`
- **Owners:** each gap lists a proposed owner. **FE** = frontend, **BE** = backend.

## 1. Running it

`coop-frontend/.env.local` (git-ignored) points the app at the live API:

```
VITE_API_BASE_URL=https://coop-backend-rxdl.onrender.com/api
VITE_APP_NAME=COOP
```

`npm run dev` serves on `http://localhost:5173`. The live API already allows that origin (CORS checked).

Render sleeps idle services, so the first request after a pause can take a while. If the server cannot be reached, the app says so.

## 2. Screens and the endpoints they use

| Screen | Endpoints | Permission the backend checks |
| --- | --- | --- |
| Shell (switchers, user) | `GET /auth/me/` | none (signed in) |
| Dashboard | `/memberships/?community_id=`, `/invitations/?community_id=`, `/communities/{id}/`, `/communities/{id}/positions/`, `/communities/{id}/members/{m}/positions/` | `position.view` for the position figures |
| Members | the same directory calls (§3.1) | `position.view` to show positions |
| Member profile | directory; `POST …/members/{m}/positions/`, `DELETE …/members/{m}/positions/{p}/`; `POST …/members/{m}/suspend/`, `/reinstate/`, `/remove/`; `POST /communities/{id}/leave/`; `/member-categories/?community_id=` | `position.assign`, `member.suspend`, `member.remove` |
| Positions | `GET/POST /communities/{id}/positions/`, `PATCH/DELETE …/positions/{p}/`, assign as above | `position.view` / `.create` / `.update` / `.delete` / `.assign` |
| Invitations | `GET /invitations/?community_id=`, `POST /invitations/{id}/resend/`, `POST /invitations/{id}/revoke/`, `POST /communities/{id}/invitations/` | `member.invite` |
| Invite Member | `POST /communities/{id}/invitations/`, `/member-categories/?community_id=` | `member.invite` |

- **Permission checks:** buttons are shown or hidden from the `permissions` array on `/auth/me/` for the selected community. The backend still enforces every check, and its 403 and `last_admin` refusals are shown as readable messages.
- **Sign-in guard:** `/community/*` is behind the sign-in guard again.
- **Mock data:** the mock store from the design review is deleted.

## 3. Gaps between the design and the backend

### 3.1 No member list that includes names

- **Design:** a member table with names, emails and positions.
- **Backend:**
  - `/memberships/` returns only a user **id** per member.
  - `/users/` only ever returns the caller, which is correct for privacy.
  - Positions come from one call per member: `GET …/members/{m}/positions/`.
- **Frontend does:** builds each row from three sources ([directory.ts](../src/features/members/api/directory.ts)):
  - the membership;
  - the invitation that member accepted (`accepted_user` gives the name and email);
  - `/auth/me/` for your own row.
  - Positions take one request per member.
  - A founder seen by someone else shows as "Community founder". Anyone else with no source shows as "Unnamed member".
- **Proposed fix (BE):** `GET /communities/{id}/members/` (needs `member.view`) returning, for each membership:
  - `id`, `status`, `join_date`, `suspended_at`, `member_category`
  - `user: {id, full_name, email, phone}`
  - `positions` and `is_admin`

  That replaces all of the joining, and the frontend change is one file.

### 3.2 A new member has no position, so no permissions

- **Backend:**
  - Accepting an invitation creates an active membership with **no position**.
  - Permissions come only from positions, so the new member resolves to none.
  - Every guarded endpoint (positions, invitations) then refuses them.
  - The seeded "Member" position exists, but nothing assigns it.
- **Frontend does:**
  - Dashboard "Needs attention" flags "N members have no position".
  - The Members role filter has a "No position" option.
  - The profile explains what a missing position means.
  - The invite screen tells the inviter to assign a position afterwards.
- **Decision needed (BE, product):** assign the community's "Member" position automatically when someone accepts, or let the inviter pick a position when inviting.

### 3.3 Several positions per member; a position can have several holders

- **Design:** one position per member, and each seat held by one person ("1 assigned"), plus a special "Member (Default)" card.
- **Backend:**
  - Positions are many-to-many (Les Cousins has two Secretaries).
  - Assigning *adds* a position; it never replaces one.
  - No position is a "default"; "Member" is an ordinary seeded row.
- **Frontend does:** follows the backend.
  - Rows and the profile list every position held, and each can be removed separately (×).
  - "Assign" on a position card adds a holder.
  - All positions share one card style, including "Member".
  - **Admin** marks positions that can manage positions and members (`is_admin`).
- **Decision needed (design):** confirm the many-to-many model, then update the Figma.

### 3.4 Invitations

| Design | Backend | Frontend does | Proposed fix |
| --- | --- | --- | --- |
| Full name optional | `full_name` **required** | Required field | none |
| No category field | `category_id` **required** | Category dropdown, preselected when there is only one | none |
| Personal message (200 chars) | No such field | **Removed** from the form and the email preview | BE: optional `message` included in the email |
| Expires after 7 days (email preview said 72 hours) | `INVITATION_VALID_FOR` = **14 days** | Shows 14 days and the real `expires_at` | Design: fix the copy |
| Expired status | Written lazily: a lapsed invitation still reads `pending` until someone touches it | Treats `pending` with a past `expires_at` as **Expired** | none (documented backend behaviour) |
| Resend any invitation | `resend` works on **pending only**; 3 per hour per address | Resend on pending. Expired, cancelled or declined get **Send new invitation** (a fresh `POST` with the same name, email and category). A 429 shows "Too many attempts" | none |
| Delete an expired invitation (trash icon) | No delete endpoint | **Removed** | BE, if wanted |
| "Invited by: Jean Claude (Treasurer)" | `invited_by` is a membership id | Looks the name up in the directory (§3.1) | covered by §3.1 |
| "Channel: Email & SMS" | Email only | Replaced by email delivery status: sent date, or **Not delivered** when `invitation_email_sent_at` is null | BE: SMS later |
| Community invite link `coop.rw/join/les-cousins` | No shareable link; each invitation is a per-email token | **Removed** | Product decision |
| Statuses: Pending, Accepted, Expired | Also `revoked` and `rejected` | Shown as **Cancelled** and **Declined**, under "All" | none |

**Visibility mismatch (BE):**
- `GET /communities/{id}/invitations/` requires `member.invite`.
- `GET /invitations/?community_id=` requires only membership, so **any member can list every invitee's name and email**.
- The frontend uses the second list, because only it has `accepted_user` and `invited_by`. It hides the Invitations screen from anyone without `member.invite`.
- **Proposed fix:** require `member.invite` on the viewset list, and add `accepted_user` and `invited_by` to `InvitationReadSerializer`.

### 3.5 Member profile fields

- **Design:**
  - hero: Registry ID, national ID, Verified ID and Voting quorum chips;
  - Membership Information: registration type, branch/district, verification status;
  - Governance card: term (2024–2026), mandate confirmation "by General Assembly";
  - footer: "Last modified by Treasurer".
- **Backend:** none of these exist on memberships or users.
- **Frontend shows what exists:** member category, email, join date, suspension date, "Joined via accepted invitation", **Community Admin** and **Founder** chips, and the resolved permissions with their catalogue descriptions.
- **Decision needed (product, BE):** which of these fields are wanted. National ID in particular needs a privacy decision.

### 3.6 Recent activity and notifications

- **Backend:** writes an audit log (`audit` app, `audit.view` permission) but has **no endpoint to read it**, and has no notifications endpoint.
- **Frontend does:**
  - "Recent Activity" is rebuilt from timestamps ([activity.ts](../src/features/dashboard/activity.ts)): invitations sent, accepted, cancelled and declined, and members suspended.
  - Position changes cannot appear.
  - The bell lists invitations still awaiting a response.
- **Proposed fix (BE):** `GET /communities/{id}/audit/` (needs `audit.view`), paginated.

### 3.7 Permission catalogue

- **Backend:** the position editor needs the list of permission codes, but no endpoint lists them.
- **Frontend does:** keeps a copy of `rbac/catalog.py` `PERMISSIONS` in [permissions.ts](../src/features/positions/data/permissions.ts), and it must be updated by hand. The backend rejects unknown codes with a 400, so drift is visible.
- **Proposed fix (BE):** `GET /permissions/`, a read-only catalogue.

### 3.8 Sessions last 30 minutes

- **Backend:** SimpleJWT issues an access token (30 minutes) and a refresh token (7 days), but **no refresh endpoint is exposed**.
- **Frontend does:** on a 401 from an authenticated request, clears the session and sends the user to sign in again ([client.ts](../src/lib/api/client.ts)).
- **Proposed fix (BE):** expose `TokenRefreshView` at `/auth/token/refresh/`. The frontend then refreshes silently.

### 3.9 Things in the design with no backend yet

- **Top-bar search:** shown, marked unavailable.
- **Reports and Settings pages:** placeholders.
- **Quorum and cycle ("Quorum Ready", "Cycle 2024 / 2025", "Cohort 2025"):**
  - these concepts don't exist in the backend;
  - the Positions matrix shows the admin-position count instead;
  - the Invitations badge shows the number sent.
- **Other apps in the app switcher** (Contributions, Meetings, Events, Voting): listed as "Soon".

## 4. How this was verified

- **Automated checks:** `npm run typecheck` and `npm run lint` pass.
- **End to end:** run against a **throwaway local copy** of the backend on its own SQLite database, with console email. Nothing was created on the live API or its database. The flows were driven in a real browser:
  1. The founder registers, founds a savings group, and signs in through the login form.
  2. They invite three people; one accepts via the emailed token and is made Treasurer.
  3. Dashboard, Members, Positions and Invitations all load with no failed requests.
  4. Sending an invitation from the form opens it in the details panel.
  5. Suspend, then remove, a member.
  6. The only admin trying to leave is refused. The backend's `last_admin` error shows as "This would leave nobody able to manage the community…".
  7. Creating a position with a custom permission set works.
- **Not yet checked against live:** the same flows with a real account. Sign in with an account that owns a community on live and click through §2.
