import { useNavigate } from '@tanstack/react-router';

import { Button, IconArrowRight, IconClock, IconMapPin, IconUsers } from '@/components/ui';

import { ACTIVATION_STEPS, INVITE_ALLOCATION, INVITE_PREVIEW } from '../data/placeholder';

const LEGAL_NOTE =
  'By accepting, your authenticated profile will be permanently bonded to the Les Cousins ' +
  'collective charter under Rwandan Law N° 02/2010 on Cooperative Societies.';

export function AcceptInvitation() {
  const navigate = useNavigate();

  return (
    <div className="accept">
      <div className="accept__status">
        <span className="accept__tag">Exclusive invitation</span>
        <span className="accept__verified">Token Verified</span>
      </div>

      <header className="accept__intro">
        <h1 className="accept__title">Welcome, {INVITE_PREVIEW.inviteeFirstName}!</h1>
        <p className="accept__lede">
          You have been officially sponsored and invited to join the private governance &amp; mutual
          finance ledger of <strong>{INVITE_PREVIEW.communityName}</strong>.
        </p>
      </header>

      <section className="accept__sponsor">
        <div className="accept__sponsor-head">
          <span className="accept__sponsor-avatar" aria-hidden="true">
            {INVITE_PREVIEW.sponsorInitials}
          </span>
          <div className="accept__sponsor-text">
            <p className="accept__sponsor-name">{INVITE_PREVIEW.sponsorName}</p>
            <p className="accept__sponsor-role">{INVITE_PREVIEW.sponsorCommittee}</p>
            <p className="accept__sponsor-meta">
              <span>
                <IconUsers />
                {INVITE_PREVIEW.activeMembers} Members active
              </span>
              <span>
                <IconMapPin />
                {INVITE_PREVIEW.location}
              </span>
            </p>
          </div>
          <span className="accept__sponsor-badge">{INVITE_PREVIEW.sponsorTitle}</span>
        </div>
      </section>

      <section className="accept__allocation">
        <div className="accept__allocation-head">
          <div>
            <p className="accept__eyebrow">Designated allocation</p>
            <p className="accept__allocation-name">{INVITE_ALLOCATION.role}</p>
          </div>
          <span className="accept__approved">Pre-approved</span>
        </div>

        <ul className="accept__benefits" role="list">
          {INVITE_ALLOCATION.benefits.map((benefit) => (
            <li key={benefit.title} className="accept__benefit">
              <span className="accept__benefit-title">{benefit.title}</span>
              <span className="accept__benefit-detail">{benefit.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="accept__requirements">
        <p className="accept__requirements-head">
          <span>
            <IconClock />
            Activation Requirements
          </span>
          <span className="accept__requirements-time">Takes ~2 minutes</span>
        </p>

        <ol className="accept__steps">
          {ACTIVATION_STEPS.map((step, index) => (
            <li key={step} className="accept__step">
              <span className="accept__step-number">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <Button
        type="button"
        variant="primary"
        // No accept endpoint exists, so this only advances the flow — see the
        // note on the placeholder data module.
        onClick={() => void navigate({ to: '/invitation/accepted' })}
      >
        Accept Invitation &amp; Continue
        <IconArrowRight />
      </Button>

      <p className="accept__secondary">
        {/* TODO: both need endpoints — decline should revoke the invitation. */}
        <a href="#">Decline this invitation</a>
        <a href="#">Contact Secretariat</a>
      </p>

      <p className="accept__legal">{LEGAL_NOTE}</p>
    </div>
  );
}
