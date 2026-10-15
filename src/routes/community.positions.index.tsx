import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/community/positions/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/community/positions/"!</div>;
}
