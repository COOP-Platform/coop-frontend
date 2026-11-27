import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionCard } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { BudgetDetails, BudgetFormDialog, organisesEventMoney } from '@/features/finance';

import type { CommunityEvent } from '../api/events';

/**
 * The event's budget, run from the event's page: the same budget as in
 * Finance, not a copy. Its organisers switch it on ("Budget for this event"),
 * set the goal and what members pay, and record what was used; Finance
 * receives the money and approves the spending. A surprise event's budget
 * stays hidden from the members the event is hidden from (the API hides it).
 */
export function EventBudget({
  event,
  onNotice,
}: {
  event: CommunityEvent;
  onNotice: (message: string | null) => void;
}) {
  const { can } = useWorkspace();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const cancelled = event.status === 'cancelled';
  const canPlan = !cancelled && (can('finance.budget.manage') || organisesEventMoney(can));

  if (event.budget === null) {
    return (
      <SectionCard title="Budget" className="event-detail__wide">
        {cancelled ? (
          <p className="table__muted">Cancelled: no budget.</p>
        ) : canPlan ? (
          // Off until the organiser switches it on; then only what the event does not know is asked.
          <div className="event-budget-switch">
            <button
              type="button"
              role="switch"
              aria-checked={creating}
              className="switch"
              onClick={() => setCreating(true)}
            >
              <span className="switch__track" aria-hidden="true">
                <span className="switch__thumb" />
              </span>
              <span className="switch__label">Budget for this event</span>
            </button>
            <p className="table__muted">
              Off. Switch it on to collect money for this event. Finance receives it and approves
              what is spent.
            </p>
          </div>
        ) : (
          <p className="table__muted">No budget for this event.</p>
        )}
        <BudgetFormDialog
          open={creating}
          budget={null}
          event={{ id: event.id, title: event.title, date: event.starts_at.slice(0, 10) }}
          onClose={() => setCreating(false)}
          onSaved={(message) => {
            setCreating(false);
            onNotice(message);
            // The event now has a budget: read it again.
            void queryClient.invalidateQueries();
          }}
        />
      </SectionCard>
    );
  }
  if (!can('finance.budget.view')) {
    return (
      <SectionCard title="Budget" className="event-detail__wide">
        <p>{event.budget.title}</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Budget" className="event-detail__wide">
      <BudgetDetails budgetId={event.budget.id} embedded onDone={onNotice} />
    </SectionCard>
  );
}
