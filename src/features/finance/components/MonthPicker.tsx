import { Input } from '@/components/ui';

import { THIS_MONTH } from '../month';

/** A `YYYY-MM` picker that never goes past this month or clears itself. */
export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (month: string) => void;
}) {
  return (
    <Input
      label="Month"
      type="month"
      value={value}
      max={THIS_MONTH}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
      }}
    />
  );
}
