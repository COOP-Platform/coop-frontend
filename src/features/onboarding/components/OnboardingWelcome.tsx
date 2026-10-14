import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import illustration from '@/assets/online-community.svg';
import { SetupLayout } from '@/components/layout/SetupLayout';
import { IconArrowRight } from '@/components/ui';
import { env } from '@/config/env';
import { clearCommunityDraft, hasCommunityDraft } from '@/features/communities';

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
      </div>
    </SetupLayout>
  );
}
