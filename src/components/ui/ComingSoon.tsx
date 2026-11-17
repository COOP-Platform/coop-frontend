import { StatePage } from './StatePage';

interface ComingSoonProps {
  title: string;
  message: string;
}

/** A page whose feature is not built yet: an illustration and a short note. */
export function ComingSoon({ title, message }: ComingSoonProps) {
  return <StatePage inCard art="coming-soon" title={title} message={message} />;
}
