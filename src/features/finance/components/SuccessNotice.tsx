import { IconCheckCircle } from '@/components/ui';

/** The green line after a money action. */
export function SuccessNotice({ text }: { text: string }) {
  return (
    <div className="notice notice--success" role="status">
      <IconCheckCircle width={20} height={20} aria-hidden="true" />
      <p className="notice__text">{text}</p>
    </div>
  );
}
