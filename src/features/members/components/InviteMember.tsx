import { Link, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  IconAtSign,
  IconChevronRight,
  IconCommunity,
  IconEye,
  IconLayers,
  IconMail,
  IconSend,
  IconShield,
  IconShieldCheck,
  IconTile,
  IconUser,
  Input,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { effectiveStatus, useInvitations, useSendInvitation } from '../api/invitations';
import { useMemberCategories } from '../api/member-categories';
import { useMemberships } from '../api/memberships';
import { INVITATION_VALID_DAYS } from '../constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  full_name?: string;
  email?: string;
  category_id?: string;
  form?: string;
}

export function InviteMember() {
  const navigate = useNavigate();
  const { me, membership, communityId, can } = useWorkspace();
  const categories = useMemberCategories(communityId);
  const memberships = useMemberships(communityId);
  const invitations = useInvitations(communityId, can('member.invite'));
  const send = useSendInvitation();

  const activeCategories = (categories.data ?? []).filter((c) => c.is_active);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  // Preselect when there is exactly one sensible choice.
  const category =
    categoryId || (activeCategories.length === 1 ? (activeCategories[0]?.id ?? '') : '');

  const communityName = membership?.community.name ?? 'the';
  const memberCount = (memberships.data ?? []).filter((m) => m.status === 'active').length;
  const pendingCount = (invitations.data ?? []).filter(
    (i) => effectiveStatus(i) === 'pending',
  ).length;

  if (!can('member.invite')) {
    return (
      <div className="page">
        <section className="card">
          <EmptyState
            icon={<IconMail width={28} height={28} />}
            title="You can't invite members here"
            message="Inviting needs the member.invite permission. Ask an admin for a position that has it."
          />
        </section>
      </div>
    );
  }

  function validate(): Errors {
    const next: Errors = {};
    if (fullName.trim() === '') next.full_name = 'Enter the name of the person you are inviting.';
    if (email.trim() === '') next.email = 'Enter the email address the invitation should go to.';
    else if (!EMAIL_PATTERN.test(email.trim()))
      next.email = 'Enter a valid email address, like name@example.com.';
    if (category === '') next.category_id = 'Choose the category they will join.';
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    send.mutate(
      {
        communityId,
        full_name: fullName.trim(),
        email: email.trim(),
        category_id: category,
      },
      {
        onSuccess: (created) =>
          void navigate({ to: '/community/invitations', search: { selected: created.id } }),
        onError: (error) => {
          const fields = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            full_name: fields.full_name,
            email: fields.email,
            category_id: fields.category_id,
            form:
              fields.full_name || fields.email || fields.category_id
                ? undefined
                : errorMessage(error),
          });
        },
      },
    );
  }

  const greetingName = fullName.trim().split(/\s+/)[0] || 'Member';

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <IconMail width={16} height={16} aria-hidden="true" />
        <Link to="/community/invitations" className="breadcrumb__link">
          Invitations
        </Link>
        <IconChevronRight width={14} height={14} aria-hidden="true" />
        <span className="breadcrumb__current" aria-current="page">
          Invite Member
        </span>
      </nav>

      <header className="page-header">
        <div className="page-header__text">
          <h1 className="page-header__title">Invite Member</h1>
          <p className="page-header__subtitle">
            Invite a new member to join {communityName} community.
          </p>
        </div>
        <Badge tone="neutral" dot className="badge--live">
          {communityName} • Active
        </Badge>
      </header>

      <div className="split split--form">
        <form className="card invite-form" onSubmit={handleSubmit} noValidate>
          <header className="invite-form__head">
            <IconTile tone="brand" size="lg">
              <IconMail />
            </IconTile>
            <div className="section-head__text">
              <h2 className="section-head__title">Member Invitation</h2>
              <p className="section-head__subtitle">
                The person will receive an invitation email with a secure link to join this
                community.
              </p>
            </div>
          </header>

          <div className="invite-form__fields">
            {errors.form && (
              <p className="form-error" role="alert">
                {errors.form}
              </p>
            )}

            <Input
              label="Full Name"
              required
              aside="Required"
              icon={<IconUser />}
              placeholder="e.g. Marie Claire Uwase"
              autoComplete="off"
              maxLength={120}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setErrors((e) => ({ ...e, full_name: undefined }));
              }}
              error={errors.full_name}
              hint="Shown in the invitation and in your member records."
            />

            <Input
              label="Email Address"
              required
              aside="Required"
              type="email"
              icon={<IconAtSign />}
              placeholder="e.g. member@example.com"
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((e) => ({ ...e, email: undefined, form: undefined }));
              }}
              error={errors.email}
              hint="An invitation link will be sent to this address."
            />

            <Select
              label="Member Category"
              required
              icon={<IconLayers />}
              placeholder={categories.isPending ? 'Loading categories…' : 'Choose a category'}
              value={category}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setErrors((e) => ({ ...e, category_id: undefined }));
              }}
              options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.category_id}
              hint="Decides their expected contribution. The community's categories are set up when it is created."
            />

            <aside className="notice notice--success">
              <IconShieldCheck aria-hidden="true" />
              <div>
                <p className="notice__title">What happens next?</p>
                <p className="notice__text">
                  The invitee will receive an email containing a secure one-time link. Upon
                  clicking, they will confirm their identity, set their password, and join{' '}
                  {communityName}. Assign them a position afterwards so they can open the
                  community&apos;s screens.
                </p>
              </div>
            </aside>
          </div>

          <footer className="invite-form__actions">
            <Link to="/community/invitations" className="btn btn--text btn--inline">
              Cancel
            </Link>
            <Button type="submit" inline icon={<IconSend />} disabled={send.isPending}>
              {send.isPending ? 'Sending…' : 'Send Invitation'}
            </Button>
          </footer>
        </form>

        <div className="split__rail">
          <section className="card preview" aria-labelledby="preview-title">
            <header className="preview__head">
              <h2 id="preview-title" className="preview__title">
                <IconEye aria-hidden="true" />
                Email Dispatch Preview
              </h2>
              <Badge tone="info">Live</Badge>
            </header>

            <div className="preview__mail">
              <div className="preview__sender">
                <span className="preview__logo" aria-hidden="true">
                  C
                </span>
                <span className="table__stack">
                  <span className="preview__sender-name">{communityName} Notification</span>
                  <span className="preview__sender-via">via COOP System</span>
                </span>
              </div>
              <div className="preview__letter">
                <p className="preview__to">
                  <span>To:</span>
                  <span>{email.trim() || 'member@example.com'}</span>
                </p>
                <p className="preview__subject">You are invited to join {communityName}</p>
                <p className="preview__body">
                  Hello <strong>{greetingName}</strong>, {me?.full_name ?? 'an admin'} has
                  authorized an invitation for your community account.
                </p>
                <span className="preview__cta">
                  Accept Invitation &amp; Set Password
                  <IconChevronRight width={14} height={14} aria-hidden="true" />
                </span>
              </div>
            </div>
            <p className="preview__foot">
              <IconShield width={16} height={16} aria-hidden="true" />
              Link valid for {INVITATION_VALID_DAYS} days upon send
            </p>
          </section>

          <section className="card quick-stats" aria-labelledby="quick-stats-title">
            <h2 id="quick-stats-title" className="preview__title">
              <IconCommunity aria-hidden="true" />
              Community Quick Stats
            </h2>
            <dl className="quick-stats__grid">
              <div>
                <dt>Total Members</dt>
                <dd>{memberCount}</dd>
              </div>
              <div>
                <dt>Pending Invites</dt>
                <dd className="quick-stats__warn">{pendingCount}</dd>
              </div>
            </dl>
            <p className="quick-stats__note">
              Active membership is governed by collective community consensus under the{' '}
              {communityName} charter.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
