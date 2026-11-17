import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  SectionCard,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

import type { Community, CommunityStatus } from '../../api/communities';
import { communityTypeLabel } from '../create-wizard/community-types';
import { CURRENCIES, LANGUAGES, labelFor } from '../create-wizard/model';
import { CommunityCover, CommunityLogo } from './CommunityImages';

const STATUS: Record<CommunityStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'warning' },
  archived: { label: 'Archived', tone: 'neutral' },
};

/** "+250788123456" -> "+250 788 123 456"; anything unexpected is shown as stored. */
function formatPhone(phone: string): string {
  const match = /^(\+\d{3})(\d{3})(\d{3})(\d{3,})$/.exec(phone);
  return match ? match.slice(1).join(' ') : phone;
}

interface ProfileViewProps {
  community: Community;
  /** Active members, when the list could be loaded. */
  memberCount: number | undefined;
  /** May change at least one field — shows the prompts to complete the profile. */
  canEdit: boolean;
  /** May upload the logo and cover (`community.update`). */
  canEditImages: boolean;
  onEdit: () => void;
}

/**
 * Every field the community has told us, with empty ones as a prompt rather
 * than a gap: an invitation to fill them in for those who can, a plain "not
 * added yet" for everyone else.
 */
export function ProfileView({
  community,
  memberCount,
  canEdit,
  canEditImages,
  onEdit,
}: ProfileViewProps) {
  const status = STATUS[community.status] ?? { label: community.status, tone: 'neutral' };

  const empty = (prompt: string) =>
    canEdit ? (
      <div className="cs-empty">
        <p className="cs-empty__text">{prompt}</p>
        <Button variant="tint" size="sm" inline icon={<IconPencil />} onClick={onEdit}>
          Add
        </Button>
      </div>
    ) : (
      <p className="cs-empty cs-empty__text">Not added yet.</p>
    );

  const text = (value: string | null, prompt: string) =>
    value && value.trim() !== '' ? <p className="cs-text">{value}</p> : empty(prompt);

  const contacts: { icon: ReactNode; label: string; value: string }[] = [];
  if (community.contact_email) {
    contacts.push({ icon: <IconMail />, label: 'Email', value: community.contact_email });
  }
  if (community.contact_phone) {
    contacts.push({
      icon: <IconPhone />,
      label: 'Phone',
      value: formatPhone(community.contact_phone),
    });
  }
  if (community.contact_address) {
    contacts.push({ icon: <IconMapPin />, label: 'Address', value: community.contact_address });
  }

  return (
    <div className="cs-profile">
      <section className="card cs-hero" aria-label="Community identity">
        <CommunityCover name={community.name} url={community.cover_url} />
        <div className="cs-hero__body">
          <CommunityLogo name={community.name} url={community.logo_url} size="lg" />
          <div className="cs-hero__text">
            <h2 className="cs-hero__name">{community.name}</h2>
            <p className="cs-hero__meta">
              <span>{communityTypeLabel(community.type)}</span>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              {memberCount !== undefined && (
                <span>
                  {memberCount} active {memberCount === 1 ? 'member' : 'members'}
                </span>
              )}
              {community.founded_year && <span>Founded {community.founded_year}</span>}
            </p>
          </div>
        </div>
        {canEditImages && (!community.logo_url || !community.cover_url) && (
          <div className="cs-hero__prompt">
            {empty(
              !community.logo_url && !community.cover_url
                ? 'No logo or cover banner yet.'
                : !community.logo_url
                  ? 'No logo yet.'
                  : 'No cover banner yet.',
            )}
          </div>
        )}
      </section>

      <div className="cs-grid">
        <SectionCard title="About us">
          {text(community.description, 'No description yet.')}
        </SectionCard>

        <SectionCard title="Vision">{text(community.vision, 'No vision yet.')}</SectionCard>

        <SectionCard title="Mission">{text(community.mission, 'No mission yet.')}</SectionCard>

        <SectionCard title="Contact">
          {contacts.length > 0 ? (
            <dl className="cs-facts">
              {contacts.map((contact) => (
                <div key={contact.label} className="cs-fact">
                  <dt className="cs-fact__label">
                    <span aria-hidden="true">{contact.icon}</span>
                    {contact.label}
                  </dt>
                  <dd className="cs-fact__value">{contact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            empty('No contact details yet.')
          )}
        </SectionCard>

        <SectionCard title="Preferences">
          <dl className="cs-facts">
            <div className="cs-fact">
              <dt className="cs-fact__label">Currency</dt>
              <dd className="cs-fact__value">{labelFor(CURRENCIES, community.currency)}</dd>
            </div>
            <div className="cs-fact">
              <dt className="cs-fact__label">Language</dt>
              <dd className="cs-fact__value">{labelFor(LANGUAGES, community.language)}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
