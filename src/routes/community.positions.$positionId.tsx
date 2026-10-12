import { createFileRoute } from '@tanstack/react-router';

import { PositionDetails } from '@/features/positions';

export const Route = createFileRoute('/community/positions/$positionId')({
  component: PositionDetailsPage,
});

function PositionDetailsPage() {
  const { positionId } = Route.useParams();
  // Keyed so moving between positions starts each page's dialogs fresh.
  return <PositionDetails key={positionId} positionId={positionId} />;
}
