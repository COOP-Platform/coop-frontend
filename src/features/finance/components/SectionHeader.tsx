import type { ComponentProps } from 'react';

import { PageHeader } from '@/components/ui';

type SectionHeaderProps = ComponentProps<typeof PageHeader> & {
  /**
   * Shown as a tab of a bigger page (e.g. Expenses inside "Expenses &
   * Income"): the page's own header is the h1, so this one becomes a section
   * title with its actions beside it.
   */
  embedded?: boolean;
};

/** The page header, or a section bar when the page is a tab of another page. */
export function SectionHeader({ embedded = false, ...props }: SectionHeaderProps) {
  if (!embedded) return <PageHeader {...props} />;
  return (
    <div className="section-bar">
      <div>
        <h2 className="section-title">{props.title}</h2>
        {props.subtitle && <p className="table__muted">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="section-bar__actions">{props.actions}</div>}
    </div>
  );
}
