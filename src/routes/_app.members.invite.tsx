import { createFileRoute } from '@tanstack/react-router';

import {
  INVITATION_GUIDELINES,
  InvitationGuidelines,
  InviteMemberForm,
  RECENT_INVITATIONS,
  RecentInvitations,
} from '@/features/members';

export const Route = createFileRoute('/_app/members/invite')({
  component: InviteMemberPage,
});

function InviteMemberPage() {
  return (
    <div className="invite-page">
      {/*
        "Members" is plain text, not a link: there is no members list route
        yet, and TanStack's Link is typed against the generated route tree.
      */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb__item">Members</span>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__item breadcrumb__item--current" aria-current="page">
          Invite Member
        </span>
      </nav>

      <header className="invite-page__intro">
        <h1 className="invite-page__title">Invite New Member</h1>
        <p className="invite-page__subtitle">
          Invite a new member to your community. They will receive an invitation by email.
        </p>
      </header>

      <div className="invite-page__grid">
        <InviteMemberForm />
        <aside className="invite-page__rail">
          <RecentInvitations entries={RECENT_INVITATIONS} />
          <InvitationGuidelines guidelines={INVITATION_GUIDELINES} />
        </aside>
      </div>
    </div>
  );
}
