const W = 120;
const H = 48;
const PAD = 4;

/**
 * A small trend line with a faint fill, drawn from real values (oldest first).
 * Decorative: the figure beside it carries the meaning, so it is hidden from
 * screen readers. Colour comes from `currentColor`.
 */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    // Flat data sits in the middle rather than on the floor.
    const y = max === min ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join(' L')}`;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="currentColor" opacity="0.1" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
