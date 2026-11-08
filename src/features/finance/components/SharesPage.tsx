import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconPencil,
  IconPlus,
  IconTile,
  IconUsers,
  IconWallet,
  Input,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Select,
  Textarea,
  Checkbox,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import type { Membership } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';

import {
  useCreateShareCategory,
  useShareCategories,
  useUpdateMemberShares,
  useUpdateShareCategory,
} from '../api/shares';
import type { ShareCategory } from '../api/shares';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { SuccessNotice } from './SuccessNotice';

type Section = 'categories' | 'members';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'categories', label: 'Share categories' },
  { value: 'members', label: "Members' shares" },
];

/**
 * Shares (backend S3-34): what one share costs a month in each category, and
 * how many shares each member holds. A member owes shares x price each month.
 * Every member reads it; only the Treasurer (finance.shares.manage) changes it.
 */
export function SharesPage() {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.shares.manage');
  const [section, setSection] = useState<Section>('categories');
  const [notice, setNotice] = useState<string | null>(null);
  const categories = useShareCategories(communityId);

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Shares"
        subtitle="What one share costs each month, and how many shares each member holds. Members owe shares × price every month."
      />

      <SegmentedControl label="Section" options={SECTIONS} value={section} onChange={setSection} />

      {notice && <SuccessNotice text={notice} />}

      {categories.data === undefined ? (
        categories.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(categories.error)} />
        )
      ) : section === 'categories' ? (
        <CategoriesSection
          categories={categories.data.items}
          canManage={canManage}
          onDone={setNotice}
        />
      ) : (
        <MembersSection
          categories={categories.data.items}
          canManage={canManage}
          onDone={setNotice}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share categories
// ---------------------------------------------------------------------------

function CategoriesSection({
  categories,
  canManage,
  onDone,
}: {
  categories: ShareCategory[];
  canManage: boolean;
  onDone: (message: string) => void;
}) {
  const [editing, setEditing] = useState<ShareCategory | 'new' | null>(null);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Share categories</h2>
          <p className="table__muted">
            Each category has its own price for one share a month. A stipend category receives money
            instead of paying.
          </p>
        </div>
        {canManage && (
          <div className="section-bar__actions">
            <Button inline icon={<IconPlus />} onClick={() => setEditing('new')}>
              Add category
            </Button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<IconWallet />}
            title="No share categories yet"
            message="Add one, e.g. Standard at 10,000 RWF a share."
          />
        </section>
      ) : (
        <ul className="share-cards" role="list">
          {categories.map((category) => (
            <li key={category.id} className="card share-card">
              <div className="share-card__head">
                <h3 className="share-card__name">{category.name}</h3>
                {!category.is_active && <Badge tone="neutral">Retired</Badge>}
                {category.is_stipend_recipient && <Badge tone="info">Stipend</Badge>}
              </div>
              <p className="share-card__price">
                {formatAmount(category.share_price_minor)}{' '}
                <span className="money__unit">{category.currency} / share / month</span>
              </p>
              {category.description && <p className="table__muted">{category.description}</p>}
              <p className="share-card__meta">
                <IconUsers width={16} height={16} aria-hidden="true" /> {category.member_count}{' '}
                member{category.member_count === 1 ? '' : 's'}
              </p>
              {canManage && (
                <Button
                  variant="secondary"
                  size="sm"
                  inline
                  icon={<IconPencil />}
                  onClick={() => setEditing(category)}
                >
                  Edit
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <CategoryDialog
        category={editing}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          onDone(message);
        }}
      />
    </div>
  );
}

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: ShareCategory | 'new' | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isNew = category === 'new';
  return (
    <Dialog
      open={category !== null}
      onClose={onClose}
      title={isNew ? 'Add share category' : 'Edit share category'}
      subtitle={
        isNew
          ? 'Members in this category owe their shares × this price every month.'
          : 'A new price is owed from this month on; earlier months keep the old price.'
      }
      icon={
        <IconTile tone="brand" round>
          <IconWallet />
        </IconTile>
      }
    >
      {category !== null && (
        <CategoryForm category={isNew ? null : category} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: ShareCategory | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreateShareCategory();
  const update = useUpdateShareCategory();
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [price, setPrice] = useState(
    category ? String(category.share_price_minor / MINOR_PER_MAJOR) : '',
  );
  const [stipend, setStipend] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceMinor = Math.round(Number(price) * MINOR_PER_MAJOR);
    const problems: Record<string, string> = {};
    if (name.trim().length < 1) problems.name = 'Give the category a name.';
    if (price.trim() === '' || !Number.isFinite(priceMinor) || priceMinor < 0)
      problems.price = 'Enter the price of one share, 0 or more.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      setErrors({
        name: f.name,
        price: f.share_price_minor,
        form: f.name || f.share_price_minor ? undefined : errorMessage(error),
      });
    };
    const body = {
      communityId,
      name: name.trim(),
      description: description.trim() || null,
      share_price_minor: priceMinor,
    };
    if (category) {
      update.mutate(
        { ...body, categoryId: category.id },
        { onSuccess: () => onSaved(`${body.name} saved.`), onError },
      );
    } else {
      create.mutate(
        { ...body, is_stipend_recipient: stipend },
        { onSuccess: () => onSaved(`${body.name} added.`), onError },
      );
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Name"
        placeholder="e.g. Standard, Senior, Student"
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        required
      />
      <Input
        label="Price of one share a month (RWF)"
        type="number"
        min={0}
        step="any"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        error={errors.price}
        required
      />
      <Textarea
        label="Description"
        optional
        rows={2}
        maxLength={255}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      {!category && (
        <Checkbox
          label="Members in this category receive a stipend instead of paying"
          checked={stipend}
          onChange={(event) => setStipend(event.target.checked)}
        />
      )}
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Members' shares
// ---------------------------------------------------------------------------

function MembersSection({
  categories,
  canManage,
  onDone,
}: {
  categories: ShareCategory[];
  canManage: boolean;
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const members = useMemberships(communityId, 'active');
  const [editing, setEditing] = useState<Membership | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));

  if (members.data === undefined) {
    return members.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={errorMessage(members.error)} />
    );
  }
  const rows = [...members.data].sort((a, b) =>
    (a.full_name ?? '').localeCompare(b.full_name ?? ''),
  );
  const totalPerMonth = rows.reduce((sum, m) => {
    const category = byId.get(m.member_category);
    if (!category || category.is_stipend_recipient) return sum;
    return sum + (m.shares ?? 1) * category.share_price_minor;
  }, 0);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Members' shares</h2>
          <p className="table__muted">
            Together, active members owe {formatAmount(totalPerMonth)} RWF a month.
          </p>
        </div>
      </div>

      <section className="card table-card" aria-label="Members' shares">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Category</th>
                <th scope="col" className="statement-table__num">
                  Shares
                </th>
                <th scope="col" className="statement-table__num">
                  Owes a month (RWF)
                </th>
                {canManage && (
                  <th scope="col" className="table__action-col">
                    Change
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const category = byId.get(member.member_category);
                const shares = member.shares ?? 1;
                return (
                  <tr key={member.id}>
                    <td>
                      <span className="table__person">
                        <Avatar name={member.full_name ?? '?'} />
                        <span className="table__name">{member.full_name ?? 'Member'}</span>
                      </span>
                    </td>
                    <td>{category?.name ?? '—'}</td>
                    <td className="statement-table__num">{shares}</td>
                    <td className="statement-table__num table__amount">
                      {category?.is_stipend_recipient
                        ? 'Stipend'
                        : category
                          ? formatAmount(shares * category.share_price_minor)
                          : '—'}
                    </td>
                    {canManage && (
                      <td className="table__action-col">
                        <button
                          type="button"
                          className="link-action"
                          onClick={() => setEditing(member)}
                        >
                          <IconPencil width={16} height={16} aria-hidden="true" />
                          Change
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Change shares"
        subtitle={editing ? `${editing.full_name ?? 'Member'}: owed from this month on.` : ''}
        icon={
          <IconTile tone="brand" round>
            <IconUsers />
          </IconTile>
        }
      >
        {editing && (
          <MemberSharesForm
            member={editing}
            categories={categories.filter((c) => c.is_active)}
            onClose={() => setEditing(null)}
            onSaved={(message) => {
              setEditing(null);
              onDone(message);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function MemberSharesForm({
  member,
  categories,
  onClose,
  onSaved,
}: {
  member: Membership;
  categories: ShareCategory[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const queryClient = useQueryClient();
  const update = useUpdateMemberShares();
  const [categoryId, setCategoryId] = useState(member.member_category);
  const [shares, setShares] = useState(String(member.shares ?? 1));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const category = categories.find((c) => c.id === categoryId);
  const count = Number(shares);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(count) || count < 1) {
      setErrors({ shares: 'A member holds at least 1 share.' });
      return;
    }
    if (!communityId) return;
    update.mutate(
      { communityId, membershipId: member.id, shares: count, category_id: categoryId },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all });
          onSaved(
            `${result.member.full_name}: ${result.shares} share${result.shares === 1 ? '' : 's'} in ${result.category.name}, ${formatAmount(result.owed_per_month_minor)} ${result.currency} a month.`,
          );
        },
        onError: (error) => {
          const f = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            shares: f.shares,
            category: f.category_id,
            form: f.shares || f.category_id ? undefined : errorMessage(error),
          });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Select
        label="Category"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        options={categories.map((c) => ({
          value: c.id,
          label: `${c.name} (${formatAmount(c.share_price_minor)} ${c.currency} a share)`,
        }))}
        error={errors.category}
      />
      <Input
        label="Shares"
        type="number"
        min={1}
        step={1}
        value={shares}
        onChange={(event) => setShares(event.target.value)}
        hint={
          category && Number.isInteger(count) && count >= 1
            ? `Owes ${formatAmount(count * category.share_price_minor)} ${category.currency} a month.`
            : undefined
        }
        error={errors.shares}
        required
      />
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
