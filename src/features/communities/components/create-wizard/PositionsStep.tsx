import { useEffect, useId, useState } from 'react';

import { Button, IconPlus, IconShieldCheck, IconTrash, Input } from '@/components/ui';
import { MEMBER_BASELINE, PERMISSION_CATALOG, PERMISSION_MODULES } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';

import { communityTypeLabel } from './community-types';
import {
  BASELINE_POSITION,
  MAX_POSITIONS,
  POSITION_NAME_MAX,
  blankPosition,
  fromTemplate,
  isBaseline,
  usePositionTemplate,
} from './positions';
import type { PositionDraft } from './positions';
import type { StepProps } from './steps';

/**
 * Step 2: the community's starting positions (#18).
 *
 * Prefilled from the suggestions for the chosen type. If the founder goes
 * back and changes the type, untouched suggestions are swapped silently;
 * edited ones are only replaced once the founder says so.
 */
export function PositionsStep({ form, errors, update }: StepProps) {
  const typeLabel = form.type === '' ? '' : communityTypeLabel(form.type);
  const stale = form.type !== '' && form.positionsType !== form.type;
  const needsConfirm = stale && form.positionsEdited && form.positions.length > 0;
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const wantTemplate = stale && (!needsConfirm || replaceConfirmed);
  const template = usePositionTemplate(form.type, wantTemplate);

  useEffect(() => {
    if (!wantTemplate || template.data === undefined || form.type === '') {
      return;
    }
    update('positions', fromTemplate(template.data));
    update('positionsType', form.type);
    update('positionsEdited', false);
    setReplaceConfirmed(false);
  }, [wantTemplate, template.data, form.type, update]);

  const busy = wantTemplate && template.isFetching;
  const locked = busy || (needsConfirm && !replaceConfirmed);

  /** Every change the founder makes goes through here. */
  function edit(next: PositionDraft[]) {
    update('positions', next);
    update('positionsEdited', true);
    if (form.type !== '' && !needsConfirm) {
      update('positionsType', form.type);
    }
  }

  function change(key: string, patch: Partial<PositionDraft>) {
    edit(form.positions.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function makeAdmin(key: string) {
    edit(
      form.positions.map((p) => {
        if (p.key === key) {
          return { ...p, isAdmin: true };
        }
        // A former admin position would still hold every permission — and the
        // server decides "admin" by what a position holds — so it starts over.
        return p.isAdmin ? { ...p, isAdmin: false, permissions: [...MEMBER_BASELINE] } : p;
      }),
    );
  }

  function startFromScratch() {
    const admin = { ...blankPosition(), name: 'Administrator', isAdmin: true };
    const member = { ...blankPosition(), name: BASELINE_POSITION };
    update('positions', [admin, member]);
    update('positionsType', form.type);
    update('positionsEdited', true);
  }

  return (
    <>
      <section className="wizard-card" aria-labelledby="wizard-positions-title">
        <header className="wizard-card__head">
          <span className="wizard-card__heading">
            <h2 id="wizard-positions-title" className="wizard-card__title">
              Positions
            </h2>
            <span className="wizard-card__subtitle">
              {typeLabel
                ? `Suggested for a ${typeLabel.toLowerCase()} community. Rename, remove or add positions and choose what each one can do. You can change all of this later.`
                : 'Choose a community type on step 1 to see suggested positions.'}
            </span>
          </span>
        </header>

        <div className="wizard-card__body">
          {needsConfirm && !replaceConfirmed && (
            <div className="wizard-positions__confirm" role="alert">
              <p>
                You changed the community type to <strong>{typeLabel}</strong>. Replace your
                positions with the ones suggested for it? Your changes below would be lost.
              </p>
              <div className="wizard-positions__confirm-actions">
                <Button variant="primary" inline onClick={() => setReplaceConfirmed(true)}>
                  Use the {typeLabel} suggestions
                </Button>
                <Button
                  variant="secondary"
                  inline
                  onClick={() => update('positionsType', form.type)}
                >
                  Keep my positions
                </Button>
              </div>
            </div>
          )}

          {busy && (
            <p className="wizard-positions__status" role="status">
              Loading the suggested positions…
            </p>
          )}

          {wantTemplate && template.isError && (
            <div className="wizard-positions__confirm" role="alert">
              <p>The suggested positions could not be loaded: {errorMessage(template.error)}</p>
              <div className="wizard-positions__confirm-actions">
                <Button variant="secondary" inline onClick={() => void template.refetch()}>
                  Try again
                </Button>
                <Button variant="secondary" inline onClick={startFromScratch}>
                  Start with just an administrator
                </Button>
              </div>
            </div>
          )}

          {errors.positions && (
            <p className="form-error" role="alert">
              {errors.positions}
            </p>
          )}

          <fieldset className="wizard-positions" disabled={locked}>
            <legend className="visually-hidden">Starting positions</legend>
            {form.positions.map((position, index) => (
              <PositionRow
                key={position.key}
                index={index}
                position={position}
                onChange={(patch) => change(position.key, patch)}
                onMakeAdmin={() => makeAdmin(position.key)}
                onRemove={() => edit(form.positions.filter((p) => p.key !== position.key))}
              />
            ))}
          </fieldset>

          {form.type !== '' && !locked && (
            <div>
              <Button
                variant="secondary"
                inline
                icon={<IconPlus />}
                disabled={form.positions.length >= MAX_POSITIONS}
                onClick={() => edit([...form.positions, blankPosition()])}
              >
                Add a position
              </Button>
            </div>
          )}
        </div>
      </section>

      <PlatformPrivacyNote />
    </>
  );
}

interface PositionRowProps {
  index: number;
  position: PositionDraft;
  onChange: (patch: Partial<PositionDraft>) => void;
  onMakeAdmin: () => void;
  onRemove: () => void;
}

function PositionRow({ index, position, onChange, onMakeAdmin, onRemove }: PositionRowProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const baseline = isBaseline(position) && !position.isAdmin;
  const held = new Set(position.permissions);

  function toggle(code: string) {
    const next = new Set(held);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange({ permissions: [...next] });
  }

  return (
    <div className={position.isAdmin ? 'wizard-position is-admin' : 'wizard-position'}>
      <div className="wizard-position__head">
        <div className="wizard-position__name">
          <Input
            label={`Position ${index + 1}`}
            value={position.name}
            maxLength={POSITION_NAME_MAX}
            placeholder="e.g. Treasurer"
            readOnly={baseline}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>

        <label className="wizard-position__admin">
          <input
            type="radio"
            name="wizard-admin-position"
            checked={position.isAdmin}
            disabled={baseline}
            onChange={onMakeAdmin}
          />
          <span>This is my position</span>
        </label>

        {!baseline && (
          <button
            type="button"
            className="wizard-position__remove"
            onClick={onRemove}
            aria-label={`Remove ${position.name.trim() || `position ${index + 1}`}`}
          >
            <IconTrash width={18} height={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {position.description && (
        <p className="wizard-position__description">{position.description}</p>
      )}

      {position.isAdmin ? (
        <p className="wizard-position__note">
          You will hold this position. It can do everything, including managing members and
          positions.
        </p>
      ) : (
        <>
          {baseline && (
            <p className="wizard-position__note">
              Everyone who joins is given this position, so it cannot be renamed or removed.
            </p>
          )}
          <button
            type="button"
            className="link-action wizard-position__toggle"
            aria-expanded={open}
            aria-controls={`${id}-permissions`}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Hide what it can do' : 'Choose what it can do'} ({held.size} of{' '}
            {PERMISSION_CATALOG.length})
          </button>
          {open && (
            <fieldset id={`${id}-permissions`} className="permission-picker">
              <legend className="visually-hidden">
                What {position.name.trim() || `position ${index + 1}`} can do
              </legend>
              {PERMISSION_MODULES.map((module) => (
                <div key={module} className="permission-picker__group">
                  <p className="permission-picker__module">{module}</p>
                  {PERMISSION_CATALOG.filter((p) => p.module === module).map((permission) => (
                    <label key={permission.code} className="permission-picker__item">
                      <input
                        type="checkbox"
                        checked={held.has(permission.code)}
                        onChange={() => toggle(permission.code)}
                      />
                      <span>{permission.description}</span>
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          )}
        </>
      )}
    </div>
  );
}

/** #20: what the people running the service can and cannot do. */
export function PlatformPrivacyNote() {
  return (
    <aside className="wizard-privacy" aria-label="Your community's privacy">
      <IconShieldCheck width={20} height={20} aria-hidden="true" />
      <p>
        <strong>Your community&apos;s data stays yours.</strong> Platform Administrators run the
        service; they cannot change your community&apos;s data. If they ever need to look at your
        community to help with a problem, that look is read-only and written to your
        community&apos;s audit log.
      </p>
    </aside>
  );
}
