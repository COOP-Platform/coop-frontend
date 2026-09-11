import { Card, IconInfoCircle } from '@/components/ui';

import type { Guideline } from '../data/guidelines';

interface InvitationGuidelinesProps {
  guidelines: readonly Guideline[];
}

export function InvitationGuidelines({ guidelines }: InvitationGuidelinesProps) {
  return (
    <Card className="guidelines">
      <h2 className="guidelines__title">
        <span className="guidelines__icon" aria-hidden="true">
          <IconInfoCircle />
        </span>
        Invitation Guidelines
      </h2>

      <ul className="guidelines__list" role="list">
        {guidelines.map((guideline) => (
          <li key={guideline.id} className="guidelines__item">
            <span className="guidelines__term">{guideline.term}:</span> {guideline.description}
          </li>
        ))}
      </ul>
    </Card>
  );
}
