import type { ReactNode, RefObject } from 'react';

import {
  Button,
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle,
  IconImage,
} from '@/components/ui';

import type { Community, FoundCommunityResult } from '../../api/communities';
import { communityTypeLabel } from './community-types';
import { CURRENCIES, LANGUAGES, labelFor } from './model';

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'ready-item ready-item--wide' : 'ready-item'}>
      <dt className="ready-item__label">{label}</dt>
      <dd className="ready-item__value">{children}</dd>
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ready-section">
      <h2 className="ready-section__title">
        <span className="ready-section__index" aria-hidden="true">
          {index}
        </span>
        {title}
      </h2>
      <dl className="ready-section__grid">{children}</dl>
    </section>
  );
}

const NOT_SET = <span className="ready-item__empty">Not set</span>;

/** "+250788123456" -> "+250 788 123 456"; anything unexpected is shown as stored. */
function formatPhone(phone: string): string {
  const match = /^(\+\d{3})(\d{3})(\d{3})(\d{3,})$/.exec(phone);
  return match ? match.slice(1).join(' ') : phone;
}

interface CommunityReadyProps {
  /** What the server saved — not what the form held — so the summary is the record. */
  community: Community;
  imageErrors: FoundCommunityResult['imageErrors'];
  /** What the founder chose; the response does not echo it. */
  withCommittee: boolean;
  /** Focused on arrival, so screen readers announce the outcome. */
  titleRef?: RefObject<HTMLHeadingElement>;
  onContinue: () => void;
}

const IMAGE_LABEL = { logo: 'logo', cover: 'cover banner' } as const;

export function CommunityReady({
  community,
  imageErrors,
  withCommittee,
  titleRef,
  onContinue,
}: CommunityReadyProps) {
  const failedImages = (Object.keys(imageErrors) as (keyof typeof imageErrors)[]).filter(
    (kind) => imageErrors[kind] !== undefined,
  );

  return (
    <div className="ready">
      <header className="ready-hero">
        <span className="ready-hero__icon" aria-hidden="true">
          <IconCheckCircle width={32} height={32} />
        </span>
        <div>
          <h1 ref={titleRef} tabIndex={-1} className="ready-hero__title">
            Your community is ready!
          </h1>
          <p className="ready-hero__name">
            {community.name}
            <span className="ready-hero__type">{communityTypeLabel(community.type)}</span>
          </p>
          <p className="ready-hero__role">You are the Owner and Administrator.</p>
        </div>
      </header>

      {failedImages.length > 0 && (
        <div className="ready-warning" role="status">
          <IconAlertTriangle />
          <div>
            <p className="ready-warning__title">
              Your community was created, but not every image was saved.
            </p>
            <ul className="ready-warning__list">
              {failedImages.map((kind) => (
                <li key={kind}>
                  The {IMAGE_LABEL[kind]}: {imageErrors[kind]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="ready-card">
        <Section index={1} title="Community Basics">
          <Item label="Community name">{community.name}</Item>
          <Item label="Community type">{communityTypeLabel(community.type)}</Item>
          <Item label="Leadership committee">
            {withCommittee ? 'Suggested officer positions created' : 'No committee'}
          </Item>
          <Item label="Description" wide>
            {community.description ?? NOT_SET}
          </Item>
        </Section>

        <Section index={2} title="Purpose & Contact">
          <Item label="Vision" wide>
            {community.vision ?? NOT_SET}
          </Item>
          <Item label="Mission" wide>
            {community.mission ?? NOT_SET}
          </Item>
          <Item label="Contact email">{community.contact_email ?? NOT_SET}</Item>
          <Item label="Contact phone">
            {community.contact_phone ? formatPhone(community.contact_phone) : NOT_SET}
          </Item>
          <Item label="Physical address / office" wide>
            {community.contact_address ?? NOT_SET}
          </Item>
        </Section>

        <Section index={3} title="Branding & Preferences">
          <Item label="Community assets">
            {community.logo_url || community.cover_url ? (
              <span className="ready-assets">
                {community.logo_url && (
                  <span className="ready-asset">
                    <IconImage /> Logo uploaded
                  </span>
                )}
                {community.cover_url && (
                  <span className="ready-asset">
                    <IconImage /> Cover banner uploaded
                  </span>
                )}
              </span>
            ) : (
              NOT_SET
            )}
          </Item>
          <Item label="Founded year">{community.founded_year ?? NOT_SET}</Item>
          <Item label="Primary currency">{labelFor(CURRENCIES, community.currency)}</Item>
          <Item label="Primary language">{labelFor(LANGUAGES, community.language)}</Item>
        </Section>

        <footer className="ready-card__foot">
          <p className="ready-card__note">
            <IconCheckCircle /> All details validated and saved to your community profile.
          </p>
          <Button variant="primary" inline onClick={onContinue}>
            Go to your dashboard
            <IconArrowRight />
          </Button>
        </footer>
      </div>
    </div>
  );
}
