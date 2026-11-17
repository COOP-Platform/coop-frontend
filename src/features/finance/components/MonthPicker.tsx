import { Input } from '@/components/ui';

import { THIS_MONTH } from '../month';

/** A `YYYY-MM` picker that never goes past this month or clears itself. */
export function MonthPicker({
  value,
  onChange,
  labelHidden = false,
}: {
  value: string;
  onChange: (month: string) => void;
  /** In a card header: the label is read by screen readers only. */
  labelHidden?: boolean;
}) {
  return (
    <Input
      label="Month"
      labelHidden={labelHidden}
      type="month"
      value={value}
      max={THIS_MONTH}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
      }}
    />
  );
}
