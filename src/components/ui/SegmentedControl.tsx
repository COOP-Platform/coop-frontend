interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `solid` fills the selected segment with the brand colour. */
  appearance?: 'soft' | 'solid';
}

/** A row of mutually exclusive filter buttons ("All / Active / Suspended"). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  appearance = 'soft',
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented segmented--${appearance}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
