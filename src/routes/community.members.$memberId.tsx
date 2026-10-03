import { createFileRoute } from '@tanstack/react-router';

import { MemberProfile } from '@/features/members';

export const Route = createFileRoute('/community/members/$memberId')({
  component: MemberPage,
});

function MemberPage() {
  const { memberId } = Route.useParams();
  return <MemberProfile memberId={memberId} />;
}
