import { createFileRoute } from '@tanstack/react-router';

import { PositionsBoard } from '@/features/positions';

interface PositionsSearch {
  /** Position id shown in the details panel. */
  selected?: string;
}

export const Route = createFileRoute('/community/positions/')({
  validateSearch: (raw: Record<string, unknown>): PositionsSearch => ({
    selected: typeof raw.selected === 'string' && raw.selected !== '' ? raw.selected : undefined,
  }),
  component: PositionsPage,
});

function PositionsPage() {
  const { selected } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <PositionsBoard
      selected={selected}
      onSelect={(id) => void navigate({ search: { selected: id } })}
    />
  );
}
