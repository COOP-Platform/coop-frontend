import { createFileRoute } from '@tanstack/react-router';

import { PositionsBoard } from '@/features/positions';

export const Route = createFileRoute('/community/positions')({
  component: PositionsBoard,
});
