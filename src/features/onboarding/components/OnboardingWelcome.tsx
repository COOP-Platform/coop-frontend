import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import illustration from '@/assets/online-community.svg';
import { SetupLayout } from '@/components/layout/SetupLayout';
import { IconArrowRight, IconChevronDown, IconFlag, IconPalette, IconUsers } from '@/components/ui';
import { env } from '@/config/env';
import { clearCommunityDraft, hasCommunityDraft } from '@/features/communities';

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
    body: 'Add a logo and cover, and set the currency and language your community works in.',
  },
];

/**
 * First stop for a signed-in user who is not in a community yet: one clear
 * call to found theirs. Who they are signed in as, and signing out, live in
 * the header's account menu.
 */
export function OnboardingWelcome() {
  const [draft, setDraft] = useState(hasCommunityDraft);

  return (
    <SetupLayout>
      <div className="onboard-home">
        <section className="onboard-home__hero">
          <div className="onboard-home__copy">
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
          </div>

          <div className="onboard-home__art">
            <img src={illustration} alt="" />
          </div>
        </section>

        <section id="how-it-works" className="onboard-home__how" aria-labelledby="how-title">
          <p className="onboard-home__how-eyebrow">How it works</p>
          <h2 id="how-title" className="onboard-home__how-title">
            Your community in three short steps
          </h2>
          <p className="onboard-home__how-lead">
            Only a name and a type are required — everything else can wait.
          </p>
          <ol className="onboard-home__steps">
            {HOW_IT_WORKS.map((item, index) => (
              <li key={item.title} className="onboard-home__step">
                <span className="onboard-home__step-head">
                  <span className="onboard-home__step-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="onboard-home__step-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                </span>
                <h3 className="onboard-home__step-title">{item.title}</h3>
                <p className="onboard-home__step-body">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </SetupLayout>
  );
}
