import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import illustration from '@/assets/COOP_background_img.jpg';
import { SetupLayout } from '@/components/layout/SetupLayout';
import {
  IconArrowRight,
  IconChevronDown,
  IconFlag,
  IconMail,
  IconPalette,
  IconShieldCheck,
  IconUsers,
} from '@/components/ui';
import { env } from '@/config/env';
import { useMe } from '@/features/auth';
import { clearCommunityDraft, hasCommunityDraft } from '@/features/communities';
import { clearSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

const HOW_IT_WORKS = [
  {
    icon: <IconUsers />,
    title: 'Community basics',
    body: 'Name your group and pick what kind it is — family, savings group, cooperative and more.',
  },
  {
    icon: <IconFlag />,
    title: 'Purpose & contact',
    body: 'Optionally record your vision, mission, and how members can reach the group.',
  },
  {
    icon: <IconPalette />,
    title: 'Branding & preferences',
    body: 'Add a logo and cover, and set the currency and language your ledger runs in.',
  },
];

/**
 * First stop for a signed-in user who is not in a community yet. Founding one
 * is the main path; joining is by invitation only, so the other path is a
 * pointer to their inbox rather than a button.
 */
export function OnboardingWelcome() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [draft, setDraft] = useState(hasCommunityDraft);

  function switchAccount() {
    clearSession();
    queryClient.clear();
    void navigate({ to: '/login' });
  }

  return (
    <SetupLayout>
      <div className="onboard-home">
        <p className="onboard-home__session">
          Signed in as <strong>{me?.full_name ?? 'new member'}</strong>
          <span aria-hidden="true">•</span>
          <button type="button" className="onboard-home__switch" onClick={switchAccount}>
            Switch account
          </button>
        </p>

        <section className="onboard-home__hero">
          <div className="onboard-home__copy">
            <span className="onboard-home__chip">
              <span className="onboard-home__chip-dot" aria-hidden="true" />
              Cooperative onboarding — East Africa
            </span>

            <h1 className="onboard-home__title">
              Bring Your Community <em className="onboard-home__title-accent">Together.</em>
            </h1>

            <p className="onboard-home__lead">
              Create your community on {env.appName} and start organizing your members in one place.
            </p>

            <div className="onboard-home__actions">
              <Link
                to="/onboarding/create"
                className="btn btn--accent btn--inline onboard-home__cta"
              >
                {draft ? 'Continue your draft' : 'Create Community'}
                <IconArrowRight />
              </Link>
              <a
                href="#how-it-works"
                className="btn btn--secondary btn--inline onboard-home__explore"
              >
                Explore how {env.appName} works
                <IconChevronDown />
              </a>
            </div>

            {draft && (
              <p className="onboard-home__draft">
                You have an unfinished community saved in this browser.{' '}
                <button
                  type="button"
                  className="onboard-home__link-button"
                  onClick={() => {
                    clearCommunityDraft();
                    setDraft(false);
                  }}
                >
                  Discard it and start over
                </button>
              </p>
            )}

            <p className="onboard-home__invite">
              <IconMail />
              <span>
                Joining an existing community instead? Open the invitation email its administrator
                sent you — the link in it adds you directly.
              </span>
            </p>
          </div>

          <div className="onboard-home__art">
            <img src={illustration} alt="" />
          </div>
        </section>

        <p className="onboard-home__trust">
          <IconShieldCheck />
          Secured member vault &amp; transparent collective ledger
        </p>

        <section id="how-it-works" className="onboard-home__how" aria-labelledby="how-title">
          <h2 id="how-title" className="onboard-home__how-title">
            How it works
          </h2>
          <p className="onboard-home__how-lead">
            Three short steps. Only a name and a type are required — everything else can wait.
          </p>
          <ol className="onboard-home__steps">
            {HOW_IT_WORKS.map((item, index) => (
              <li key={item.title} className="onboard-home__step">
                <span className="onboard-home__step-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="onboard-home__step-index">Step {index + 1}</span>
                <h3 className="onboard-home__step-title">{item.title}</h3>
                <p className="onboard-home__step-body">{item.body}</p>
              </li>
            ))}
          </ol>
          <p className="onboard-home__how-foot">
            Once it is created you become its owner and administrator, with default member
            categories and positions already set up — ready to invite your members.
          </p>
        </section>
      </div>
    </SetupLayout>
  );
}
